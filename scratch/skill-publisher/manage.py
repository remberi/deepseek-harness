#!/usr/bin/env python3
"""Maintenance CLI for the DSH skill publisher.

Two supervision modes are supported:

``systemd``
    Delegates start/stop/restart/status/logs to ``systemctl``. Used
    automatically when the unit file is installed.
``direct``
    Runs uvicorn in the background with a PID file and a log file. When
    started as root the child is demoted to ``skillsvc`` so files under
    ``SKILL_ROOT`` keep the right owner.

The script uses only the standard library and runs on Python 3.7.

Examples::

    ./manage.py start                 # background (systemd if installed)
    ./manage.py start --foreground    # run in the foreground (direct mode)
    ./manage.py status
    ./manage.py logs -f
    ./manage.py publish frontend-project-setup.zip frontend-project-setup 1.0.0
    ./manage.py reindex
"""
from __future__ import annotations

import argparse
import json
import os
import pwd
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request

SERVICE_NAME = "dsh-skill-publisher"
SERVICE_USER = "skillsvc"
UNIT_PATH = "/etc/systemd/system/%s.service" % SERVICE_NAME

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RUN_DIR = os.path.join(SCRIPT_DIR, ".run")
LOG_DIR = os.path.join(SCRIPT_DIR, "logs")

DEFAULT_PORT = int(os.environ.get("PORT", "8005"))
DEFAULT_ROOT = os.environ.get("SKILL_ROOT", "/srv/dsh-skills")


# -- helpers ------------------------------------------------------------


def pid_file(port):
    return os.path.join(RUN_DIR, "publisher-%d.pid" % port)


def log_file(port):
    return os.path.join(LOG_DIR, "publisher-%d.log" % port)


def base_url(port, explicit):
    return (explicit or "http://127.0.0.1:%d" % port).rstrip("/")


def read_pid(path):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return int(handle.read().strip())
    except (OSError, ValueError):
        return None


def process_alive(pid):
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def pid_is_service(pid):
    """Best-effort check that a live PID still belongs to uvicorn."""
    path = "/proc/%d/cmdline" % pid
    if not os.path.exists("/proc"):
        return True
    try:
        with open(path, "rb") as handle:
            cmdline = handle.read().decode("utf-8", "replace")
    except OSError:
        return False
    return "uvicorn" in cmdline or "app:app" in cmdline


def wait_for_health(url, timeout):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url + "/healthz", timeout=1) as response:
                if response.status == 200:
                    return True
        except (urllib.error.URLError, OSError):
            time.sleep(0.3)
    return False


def request_json(method, url, data=None, timeout=60):
    request = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        request.add_header("Content-Type", "application/zip")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", "replace")
            return response.status, body
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")
    except (urllib.error.URLError, OSError) as error:
        raise SystemExit("cannot reach %s: %s" % (url, error))


def demote():
    """Popen preexec hook: run the child as ``skillsvc`` when we are root."""
    if os.geteuid() != 0:
        return
    try:
        entry = pwd.getpwnam(SERVICE_USER)
    except KeyError:
        return
    os.setgid(entry.pw_gid)
    os.setuid(entry.pw_uid)


def run(command):
    return subprocess.run(command).returncode


# -- systemd mode -------------------------------------------------------


def systemd_active():
    completed = subprocess.run(
        ["systemctl", "is-active", SERVICE_NAME],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        universal_newlines=True,
    )
    return completed.stdout.strip() == "active"


def systemd_start(port, url):
    code = run(["systemctl", "start", SERVICE_NAME])
    if code != 0:
        raise SystemExit("systemctl start failed (are you root?)")
    print("started %s; waiting for health" % SERVICE_NAME)
    print("health:", "ok" if wait_for_health(url, 20) else "FAILED, check journalctl -u %s" % SERVICE_NAME)


def systemd_stop():
    code = run(["systemctl", "stop", SERVICE_NAME])
    if code != 0:
        raise SystemExit("systemctl stop failed (are you root?)")
    print("stopped %s" % SERVICE_NAME)


def systemd_status(port, url):
    run(["systemctl", "status", SERVICE_NAME, "--no-pager"])
    print("health:", "ok" if wait_for_health(url, 2) else "unreachable")


def systemd_logs(lines, follow):
    command = ["journalctl", "-u", SERVICE_NAME, "-n", str(lines)]
    if follow:
        command.append("-f")
    os.execvp(command[0], command)


