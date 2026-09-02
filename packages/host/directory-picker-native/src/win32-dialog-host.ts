/**
 * Real-process half of the Win32 dialog driver: spawn the dialog child
 * process (source or built plane) and close a dialog thread's windows. The
 * module itself loads everywhere (the import chain from native-picker.ts is
 * static); what stays win32-only is koffi, imported dynamically inside the
 * bindings' functions. The driver's logic is tested against fakes of this
 * surface instead.
 */

import { spawn, type StdioOptions } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import type { Win32DialogWorkerData } from './win32-dialog-worker.ts'

/**
 * Parent keys forwarded to the dialog child. A full `process.env` copy can
 * exceed Windows' environment block (~32 KiB) after Cordis boot, which
 * truncates later entries and can drop `ELECTRON_RUN_AS_NODE`.
 */
const DIALOG_ENV_KEYS = [
  'PATH',
  'PATHEXT',
  'SYSTEMROOT',
  'WINDIR',
  'SYSTEMDRIVE',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'HOMEDRIVE',
  'HOMEPATH',
  'APPDATA',
  'LOCALAPPDATA',
  'COMSPEC',
  'USERNAME',
  'PROCESSOR_ARCHITECTURE',
  'ProgramData',
  'ProgramFiles',
  'ProgramFiles(x86)',
  'PUBLIC',
] as const

/**
 * Read one variable from a parent env, matching the name case-insensitively
 * because Windows stores `Path` / `PATH` as one entry.
 * @param parentEnv - the parent environment map.
 * @param name - canonical key from {@link DIALOG_ENV_KEYS}.
 * @returns the non-empty value, or undefined when absent.
 */
function readEnv(parentEnv: NodeJS.ProcessEnv, name: string): string | undefined {
  const direct = parentEnv[name]
  if (direct !== undefined && direct !== '') return direct
  const match = Object.keys(parentEnv).find(key => key.toLowerCase() === name.toLowerCase())
  if (match === undefined) return undefined
  const value = parentEnv[match]
  return value === undefined || value === '' ? undefined : value
}

/**
 * Environment for the dialog child. Always sets `ELECTRON_RUN_AS_NODE` so a
 * packaged Electron `process.execPath` runs the worker as Node instead of a
 * second GUI instance, and copies only the allowlisted parent keys so the
 * Windows environment block cannot truncate that flag. Electron injects the
 * variable on `fork`, not on `spawn`; plain Node ignores it.
 * @param title - dialog title forwarded as `DSH_DIALOG_TITLE`.
 * @param parentEnv - parent environment to sample; defaults to `process.env`.
 * @returns the child environment.
 */
export function dialogWorkerEnv(
  title: string,
  parentEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    DSH_DIALOG_TITLE: title,
    ELECTRON_RUN_AS_NODE: '1',
  }
  for (const key of DIALOG_ENV_KEYS) {
    const value = readEnv(parentEnv, key)
    if (value !== undefined) env[key] = value
  }
  return env
}

/**
 * Spawn the dialog child process. Built consumers launch the bundled CJS
 * entry next to this module under plain node; unbuilt (source) consumers
 * bootstrap tsx first, mirroring the dsh CLI's source launch. The child
 * opens its dialog as foreground on its own: `runFolderDialog` synthesizes
 * an Alt press before `Show`, which matters when a background host spawned
 * the child. That child always receives `ELECTRON_RUN_AS_NODE=1` and a small
 * allowlisted environment so a packaged Electron `process.execPath` runs the
 * worker as Node instead of a second GUI instance. stdout is ignored and
 * stderr is piped so a silent native crash still has a diagnostic; mixing
 * `inherit` with `ipc` when the parent stdout is already a pipe can fail to
 * install `process.send` on Windows.
 * @param data - the child payload (dialog title).
 * @returns the spawned child process.
 */
export function spawnDialogWorker(data: Win32DialogWorkerData): ReturnType<typeof spawn> {
  const env = dialogWorkerEnv(data.title)
  const stdio: StdioOptions = ['ignore', 'ignore', 'pipe', 'ipc']
  /* v8 ignore next 3 -- the built-output arm: tests always run unbuilt (src/) */
  if (!import.meta.url.endsWith('.ts')) {
    return spawn(process.execPath, [fileURLToPath(new URL('./worker.cjs', import.meta.url))], { env, stdio, windowsHide: true })
  }
  return spawn(process.execPath, ['--import', import.meta.resolve('tsx/esm'), fileURLToPath(new URL('./win32-dialog-worker.ts', import.meta.url))], { env, stdio, windowsHide: true })
}

export { closeThreadWindows } from './win32-dialog-bindings.ts'
