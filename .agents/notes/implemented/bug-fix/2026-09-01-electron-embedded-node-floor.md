# Agent Note: Electron desktop shell ships Node at the harness floor

Status: implemented

English | [中文](2026-09-01-electron-embedded-node-floor.zh.md)

## Problem

The packaged desktop app launches `dsh web` with Electron's own `process.execPath` and `ELECTRON_RUN_AS_NODE=1`. That child inherits Electron's embedded Node, not the Node used to package the app. Electron 35 ships Node 22.14, which does not export `createZstdDecompress` from `node:zlib`. `@deepseek-ai/dsh-session-persistence-jsonl` imports that API at load, so the child exits before printing `dsh web: http://…` and the window never opens.

A second failure happens at pack time. pnpm 11 refuses Node below 22.13, and the harness `engines.node` floor is `^22.19.0 || >=24.0.0` ([Node engine floor](../process/2026-07-06-node-engine-floor.md)). `pnpm deploy --legacy` of `dsh-electron-runtime-closure` also omits workspace packages the hoister leaves beside the deploy source, so `extraResources/harness` can miss `@deepseek-ai/dsh-web-frontend` and other in-box bundles.

## Decision

`@deepseek-ai/dsh-electron` depends on `electron@44.0.0`, whose fingerprint `node-addon-require-builtin` accepts (Node 24 under Electron 44.0.0). Later 44.x releases such as 44.4.1 ship Node 24.21.0 / V8 15.2.124.19-electron.0 and fail host preparation. The main process asserts the same `engines.node` floor before spawning `dsh web`, prepends `--expose-internals` so Cordis HMR can reach Node's ESM loader, and a failed boot shows `dialog.showErrorBox` so a double-clicked app is not a silent exit.

The lockfile stores package integrity without pinning `tarball:` hosts. pnpm 11 compares those hosts to the active registry's metadata and fails with `ERR_PNPM_TARBALL_URL_MISMATCH` when a previous install wrote npmmirror URLs while `~/.npmrc` points at registry.npmjs.org, which is what made `pnpm deploy` look like a missing-dependency install.

`apps/electron/scripts/prepare-resources.mjs` refuses to stage on Node below that floor. After `pnpm --filter dsh-electron-runtime-closure deploy --legacy --prod`, it copies workspace packages from `vendor/`, `packages/`, `apps/cli`, `apps/web`, and `native/landlock-run/packages` over the staged `node_modules` (the same restore the Python executable uses for omitted legacy hoists) and requires `@deepseek-ai/dsh/lib/bin.js`, `@deepseek-ai/dsh-web-app`, `@deepseek-ai/dsh-base`, and `@deepseek-ai/dsh-web-frontend/dist/index.html`. The closure manifest lists those three packages as direct `workspace:` dependencies so deploy has an explicit web stack. `prune-harness.mjs` keeps `koffi/src` because koffi loads native sources from that directory. The Electron shell asar has no production native addons; `dsh web` loads `node-pty` and `koffi` from `extraResources/harness` under `ELECTRON_RUN_AS_NODE`, so they must keep the Node N-API ABI. `"npmRebuild": false` skips `@electron/rebuild`, which would otherwise walk the workspace pnpm store (and fail on dangling hoists such as `@types/yauzl`) and rebuild those addons for Electron's ABI.

## Alternatives considered

**Spawn a system `node` instead of Electron's binary.** A packaged app would then require a matching Node on `PATH`, which is not a desktop-install contract.

**Ship a separate Node binary in `extraResources`.** That duplicates the runtime, still pins a version, and leaves Electron's Node unused for the child that does the work.

**Keep Electron 35 and stop importing Node zstd.** Session persistence would diverge from the harness floor and from every other launcher.

**List every workspace package on `dsh-electron-runtime-closure` the way `dsh-python-runtime-closure` does.** That is the complete peer-closed graph for `--config.auto-install-peers=false`. The desktop shell only needs the web composition plus the copy-from-source restore; expanding to the Python inventory would duplicate a second full manifest without changing the Electron Node floor.

**Keep npmmirror `tarball:` pins in the lockfile.** That forces every install and `pnpm deploy` to use the same registry host as the lockfile. Stripping the host leaves integrity hashes as the source of truth and lets npmjs.org or npmmirror both resolve.

**Leave `npmRebuild` on and repair dangling pnpm hoists.** That still compiles harness natives for Electron's ABI. Under `ELECTRON_RUN_AS_NODE` they must match Node, not Electron.

## Consequences

Packaging must run under Node 22.19+ or 24+. `scripts/package-electron-local.sh` prepends nvm Node 24.12 when present, sets `ELECTRON_MIRROR` to npmmirror, and still passes `--registry` when a leftover lockfile tarball host is npmmirror. The main process prepends `--expose-internals` so Cordis HMR can reach Node's ESM loader under Electron-as-Node. Electron 44 is a Chromium 152 / Node 24 jump from 35. Native N-API addons (`node-pty`, `koffi`) load under Electron's Node 24. Verification is launching `dsh web` with `ELECTRON_RUN_AS_NODE=1 --expose-internals` against the staged harness and observing the URL line without a subsequent HMR or zlib failure; Electron 35 Node 22.14 fails at `createZstdDecompress`.
