"""Validation of uploaded skill archives and the metadata read from them.

A package is a zip whose single top-level directory is the skill name and
which contains ``<name>/SKILL.md`` with YAML frontmatter. Validation never
extracts the archive to disk: the server stores the zip as uploaded and reads
``SKILL.md`` from memory, so a malicious path cannot touch the filesystem
here. The structural checks below protect the clients that later extract it.
"""
from __future__ import annotations

import hashlib
import re
import stat
import zipfile
from typing import Any, Dict, List

import yaml

NAME_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
VERSION_PATTERN = r"^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$"

_NAME_RE = re.compile(NAME_PATTERN)
_VERSION_RE = re.compile(VERSION_PATTERN)

# Entries produced by macOS Finder or by copying a directory; ignored entirely.
_IGNORED_PREFIXES = ("__MACOSX/",)
_IGNORED_BASENAMES = (".DS_Store",)


class PackageError(Exception):
    """A rejected upload with a stable machine-readable code."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def validate_name(name: str) -> None:
    """Raise ``ValueError`` unless ``name`` is a kebab-case skill name."""
    if not _NAME_RE.match(name):
        raise ValueError("invalid skill name %r; expected kebab-case like 'frontend-project-setup'" % name)


def validate_version(version: str) -> None:
    """Raise ``ValueError`` unless ``version`` is a SemVer-like identifier."""
    if not _VERSION_RE.match(version):
        raise ValueError("invalid version %r; expected SemVer like '1.0.0'" % version)


def sha256_file(path: str) -> str:
    """Return the SHA-256 hex digest of one file."""
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_frontmatter(text: str) -> Dict[str, Any]:
    """Parse the YAML frontmatter block at the start of a ``SKILL.md``."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise PackageError("invalid-frontmatter", "SKILL.md must start with a YAML frontmatter block")
    end = None
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            end = index
            break
    if end is None:
        raise PackageError("invalid-frontmatter", "SKILL.md frontmatter is not closed with '---'")
    block = "\n".join(lines[1:end])
    try:
        data = yaml.safe_load(block)
    except yaml.YAMLError as error:
        raise PackageError("invalid-frontmatter", "cannot parse SKILL.md frontmatter: %s" % error)
    if not isinstance(data, dict):
        raise PackageError("invalid-frontmatter", "SKILL.md frontmatter must be a YAML mapping")
    return data


def _is_ignored(name: str) -> bool:
    if name.startswith(_IGNORED_PREFIXES):
        return True
    return name.split("/")[-1] in _IGNORED_BASENAMES


def _is_symlink(info: zipfile.ZipInfo) -> bool:
    mode = info.external_attr >> 16
    return bool(mode) and stat.S_ISLNK(mode)


def _reject_unsafe_path(name: str) -> None:
    if not name or name.startswith("/") or "\\" in name:
        raise PackageError("invalid-entry", "unsafe archive entry path: %r" % name)
    # Directory entries carry a trailing slash; validate their real segments.
    trimmed = name[:-1] if name.endswith("/") else name
    parts = trimmed.split("/")
    if any(part in ("..", "") for part in parts):
        raise PackageError("invalid-entry", "unsafe archive entry path: %r" % name)


def validate_archive(
    path: str,
    expected_name: str,
    max_entries: int = 500,
    max_uncompressed_bytes: int = 50 * 1024 * 1024,
    max_skill_md_bytes: int = 512 * 1024,
) -> Dict[str, Any]:
    """Validate one uploaded package and return its display metadata.

    Raises :class:`PackageError` with a stable code on any rejection.
    """
    try:
        archive = zipfile.ZipFile(path)
    except (zipfile.BadZipFile, OSError) as error:
        raise PackageError("invalid-zip", "cannot open upload as a zip archive: %s" % error)

    with archive:
        infos = archive.infolist()
        if len(infos) > max_entries:
            raise PackageError(
                "too-many-entries",
                "archive has %d entries, limit is %d" % (len(infos), max_entries),
            )

        total_uncompressed = 0
        top_level = set()
        for info in infos:
            entry = info.filename
            if _is_ignored(entry):
                continue
            _reject_unsafe_path(entry)
            if _is_symlink(info):
                raise PackageError("symlink-entry", "archive contains a symbolic link: %r" % entry)
            total_uncompressed += info.file_size
            if total_uncompressed > max_uncompressed_bytes:
                raise PackageError(
                    "archive-too-large",
                    "uncompressed size exceeds %d bytes" % max_uncompressed_bytes,
                )
            if entry.endswith("/"):
                continue
            first = entry.split("/")[0]
            if first != expected_name:
                raise PackageError(
                    "wrong-root",
                    "every entry must live under %r/, found %r" % (expected_name, entry),
                )
            top_level.add(first)

        if top_level != {expected_name}:
            raise PackageError(
                "wrong-root",
                "archive must contain exactly one top-level directory named %r" % expected_name,
            )

        skill_md = expected_name + "/SKILL.md"
        try:
            skill_info = archive.getinfo(skill_md)
        except KeyError:
            raise PackageError("missing-skill-md", "archive is missing %s" % skill_md)
        if skill_info.file_size > max_skill_md_bytes:
            raise PackageError(
                "skill-md-too-large",
                "%s exceeds %d bytes" % (skill_md, max_skill_md_bytes),
            )
        raw = archive.read(skill_md)

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise PackageError("invalid-encoding", "SKILL.md is not valid UTF-8: %s" % error)

    meta = parse_frontmatter(text)
    declared_name = meta.get("name")
    if not isinstance(declared_name, str) or declared_name != expected_name:
        raise PackageError(
            "name-mismatch",
            "frontmatter name %r does not match %r" % (declared_name, expected_name),
        )
    description = meta.get("description")
    if not isinstance(description, str) or not description.strip():
        raise PackageError("invalid-frontmatter", "frontmatter description must be a non-empty string")

    tags: List[str] = []
    metadata = meta.get("metadata")
    if isinstance(metadata, dict):
        raw_tags = metadata.get("tags")
        if isinstance(raw_tags, list):
            tags = [tag for tag in raw_tags if isinstance(tag, str) and tag.strip()]

    return {"description": description.strip(), "tags": tags}
