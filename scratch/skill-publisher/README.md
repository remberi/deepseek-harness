# DSH skill publisher

内网用的 skill 发布服务：接收 skill 压缩包、校验结构、落盘、重建 `index.json`，并把索引和包直接通过 HTTP 提供出去。替代原来的 nginx 静态托管。

- 运行环境：CentOS 7.9 自带的 Python 3.7.2（系统 Python 2.7.5 不动）
- 框架：FastAPI 0.99.1 + Pydantic 1.10.13 + uvicorn 0.22.0
- 端口：8005，单 worker
- 无认证（内网可信）

## 目录

- [存储布局](#存储布局)
- [接口](#接口)
- [索引格式](#索引格式)
- [安装](#安装)
- [部署](#部署)
- [运维](#运维)
- [排障](#排障)
- [安全与限制](#安全与限制)

## 存储布局

```
<SKILL_ROOT>/
├── index.json                 # 唯一下发索引，由服务重建
├── .staging/                  # 上传临时文件，启动时清空，不对外暴露
└── packs/<name>/
    ├── <version>.zip          # 原样保存，永不改写
    └── <version>.json         # sidecar 元数据
```

`packs/` 是唯一真相：`index.json` 每次都由它整份重建、原子替换。`index.json` 中每个 skill 只指向 `publishedAt` 最新的版本；旧的 zip 一直保留，重传旧版本即可回滚。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| PUT | `/api/skills/{name}/{version}` | body 为 zip 原始字节；201 新建、200 幂等、409 版本冲突、400 包非法、413 超限 |
| GET | `/api/skills` | 当前索引条目数组 |
| POST | `/api/reindex` | 手动重建索引（运维用） |
| GET | `/index.json` | 索引；`Cache-Control: no-cache`，支持 `If-None-Match` → 304 |
| GET | `/packs/{name}/{version}.zip` | 包；`Cache-Control: public, max-age=31536000, immutable` |
| GET | `/healthz` | `{"status":"ok"}` |
| GET | `/` | 302 到 `/index.json` |

上传示例：

```sh
curl -X PUT --data-binary @frontend-project-setup.zip \
  http://<IP>:8005/api/skills/frontend-project-setup/1.0.0
```

`name` 必须是 kebab-case，`version` 必须是 SemVer（如 `1.0.0`、`1.2.3-rc.1`）。zip 里必须只有一个顶层目录，目录名等于 `name`，且包含 `<name>/SKILL.md`。

## 索引格式

```json
{
  "format": 1,
  "title": "Skill library",
  "generatedAt": "2026-10-27T04:00:00Z",
  "skills": [
    {
      "name": "frontend-project-setup",
      "description": "标准前端项目搭建技能。",
      "tags": ["frontend"],
      "version": "1.0.0",
      "url": "packs/frontend-project-setup/1.0.0.zip",
      "sha256": "4a8f1ed8…",
      "size": 17955,
      "publishedAt": 1793000000
    }
  ]
}
```

`url` 相对索引 URL 解析。DSH 插件按 `sha256` 判断更新，不依赖版本号。

## 安装

```sh
python3 -m venv /opt/dsh-skill-publisher/.venv

# pip 24 起要求 Python>=3.8，必须锁在 24 以下
/opt/dsh-skill-publisher/.venv/bin/pip install --upgrade 'pip<24'
/opt/dsh-skill-publisher/.venv/bin/pip install -r /opt/dsh-skill-publisher/requirements.txt
```

离线安装：在能上外网的机器上执行

```sh
pip download -d wheels --only-binary=:all: \
  --platform manylinux2014_x86_64 --python-version 37 --implementation cp --abi cp37m \
  -r requirements.txt
```

把 `wheels/` 拷到服务器后：

```sh
/opt/dsh-skill-publisher/.venv/bin/pip install --no-index --find-links=wheels -r requirements.txt
```

## 部署

```sh
sudo groupadd -r skillsvc 2>/dev/null || true
sudo useradd -r -g skillsvc -s /sbin/nologin skillsvc
sudo mkdir -p /opt/dsh-skill-publisher
sudo rsync -a --exclude .venv --exclude __pycache__ ./ /opt/dsh-skill-publisher/

sudo mkdir -p /srv/dsh-skills/packs
sudo chown -R skillsvc:skillsvc /srv/dsh-skills /opt/dsh-skill-publisher
sudo chmod -R a+rX /srv/dsh-skills

sudo cp /opt/dsh-skill-publisher/systemd/dsh-skill-publisher.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dsh-skill-publisher
systemctl status dsh-skill-publisher --no-pager
ss -lntp | grep 8005
```

手动调试：

```sh
SKILL_ROOT=/tmp/skills-test /opt/dsh-skill-publisher/.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8005
```

环境变量：`SKILL_ROOT`、`HOST`、`PORT`、`INDEX_TITLE`、`MAX_UPLOAD_BYTES`、`MAX_UNCOMPRESSED_BYTES`、`MAX_ENTRIES`、`MAX_SKILL_MD_BYTES`、`VERIFY_SHA_ON_REINDEX`。

## 运维

- 看日志：`journalctl -u dsh-skill-publisher -f`
- 重建索引：`curl -X POST http://127.0.0.1:8005/api/reindex`
- 备份：整个 `<SKILL_ROOT>` 直接 `tar` 即可；`packs/` 和 sidecar 足以在任意机器上恢复（下次启动自动重建索引）
- 回滚：把旧版本 zip 用原版本号重新 PUT 一次，或把旧版本重新取一个更高版本号发布
- 新增 skill：直接 `PUT` 一个 zip，无需改任何配置

## 维护脚本

`manage.py` 负责启停与日常操作，只用标准库，Python 3.7 可直接运行：

```sh
./manage.py start                 # 后台启动；装了 systemd 单元时自动走 systemctl
./manage.py start --foreground    # 前台运行，调试用（direct 模式）
./manage.py status                # 进程状态 + /healthz
./manage.py stop
./manage.py restart
./manage.py logs -f               # 跟日志（systemd 模式走 journalctl）
./manage.py health
./manage.py index                 # 打印当前 index.json
./manage.py reindex               # POST /api/reindex
./manage.py publish frontend-project-setup.zip frontend-project-setup 1.0.0
```

- 默认 `--mode auto`：`/etc/systemd/system/dsh-skill-publisher.service` 存在就用 systemd，否则用 direct。
- direct 模式下以 root 启动会自动降权到 `skillsvc`，PID 文件在 `.run/`，日志在 `logs/`。
- `--port`、`--url` 可覆盖默认的 8005 和 `http://127.0.0.1:<port>`。

## 排障

| 现象 | 检查 |
|---|---|
| 服务起不来 | `journalctl -u dsh-skill-publisher -n 100`；多半是 `<SKILL_ROOT>` 权限或依赖没装 |
| 8005 不通 | `ss -lntp \| grep 8005`；`firewall-cmd --list-ports`；SELinux 用 `ausearch -m avc -ts recent` |
| `503 index-missing` | 启动重建没跑成功，看日志；或手动 `POST /api/reindex` |
| 上传 400 | 响应里的 `detail.code` 会说明原因：`wrong-root`、`missing-skill-md`、`name-mismatch`、`invalid-entry` 等 |
| 上传 409 | 同版本已存在且内容不同；换版本号，或先删掉旧 zip + sidecar 再传 |
| 上传 413 | 超过 `MAX_UPLOAD_BYTES`（默认 20 MiB） |
| 目录里有旧索引 | 启动会覆盖 `index.json`；建议先备份 |

## 安全与限制

- 无认证：同一网段任何人都能发布 skill，而 skill 是模型指令，会影响所有使用者的 agent 行为。仅在可信内网运行；需要收紧时在 FastAPI 前加 IP 白名单或 token。
- 服务端不解压上传的 zip，只从内存读 `SKILL.md`；但仍会拒绝路径穿越、绝对路径、符号链接和超大条目，以保护后续安装的客户端。
- 单 worker：不要用 `--workers > 1`，索引重建依赖进程内锁。
- CentOS 7 与 Python 3.7 均已 EOL，无安全更新；不要暴露到公网。
