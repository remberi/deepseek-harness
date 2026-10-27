"""HTTP API for publishing and serving skill packages.

Run under the virtualenv's uvicorn (see ``systemd/dsh-skill-publisher.service``)::

    uvicorn app:app --host 0.0.0.0 --port 8005 --workers 1

A single worker is required: index rebuilds and version conflict checks are
serialized by an in-process lock.
"""
from __future__ import annotations

import hashlib
import logging
import os
from typing import Any, Dict, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, RedirectResponse
from starlette.concurrency import run_in_threadpool

from config import Config
from index import Store, VersionConflict
from skills import PackageError, validate_archive, validate_name, validate_version

logger = logging.getLogger("skill_publisher")


def create_app(config: Optional[Config] = None) -> FastAPI:
    """Build the FastAPI application for one configuration."""
    config = config or Config.from_env()
    store = Store(config)

    app = FastAPI(title="DSH skill publisher", docs_url=None, redoc_url=None)

    @app.on_event("startup")
    def _startup() -> None:
        store.ensure_layout()
        document = store.rebuild()
        logger.info(
            "skill publisher ready: root=%s skills=%d", config.skill_root, len(document["skills"])
        )

    @app.get("/healthz")
    def healthz() -> Dict[str, str]:
        return {"status": "ok"}

    @app.get("/")
    def root() -> RedirectResponse:
        return RedirectResponse(url="/index.json", status_code=302)

    @app.get("/api/skills")
    def list_skills() -> Any:
        return store.current()["skills"]

    @app.post("/api/reindex")
    async def reindex() -> Dict[str, int]:
        document = await run_in_threadpool(store.rebuild)
        return {"skills": len(document["skills"])}

    @app.put("/api/skills/{name}/{version}")
    async def publish(name: str, version: str, request: Request, response: Response) -> Dict[str, Any]:
        try:
            validate_name(name)
            validate_version(version)
        except ValueError as error:
            raise HTTPException(status_code=400, detail={"code": "invalid-params", "message": str(error)})

        staging = store.new_staging_path()
        digest = hashlib.sha256()
        size = 0
        try:
            with open(staging, "wb") as stream:
                async for chunk in request.stream():
                    if not chunk:
                        continue
                    size += len(chunk)
                    if size > config.max_upload_bytes:
                        raise HTTPException(
                            status_code=413,
                            detail={
                                "code": "package-too-large",
                                "message": "upload exceeds %d bytes" % config.max_upload_bytes,
                            },
                        )
                    digest.update(chunk)
                    stream.write(chunk)
                stream.flush()
                os.fsync(stream.fileno())

            if size == 0:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "empty-body", "message": "request body is empty"},
                )

            sha256 = digest.hexdigest()
            info = await run_in_threadpool(
                validate_archive,
                staging,
                name,
                config.max_entries,
                config.max_uncompressed_bytes,
                config.max_skill_md_bytes,
            )
            result = await run_in_threadpool(store.publish, staging, name, version, sha256, size, info)
        except HTTPException:
            store.remove_staging(staging)
            raise
        except PackageError as error:
            store.remove_staging(staging)
            raise HTTPException(
                status_code=400,
                detail={"code": error.code, "message": error.message},
            )
        except VersionConflict as error:
            store.remove_staging(staging)
            raise HTTPException(
                status_code=409,
                detail={"code": "version-conflict", "message": str(error)},
            )
        except Exception:
            store.remove_staging(staging)
            logger.exception("publishing %s@%s failed", name, version)
            raise

        response.status_code = 201 if result["created"] else 200
        return result["entry"]

    @app.get("/index.json")
    def index_document(request: Request) -> Response:
        if not os.path.isfile(store.index_path):
            raise HTTPException(
                status_code=503,
                detail={"code": "index-missing", "message": "index has not been generated yet"},
            )
        stat = os.stat(store.index_path)
        etag = 'W/"%d-%d"' % (stat.st_mtime_ns, stat.st_size)
        headers = {"Cache-Control": "no-cache", "ETag": etag}
        if request.headers.get("if-none-match") == etag:
            return Response(status_code=304, headers=headers)
        return FileResponse(store.index_path, media_type="application/json", headers=headers)

    @app.get("/packs/{name}/{version}.zip")
    def download(name: str, version: str) -> Response:
        try:
            validate_name(name)
            validate_version(version)
        except ValueError as error:
            raise HTTPException(status_code=400, detail={"code": "invalid-params", "message": str(error)})

        path = os.path.join(store.packs_dir, name, version + ".zip")
        if not os.path.isfile(path):
            raise HTTPException(
                status_code=404,
                detail={"code": "not-found", "message": "%s@%s is not published" % (name, version)},
            )
        return FileResponse(
            path,
            media_type="application/zip",
            headers={"Cache-Control": "public, max-age=31536000, immutable"},
        )

    return app


app = create_app()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    runtime = Config.from_env()
    uvicorn.run(app, host=runtime.host, port=runtime.port)
