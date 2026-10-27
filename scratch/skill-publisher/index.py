"""Index generation, sidecar metadata, and atomic storage for skill packages.

The ``packs/`` tree is the only source of truth. ``index.json`` is always
rebuilt from it in full and replaced atomically, never edited incrementally.
Each published version keeps a sidecar ``<version>.json`` with the metadata
read from its archive; a zip without a sidecar (hand-copied or migrated) is
validated and adopted on the next rebuild.
"""
from __future__ import annotations

import json
import logging
import os
import shutil
import tempfile
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

from config import Config
from skills import PackageError, sha256_file, validate_archive

logger = logging.getLogger("skill_publisher")


class VersionConflict(Exception):
    """A version already exists with a different archive."""


def _iso_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _atomic_write(path: str, data: bytes) -> None:
    """Write bytes to ``path`` through a fsynced temporary file and rename."""
    directory = os.path.dirname(path)
    handle, temporary = tempfile.mkstemp(prefix=".tmp-", dir=directory)
    try:
        with os.fdopen(handle, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except OSError:
            pass
        raise
    try:
        directory_fd = os.open(directory, os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(directory_fd)
    except OSError:
        pass
    finally:
        os.close(directory_fd)


class Store:
    """Owns the on-disk layout, the sidecar metadata, and the index document."""

    def __init__(self, config: Config) -> None:
        self.config = config
        self.root = config.skill_root
        self.packs_dir = os.path.join(self.root, "packs")
        self.staging_dir = os.path.join(self.root, ".staging")
        self.index_path = os.path.join(self.root, "index.json")
        self.lock = threading.Lock()
        self._current: Optional[Dict[str, Any]] = None

    # -- layout ---------------------------------------------------------

    def ensure_layout(self) -> None:
        """Create the directory tree and clear abandoned staging uploads."""
        os.makedirs(self.packs_dir, exist_ok=True)
        os.makedirs(self.staging_dir, exist_ok=True)
        for entry in os.listdir(self.staging_dir):
            target = os.path.join(self.staging_dir, entry)
            try:
                if os.path.isdir(target):
                    shutil.rmtree(target)
                else:
                    os.unlink(target)
            except OSError:
                logger.warning("cannot remove stale staging entry %s", target)

    def new_staging_path(self) -> str:
        """Return a fresh path under ``.staging`` for an in-flight upload."""
        return os.path.join(self.staging_dir, uuid.uuid4().hex + ".zip")

    def remove_staging(self, path: str) -> None:
        """Best-effort removal of an in-flight upload file."""
        try:
            os.unlink(path)
        except OSError:
            pass

    # -- index ----------------------------------------------------------

    def current(self) -> Dict[str, Any]:
        """Return the current index document, rebuilding it on first access."""
        if self._current is None:
            return self.rebuild()
        return self._current

    def rebuild(self) -> Dict[str, Any]:
        """Rebuild ``index.json`` from the ``packs/`` tree under the lock."""
        with self.lock:
            return self._rebuild()

    def _sidecar_payload(
        self, name: str, version: str, sha256: str, size: int, published_at: int, info: Dict[str, Any]
    ) -> Dict[str, Any]:
        return {
            "name": name,
            "version": version,
            "description": info["description"],
            "tags": info["tags"],
            "sha256": sha256,
            "size": size,
            "publishedAt": published_at,
        }

    def _read_sidecar(self, path: str) -> Optional[Dict[str, Any]]:
        try:
            with open(path, "rb") as handle:
                data = json.loads(handle.read().decode("utf-8"))
        except (OSError, ValueError) as error:
            logger.warning("cannot read sidecar %s: %s", path, error)
            return None
        if not isinstance(data, dict):
            logger.warning("sidecar %s is not a JSON object", path)
            return None
        required = ("name", "version", "description", "sha256", "size", "publishedAt")
        if not all(key in data for key in required):
            logger.warning("sidecar %s is missing required fields", path)
            return None
        return data

    def _collect(self) -> Dict[str, List[Dict[str, Any]]]:
        """Collect verified versions grouped by skill name."""
        collected: Dict[str, List[Dict[str, Any]]] = {}
        if not os.path.isdir(self.packs_dir):
            return collected

        for name in sorted(os.listdir(self.packs_dir)):
            directory = os.path.join(self.packs_dir, name)
            if not os.path.isdir(directory):
                continue
            covered = set()
            for filename in sorted(os.listdir(directory)):
                if not filename.endswith(".json"):
                    continue
                version = filename[: -len(".json")]
                sidecar = self._read_sidecar(os.path.join(directory, filename))
                if sidecar is None:
                    continue
                if sidecar["name"] != name or sidecar["version"] != version:
                    logger.warning("sidecar %s/%s disagrees with its path", name, filename)
                    continue
                zip_path = os.path.join(directory, version + ".zip")
                if not os.path.isfile(zip_path):
                    logger.warning("sidecar %s/%s has no archive", name, filename)
                    continue
                if os.path.getsize(zip_path) != sidecar["size"]:
                    logger.warning("archive %s/%s.zip does not match its recorded size", name, version)
                    continue
                if self.config.verify_sha_on_reindex:
                    try:
                        actual = sha256_file(zip_path)
                    except OSError as error:
                        logger.warning("cannot hash %s: %s", zip_path, error)
                        continue
                    if actual != sidecar["sha256"]:
                        logger.warning("archive %s/%s.zip does not match its recorded sha256", name, version)
                        continue
                covered.add(version)
                collected.setdefault(name, []).append(sidecar)

            # Adopt archives placed without a sidecar (migration or manual copy).
            for filename in sorted(os.listdir(directory)):
                if not filename.endswith(".zip"):
                    continue
                version = filename[: -len(".zip")]
                if version in covered:
                    continue
                zip_path = os.path.join(directory, filename)
                try:
                    info = validate_archive(
                        zip_path,
                        name,
                        self.config.max_entries,
                        self.config.max_uncompressed_bytes,
                        self.config.max_skill_md_bytes,
                    )
                except PackageError as error:
                    logger.warning("ignoring unindexable archive %s: %s", zip_path, error.message)
                    continue
                except OSError as error:
                    logger.warning("ignoring unreadable archive %s: %s", zip_path, error)
                    continue
                size = os.path.getsize(zip_path)
                published_at = int(os.path.getmtime(zip_path))
                sidecar = self._sidecar_payload(name, version, sha256_file(zip_path), size, published_at, info)
                try:
                    _atomic_write(
                        os.path.join(directory, version + ".json"),
                        json.dumps(sidecar, ensure_ascii=False, indent=2).encode("utf-8"),
                    )
                except OSError as error:
                    logger.warning("cannot write adopted sidecar for %s: %s", zip_path, error)
                collected.setdefault(name, []).append(sidecar)

        return collected

    def _rebuild(self) -> Dict[str, Any]:
        os.makedirs(self.root, exist_ok=True)
        collected = self._collect()
        skills: List[Dict[str, Any]] = []
        for name in sorted(collected):
            versions = collected[name]
            latest = max(versions, key=lambda item: (int(item["publishedAt"]), str(item["version"])))
            skills.append(
                {
                    "name": name,
                    "description": latest["description"],
                    "tags": latest.get("tags") or [],
                    "version": latest["version"],
                    "url": "packs/%s/%s.zip" % (name, latest["version"]),
                    "sha256": latest["sha256"],
                    "size": latest["size"],
                    "publishedAt": latest["publishedAt"],
                }
            )

        document = {
            "format": 1,
            "title": self.config.index_title,
            "generatedAt": _iso_now(),
            "skills": skills,
        }
        _atomic_write(
            self.index_path,
            json.dumps(document, ensure_ascii=False, indent=2).encode("utf-8"),
        )
        self._current = document
        return document

    # -- publishing -----------------------------------------------------

    def publish(
        self,
        staging_path: str,
        name: str,
        version: str,
        sha256: str,
        size: int,
        info: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Move a validated upload into place and rebuild the index.

        The archive is renamed into ``packs/<name>/<version>.zip`` and its
        sidecar is written afterwards; the next rebuild adopts the archive
        even if the sidecar write fails.
        """
        with self.lock:
            target_dir = os.path.join(self.packs_dir, name)
            os.makedirs(target_dir, exist_ok=True)
            zip_target = os.path.join(target_dir, version + ".zip")

            if os.path.isfile(zip_target):
                existing = sha256_file(zip_target)
                if existing == sha256:
                    document = self._rebuild()
                    return {"created": False, "entry": self._find(document, name)}
                raise VersionConflict(
                    "%s@%s already exists with different content" % (name, version)
                )

            os.replace(staging_path, zip_target)
            sidecar = self._sidecar_payload(name, version, sha256, size, int(time.time()), info)
            _atomic_write(
                os.path.join(target_dir, version + ".json"),
                json.dumps(sidecar, ensure_ascii=False, indent=2).encode("utf-8"),
            )
            document = self._rebuild()
            return {"created": True, "entry": self._find(document, name)}

    @staticmethod
    def _find(document: Dict[str, Any], name: str) -> Dict[str, Any]:
        for entry in document["skills"]:
            if entry["name"] == name:
                return entry
        raise RuntimeError("published skill %r is missing from the rebuilt index" % name)
