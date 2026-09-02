/**
 * Child-env contract for the Win32 dialog spawn: Electron's `spawn` of
 * `process.execPath` does not inject `ELECTRON_RUN_AS_NODE` the way `fork`
 * does, so the helper must set it even when the parent env omitted it, and
 * must not copy the full parent env (Windows can truncate a ~32 KiB block).
 */

import { describe, expect, it } from 'vitest'
import { dialogWorkerEnv } from '../src/win32-dialog-host.ts'

describe('dialogWorkerEnv', () => {
  it('sets the dialog title and ELECTRON_RUN_AS_NODE even when the parent omitted both', () => {
    expect(dialogWorkerEnv('Select Workspace Directory', {})).toEqual({
      DSH_DIALOG_TITLE: 'Select Workspace Directory',
      ELECTRON_RUN_AS_NODE: '1',
    })
  })

  it('copies allowlisted keys case-insensitively and drops everything else', () => {
    expect(dialogWorkerEnv('Pick', {
      Path: 'C:\\Windows\\system32',
      SystemRoot: 'C:\\Windows',
      SECRET: 'leak',
      ELECTRON_RUN_AS_NODE: '',
    })).toEqual({
      DSH_DIALOG_TITLE: 'Pick',
      ELECTRON_RUN_AS_NODE: '1',
      PATH: 'C:\\Windows\\system32',
      SYSTEMROOT: 'C:\\Windows',
    })
    expect(dialogWorkerEnv('Pick', { Path: '' }).PATH).toBeUndefined()
  })
})