# -- direct mode --------------------------------------------------------


def direct_pid(port):
    pid = read_pid(pid_file(port))
    if pid is None:
        return None
    if not process_alive(pid) or not pid_is_service(pid):
        try:
            os.unlink(pid_file(port))
        except OSError:
            pass
        return None
    return pid


def direct_command(port):
    host = os.environ.get("HOST", "0.0.0.0")
    venv_uvicorn = os.path.join(SCRIPT_DIR, ".venv", "bin", "uvicorn")
    if os.path.isfile(venv_uvicorn):
        prefix = [venv_uvicorn]
    else:
        prefix = [sys.executable, "-m", "uvicorn"]
    return prefix + ["app:app", "--host", host, "--port", str(port), "--workers", "1"]


def direct_child_env(port):
    env = dict(os.environ)
    env.setdefault("SKILL_ROOT", DEFAULT_ROOT)
    env.setdefault("HOST", "0.0.0.0")
    env["PORT"] = str(port)
    env["PYTHONUNBUFFERED"] = "1"
    return env


def direct_start(port, url, foreground):
    if foreground:
        print("running in the foreground; Ctrl+C to stop")
        return subprocess.call(direct_command(port), cwd=SCRIPT_DIR, env=direct_child_env(port))

    pid = direct_pid(port)
    if pid is not None:
        print("already running with pid %d" % pid)
        return 0

    os.makedirs(RUN_DIR, exist_ok=True)
    os.makedirs(LOG_DIR, exist_ok=True)
    log_path = log_file(port)
    log_handle = open(log_path, "ab")
    try:
        process = subprocess.Popen(
            direct_command(port),
            cwd=SCRIPT_DIR,
            env=direct_child_env(port),
            stdout=log_handle,
            stderr=subprocess.STDOUT,
            start_new_session=True,
            preexec_fn=demote,
        )
    finally:
        log_handle.close()

    with open(pid_file(port), "w", encoding="utf-8") as handle:
        handle.write("%d\n" % process.pid)
    print("started pid %d; log: %s" % (process.pid, log_path))
    if wait_for_health(url, 20):
        print("health: ok")
        return 0
    print("health: FAILED; last log lines:")
    tail(log_path, 20)
    return 1


def direct_stop(port):
    pid = direct_pid(port)
    if pid is None:
        print("not running (no live pid file)")
        return 0
    print("stopping pid %d" % pid)
    try:
        os.kill(pid, signal.SIGTERM)
    except OSError as error:
        raise SystemExit("cannot signal pid %d: %s" % (pid, error))
    deadline = time.time() + 15
    while time.time() < deadline:
        if not process_alive(pid):
            break
        time.sleep(0.2)
    else:
        print("still alive after 15s; sending SIGKILL")
        try:
            os.kill(pid, signal.SIGKILL)
        except OSError:
            pass
        time.sleep(0.5)
    try:
        os.unlink(pid_file(port))
    except OSError:
        pass
    print("stopped")
    return 0


def direct_status(port, url):
    pid = direct_pid(port)
    if pid is None:
        print("not running")
        return 1
    print("running with pid %d" % pid)
    print("health:", "ok" if wait_for_health(url, 2) else "unreachable")
    return 0


def tail(path, lines):
    if not os.path.isfile(path):
        print("no log file at %s" % path)
        return
    with open(path, "rb") as handle:
        handle.seek(0, os.SEEK_END)
        size = handle.tell()
        block = 4096
        data = b""
        while size > 0 and data.count(b"\n") <= lines:
            step = min(block, size)
            size -= step
            handle.seek(size)
            data = handle.read(step) + data
    sys.stdout.write("\n".join(data.decode("utf-8", "replace").splitlines()[-lines:]) + "\n")


def direct_logs(port, lines, follow):
    path = log_file(port)
    if not follow:
        tail(path, lines)
        return
    command = ["tail", "-n", str(lines), "-f", path]
    os.execvp(command[0], command)


# -- commands -----------------------------------------------------------


def resolve_mode(requested):
    if requested != "auto":
        return requested
    if os.path.exists(UNIT_PATH) and shutil.which("systemctl"):
        return "systemd"
    return "direct"


