"""Environment-driven configuration for the skill publisher service.

All values have defaults so the service can start with only ``SKILL_ROOT``
set. Every field is read once at process start; changing an environment
variable requires a restart.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        raise ValueError("environment variable %s must be an integer, got %r" % (name, raw))
    if value <= 0:
        raise ValueError("environment variable %s must be positive" % name)
    return value


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw not in ("0", "false", "no", "off")


@dataclass
class Config:
    """Service configuration with defaults suitable for an intranet deployment."""

    skill_root: str = "/srv/dsh-skills"
    host: str = "0.0.0.0"
    port: int = 8005
    index_title: str = "Skill library"
    max_upload_bytes: int = 20 * 1024 * 1024
    max_uncompressed_bytes: int = 50 * 1024 * 1024
    max_entries: int = 500
    max_skill_md_bytes: int = 512 * 1024
    verify_sha_on_reindex: bool = True

    @classmethod
    def from_env(cls) -> "Config":
        """Build a configuration from the process environment."""
        return cls(
            skill_root=os.environ.get("SKILL_ROOT", "/srv/dsh-skills"),
            host=os.environ.get("HOST", "0.0.0.0"),
            port=_env_int("PORT", 8005),
            index_title=os.environ.get("INDEX_TITLE", "Skill library"),
            max_upload_bytes=_env_int("MAX_UPLOAD_BYTES", 20 * 1024 * 1024),
            max_uncompressed_bytes=_env_int("MAX_UNCOMPRESSED_BYTES", 50 * 1024 * 1024),
            max_entries=_env_int("MAX_ENTRIES", 500),
            max_skill_md_bytes=_env_int("MAX_SKILL_MD_BYTES", 512 * 1024),
            verify_sha_on_reindex=_env_bool("VERIFY_SHA_ON_REINDEX", True),
        )
