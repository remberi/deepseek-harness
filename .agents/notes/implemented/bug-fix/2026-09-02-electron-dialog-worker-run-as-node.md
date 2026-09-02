# Agent Note: Packaged Electron folder dialog spawn must set ELECTRON_RUN_AS_NODE

Status: implemented

English | [中文](2026-09-02-electron-dialog-worker-run-as-node.zh.md)

## Problem

The Win32 folder picker [spawns `process.execPath` as a dialog child](../feature/2026-08-02-win32-in-process-folder-dialog.md) so the modal `IFileOpenDialog` never blocks the host event loop. In the packaged desktop app that executable is `DeepSeek Harness.exe`. Electron injects `ELECTRON_RUN_AS_NODE` on `child_process.fork`, not on `spawn`. Copying the full parent `process.env` is not enough: after Cordis boot the block can exceed Windows' ~32 KiB environment limit, which truncates later entries and can drop the flag. The child then boots as a second GUI instance, fails `app.requestSingleInstanceLock`, exits 0 with no IPC result, and the UI reports `directory picker failed: win32 folder dialog worker exited before reporting a result`.

## Decision

`dialogWorkerEnv` always sets `ELECTRON_RUN_AS_NODE=1` and `DSH_DIALOG_TITLE`, and copies only an allowlist of Windows process keys (`PATH`, `SYSTEMROOT`, profile and temp directories). Plain Node ignores the Electron variable. Under Electron the small block keeps the flag intact so the packaged exe loads `lib/worker.cjs` (or the tsx source entry) as Node. `spawnDialogWorker` uses `spawn` with `stdio` `ignore`/`pipe`/`ipc` so Windows still installs `process.send` when the parent stdout is already a pipe.

## Alternatives considered

**Copy the full parent `process.env` and only add `ELECTRON_RUN_AS_NODE`.** The first packaged rebuild did this; a booted Cordis process can still overflow the Windows environment block and drop the flag.

**Switch the spawn to `fork()`.** `fork` would inject the variable, but this child already uses `spawn` for `windowsHide` and an explicit IPC channel that keeps the dialog as the first window; the allowlisted env is the smaller change to that process model.

**Set the variable only when `process.versions.electron` is defined.** That misses a parent that stripped the version field or a nested spawn whose `execPath` is still the app exe. Unconditional set is a no-op under Node.

**Fall back to PowerShell when the child exits silently.** Rejected by the [koffi-only Windows tier](../simplification/2026-08-04-drop-windows-powershell-picker-fallback.md): a packaging or spawn defect must surface, not hide behind a legacy dialog.

## Consequences

A packaged Electron pick launches the modern folder dialog instead of a second GUI instance. Unit tests pin `ELECTRON_RUN_AS_NODE=1`, the allowlist, and that a silent exit reports the child's status and stderr. Opening the real dialog inside a packaged build remains a manual Windows check; the [koffi child-process note](../feature/2026-08-02-win32-in-process-folder-dialog.md) still names that gap.