def command_start(args):
    mode = resolve_mode(args.mode)
    url = base_url(args.port, args.url)
    if mode == "systemd":
        systemd_start(args.port, url)
        return 0
    return direct_start(args.port, url, args.foreground)


def command_stop(args):
    mode = resolve_mode(args.mode)
    if mode == "systemd":
        systemd_stop()
        return 0
    return direct_stop(args.port)


def command_restart(args):
    mode = resolve_mode(args.mode)
    if mode == "systemd":
        run(["systemctl", "restart", SERVICE_NAME])
        url = base_url(args.port, args.url)
        print("restarted; health:", "ok" if wait_for_health(url, 20) else "FAILED")
        return 0
    direct_stop(args.port)
    return direct_start(args.port, base_url(args.port, args.url), getattr(args, "foreground", False))


def command_status(args):
    mode = resolve_mode(args.mode)
    url = base_url(args.port, args.url)
    print("mode: %s" % mode)
    if mode == "systemd":
        systemd_status(args.port, url)
        return 0
    return direct_status(args.port, url)


def command_logs(args):
    mode = resolve_mode(args.mode)
    if mode == "systemd":
        systemd_logs(args.lines, args.follow)
    else:
        direct_logs(args.port, args.lines, args.follow)
    return 0


def command_health(args):
    url = base_url(args.port, args.url)
    status, body = request_json("GET", url + "/healthz", timeout=5)
    print(status, body)
    return 0 if status == 200 else 1


def command_index(args):
    url = base_url(args.port, args.url)
    status, body = request_json("GET", url + "/index.json", timeout=10)
    try:
        print(json.dumps(json.loads(body), ensure_ascii=False, indent=2))
    except ValueError:
        print(status, body)
    return 0 if status == 200 else 1


def command_reindex(args):
    url = base_url(args.port, args.url)
    status, body = request_json("POST", url + "/api/reindex", data=b"", timeout=120)
    print(status, body)
    return 0 if status == 200 else 1


def command_publish(args):
    if not os.path.isfile(args.archive):
        raise SystemExit("no such file: %s" % args.archive)
    url = base_url(args.port, args.url)
    with open(args.archive, "rb") as handle:
        payload = handle.read()
    print("uploading %s (%d bytes) as %s@%s" % (args.archive, len(payload), args.name, args.version))
    status, body = request_json(
        "PUT",
        url + "/api/skills/%s/%s" % (args.name, args.version),
        data=payload,
        timeout=120,
    )
    print(status, body)
    return 0 if status in (200, 201) else 1


def build_parser():
    parser = argparse.ArgumentParser(
        description="Start/stop and maintain the DSH skill publisher.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--mode",
        choices=("auto", "systemd", "direct"),
        default="auto",
        help="supervision mode (default: systemd when its unit is installed, else direct)",
    )
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="service port (default: %(default)s)")
    parser.add_argument("--url", default=None, help="base URL used for HTTP commands (default: http://127.0.0.1:<port>)")

    commands = parser.add_subparsers(dest="command")

    start = commands.add_parser("start", help="start the service")
    start.add_argument("--foreground", action="store_true", help="run in the foreground (direct mode only)")
    start.set_defaults(handler=command_start)

    commands.add_parser("stop", help="stop the service").set_defaults(handler=command_stop)
    commands.add_parser("restart", help="restart the service").set_defaults(handler=command_restart)
    commands.add_parser("status", help="show service and health status").set_defaults(handler=command_status)

    logs = commands.add_parser("logs", help="show or follow logs")
    logs.add_argument("-n", "--lines", type=int, default=100, help="lines to show (default: %(default)s)")
    logs.add_argument("-f", "--follow", action="store_true", help="follow new lines")
    logs.set_defaults(handler=command_logs)

    commands.add_parser("health", help="call /healthz").set_defaults(handler=command_health)
    commands.add_parser("index", help="print the current index.json").set_defaults(handler=command_index)
    commands.add_parser("reindex", help="rebuild the index").set_defaults(handler=command_reindex)

    publish = commands.add_parser("publish", help="upload one skill archive")
    publish.add_argument("archive", help="path to the skill zip")
    publish.add_argument("name", help="kebab-case skill name")
    publish.add_argument("version", help="SemVer version, such as 1.0.0")
    publish.set_defaults(handler=command_publish)

    return parser


def main(argv):
    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "handler", None):
        parser.print_help()
        return 2
    return args.handler(args)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
