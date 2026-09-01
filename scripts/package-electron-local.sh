#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
electron_root="${repo_root}/apps/electron"
node24="/Users/jiangjie/.nvm/versions/node/v24.12.0/bin"

if [[ -d "${node24}" ]]; then
  export PATH="${node24}:${PATH}"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "package-electron-local: node not found" >&2
  exit 1
fi

node_major="$(node -p 'process.versions.node.split(".")[0]')"
node_minor="$(node -p 'process.versions.node.split(".")[1]')"
if (( node_major < 22 || (node_major == 22 && node_minor < 19) )); then
  echo "package-electron-local: node $(node -v) is too old; use ^22.19.0 or >=24.0.0" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "package-electron-local: pnpm not found; enable it with corepack or install pnpm 11" >&2
  exit 1
fi

# `pnpm run` does not accept `--registry`. Export it so prepare-resources can
# forward it to `pnpm deploy`, which does. pnpm 11 rejects deploy when lockfile
# `tarball:` hosts disagree with the active registry (ERR_PNPM_TARBALL_URL_MISMATCH).
if [[ -z "${npm_config_registry:-}" ]] && grep -q 'tarball: https://registry.npmmirror.com/' "${repo_root}/pnpm-lock.yaml"; then
  export npm_config_registry="https://registry.npmmirror.com"
fi

if [[ -z "${ELECTRON_MIRROR:-}" ]]; then
  export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
fi

pnpm_local=(
  pnpm
  --dir "${electron_root}"
  --config.verify-deps-before-run=false
)

echo "package-electron-local: node $(node -v) pnpm $(pnpm -v) registry ${npm_config_registry:-default}"
echo "package-electron-local: preparing resources"
"${pnpm_local[@]}" run prepare:resources

echo "package-electron-local: building Electron main process"
"${pnpm_local[@]}" run build

electron_builder_cli="$(
  find "${repo_root}/node_modules/.pnpm" \
    -path '*/node_modules/electron-builder/cli.js' \
    -print \
    -quit
)"
if [[ -z "${electron_builder_cli}" ]]; then
  echo "package-electron-local: electron-builder CLI not found; run pnpm install first" >&2
  exit 1
fi

echo "package-electron-local: packaging desktop app"
(
  cd "${electron_root}"
  node "${electron_builder_cli}"
)

echo "package-electron-local: artifacts written to ${electron_root}/release"
