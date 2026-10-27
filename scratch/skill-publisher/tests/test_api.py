"""HTTP-level tests for the publisher API."""
import hashlib
import io
import os
import zipfile

from fastapi.testclient import TestClient

from app import create_app
from config import Config

FRONTMATTER = """---
name: {name}
description: A demo skill used by the tests.
---

# Demo
"""


def package_bytes(name="demo", description="A demo skill used by the tests."):
    body = FRONTMATTER.format(name=name).replace("A demo skill used by the tests.", description)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr(name + "/SKILL.md", body)
        archive.writestr(name + "/references/guide.md", "# Guide\n")
    return buffer.getvalue()


def make_client(tmp_path):
    return TestClient(create_app(Config(skill_root=str(tmp_path))))


def test_publish_updates_index_and_serves_archive(tmp_path):
    payload = package_bytes()
    with make_client(tmp_path) as client:
        response = client.put("/api/skills/demo/1.0.0", content=payload)
        assert response.status_code == 201
        assert response.json()["sha256"] == hashlib.sha256(payload).hexdigest()

        document = client.get("/index.json").json()
        assert document["format"] == 1
        assert [skill["name"] for skill in document["skills"]] == ["demo"]
        entry = document["skills"][0]
        assert entry["version"] == "1.0.0"
        assert entry["url"] == "packs/demo/1.0.0.zip"

        download = client.get("/packs/demo/1.0.0.zip")
        assert download.status_code == 200
        assert download.content == payload
        assert "immutable" in download.headers["cache-control"]

        assert client.get("/healthz").json() == {"status": "ok"}


def test_same_archive_is_idempotent(tmp_path):
    payload = package_bytes()
    with make_client(tmp_path) as client:
        assert client.put("/api/skills/demo/1.0.0", content=payload).status_code == 201
        assert client.put("/api/skills/demo/1.0.0", content=payload).status_code == 200


def test_same_version_with_different_content_conflicts(tmp_path):
    with make_client(tmp_path) as client:
        assert client.put("/api/skills/demo/1.0.0", content=package_bytes()).status_code == 201
        other = package_bytes(description="A changed demo skill description.")
        response = client.put("/api/skills/demo/1.0.0", content=other)
        assert response.status_code == 409
        assert response.json()["detail"]["code"] == "version-conflict"


def test_rejects_malformed_archive(tmp_path):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("demo/SKILL.md", FRONTMATTER.format(name="demo"))
        archive.writestr("demo/../evil.md", "x")
    with make_client(tmp_path) as client:
        response = client.put("/api/skills/demo/1.0.0", content=buffer.getvalue())
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "invalid-entry"


def test_rejects_invalid_parameters(tmp_path):
    with make_client(tmp_path) as client:
        assert client.put("/api/skills/Demo/1.0.0", content=b"x").status_code == 400
        assert client.put("/api/skills/demo/not-a-version", content=b"x").status_code == 400


def test_keeps_old_versions_and_indexes_latest(tmp_path):
    with make_client(tmp_path) as client:
        assert client.put("/api/skills/demo/1.0.0", content=package_bytes()).status_code == 201
        assert client.put("/api/skills/demo/1.1.0", content=package_bytes()).status_code == 201
        document = client.get("/index.json").json()
        assert document["skills"][0]["version"] == "1.1.0"
        assert client.get("/packs/demo/1.0.0.zip").status_code == 200
        assert client.get("/packs/demo/1.1.0.zip").status_code == 200


def test_reindex_adopts_archive_copied_without_sidecar(tmp_path):
    with make_client(tmp_path) as client:
        assert client.put("/api/skills/demo/1.0.0", content=package_bytes()).status_code == 201
        target = os.path.join(str(tmp_path), "packs", "demo", "2.0.0.zip")
        with open(target, "wb") as handle:
            handle.write(package_bytes())
        response = client.post("/api/reindex")
        assert response.status_code == 200
        document = client.get("/index.json").json()
        assert document["skills"][0]["version"] == "2.0.0"


def test_index_supports_conditional_requests(tmp_path):
    with make_client(tmp_path) as client:
        assert client.put("/api/skills/demo/1.0.0", content=package_bytes()).status_code == 201
        first = client.get("/index.json")
        assert first.status_code == 200
        etag = first.headers["etag"]
        second = client.get("/index.json", headers={"If-None-Match": etag})
        assert second.status_code == 304


def test_unknown_archive_is_404(tmp_path):
    with make_client(tmp_path) as client:
        assert client.get("/packs/demo/9.9.9.zip").status_code == 404
