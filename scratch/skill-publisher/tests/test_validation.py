"""Validation tests for uploaded archives."""
import stat
import zipfile

import pytest

from skills import PackageError, validate_archive, validate_name, validate_version

FRONTMATTER = """---
name: demo
description: A demo skill used by the tests.
metadata:
  tags:
    - demo
---

# Demo
"""


def _build(path, entries):
    with zipfile.ZipFile(str(path), "w") as archive:
        for name, data in entries:
            archive.writestr(name, data)
    return str(path)


def _valid(tmp_path, body=None):
    return _build(
        tmp_path / "demo.zip",
        [
            ("demo/SKILL.md", body if body is not None else FRONTMATTER),
            ("demo/references/guide.md", "# Guide\n"),
        ],
    )


def test_accepts_valid_package(tmp_path):
    info = validate_archive(_valid(tmp_path), "demo")
    assert info["description"].startswith("A demo skill")
    assert info["tags"] == ["demo"]


def test_accepts_explicit_directory_entries(tmp_path):
    path = tmp_path / "with-directories.zip"
    with zipfile.ZipFile(str(path), "w") as archive:
        archive.writestr("demo/", "")
        archive.writestr("demo/references/", "")
        archive.writestr("demo/SKILL.md", FRONTMATTER)
        archive.writestr("demo/references/guide.md", "# Guide\n")
    info = validate_archive(str(path), "demo")
    assert info["description"].startswith("A demo skill")


def test_rejects_traversal_entry(tmp_path):
    path = _build(
        tmp_path / "traversal.zip",
        [("demo/SKILL.md", FRONTMATTER), ("demo/../evil.md", "x")],
    )
    with pytest.raises(PackageError) as error:
        validate_archive(path, "demo")
    assert error.value.code == "invalid-entry"


def test_rejects_absolute_entry(tmp_path):
    path = _build(tmp_path / "absolute.zip", [("/etc/passwd", "x")])
    with pytest.raises(PackageError) as error:
        validate_archive(path, "demo")
    assert error.value.code == "invalid-entry"


def test_rejects_backslash_entry(tmp_path):
    path = _build(
        tmp_path / "backslash.zip",
        [("demo/SKILL.md", FRONTMATTER), ("demo\\evil.md", "x")],
    )
    with pytest.raises(PackageError) as error:
        validate_archive(path, "demo")
    assert error.value.code == "invalid-entry"


def test_rejects_symlink_entry(tmp_path):
    path = tmp_path / "symlink.zip"
    with zipfile.ZipFile(str(path), "w") as archive:
        archive.writestr("demo/SKILL.md", FRONTMATTER)
        link = zipfile.ZipInfo("demo/link.md")
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        archive.writestr(link, "target.md")
    with pytest.raises(PackageError) as error:
        validate_archive(str(path), "demo")
    assert error.value.code == "symlink-entry"


def test_rejects_second_top_level_directory(tmp_path):
    path = _build(
        tmp_path / "two-roots.zip",
        [("demo/SKILL.md", FRONTMATTER), ("other/file.md", "x")],
    )
    with pytest.raises(PackageError) as error:
        validate_archive(path, "demo")
    assert error.value.code == "wrong-root"


def test_rejects_missing_skill_md(tmp_path):
    path = _build(tmp_path / "no-skill-md.zip", [("demo/references/guide.md", "x")])
    with pytest.raises(PackageError) as error:
        validate_archive(path, "demo")
    assert error.value.code == "missing-skill-md"


def test_rejects_name_mismatch(tmp_path):
    body = FRONTMATTER.replace("name: demo", "name: other")
    with pytest.raises(PackageError) as error:
        validate_archive(_valid(tmp_path, body), "demo")
    assert error.value.code == "name-mismatch"


def test_rejects_missing_description(tmp_path):
    body = "---\nname: demo\n---\n"
    with pytest.raises(PackageError) as error:
        validate_archive(_valid(tmp_path, body), "demo")
    assert error.value.code == "invalid-frontmatter"


def test_rejects_frontmatter_that_is_not_a_mapping(tmp_path):
    body = "---\n- one\n- two\n---\n"
    with pytest.raises(PackageError) as error:
        validate_archive(_valid(tmp_path, body), "demo")
    assert error.value.code == "invalid-frontmatter"


def test_rejects_too_many_entries(tmp_path):
    path = _build(
        tmp_path / "many.zip",
        [
            ("demo/SKILL.md", FRONTMATTER),
            ("demo/a.md", "a"),
            ("demo/b.md", "b"),
        ],
    )
    with pytest.raises(PackageError) as error:
        validate_archive(path, "demo", max_entries=2)
    assert error.value.code == "too-many-entries"


def test_rejects_oversized_uncompressed_content(tmp_path):
    path = _build(
        tmp_path / "big.zip",
        [("demo/SKILL.md", FRONTMATTER), ("demo/blob.md", "x" * 4096)],
    )
    with pytest.raises(PackageError) as error:
        validate_archive(path, "demo", max_uncompressed_bytes=1024)
    assert error.value.code == "archive-too-large"


def test_validates_names_and_versions():
    validate_name("frontend-project-setup")
    validate_version("1.0.0")
    validate_version("1.2.3-rc.1")
    with pytest.raises(ValueError):
        validate_name("Frontend Project")
    with pytest.raises(ValueError):
        validate_version("../1.0.0")
