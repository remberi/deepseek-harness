/**
 * Electron main process: spawn `dsh web` and load the local Web UI in a window.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog, nativeImage, shell, type NativeImage } from 'electron'

const ELECTRON_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = join(ELECTRON_ROOT, '..', '..')

const URL_LINE = /dsh web:\s+(https?:\/\/\S+)/u

let dshProcess: ChildProcess | undefined
let mainWindow: BrowserWindow | undefined

/** Repository checkout root when running from source; packaged resources otherwise. */
function harnessRoot(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'harness')
  return REPO_ROOT
}

/**
 * Electron's embedded Node is the runtime that `dsh web` inherits through
 * `ELECTRON_RUN_AS_NODE`. It must match the harness `engines.node` floor
 * (`^22.19.0 || >=24.0.0`); Node 22.14 and earlier lack the `node:zlib`
 * zstd APIs session persistence imports.
 */
function assertHarnessNode(): void {
  const version = process.versions.node
  const [majorRaw, minorRaw] = version.split('.')
  const major = Number(majorRaw)
  const minor = Number(minorRaw)
  if ((major === 22 && minor >= 19) || major >= 24) return
  throw new Error(
    `dsh-electron: Node ${version} is below ^22.19.0 || >=24.0.0; Electron must ship Node 22.19+ or 24+ (Electron 44.1 ships Node 24.19)`,
  )
}

function failBoot(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`dsh-electron: ${message}`)
  dialog.showErrorBox('DeepSeek Harness', message)
  app.exit(1)
}

/** Resolve how to launch `dsh web` for the current layout. */
function resolveDshLaunch(root: string): { readonly nodeArgs: readonly string[]; readonly dshArgs: readonly string[] } {
  const webArgs = ['web', '--no-open', '--port', '0'] as const
  const packagedBin = join(root, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  if (existsSync(packagedBin)) return { nodeArgs: [packagedBin], dshArgs: webArgs }

  const builtBin = join(root, 'apps', 'cli', 'lib', 'bin.js')
  if (existsSync(builtBin)) return { nodeArgs: [builtBin], dshArgs: webArgs }

  const sourceBin = join(root, 'apps', 'cli', 'src', 'bin.ts')
  if (existsSync(sourceBin)) {
    return { nodeArgs: ['--import', 'tsx/esm', sourceBin], dshArgs: webArgs }
  }

  throw new Error('dsh-electron: could not locate dsh; run `pnpm run build` from the repository root')
}

/** Wait until the harness prints its startup URL or the child exits. */
function waitForWebUrl(child: ChildProcess): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const onData = (chunk: Buffer | string, sink: 'out' | 'err'): void => {
      const text = String(chunk)
      if (sink === 'out') {
        stdout += text
        process.stdout.write(text)
      } else {
        stderr += text
        process.stderr.write(text)
      }
      const match = URL_LINE.exec(stdout)
      if (match?.[1] !== undefined) {
        cleanup()
        resolve(match[1])
      }
    }
    const onStdout = (chunk: Buffer | string): void => { onData(chunk, 'out') }
    const onStderr = (chunk: Buffer | string): void => { onData(chunk, 'err') }
    const onError = (error: Error): void => {
      cleanup()
      reject(error)
    }
    const onClose = (code: number | null): void => {
      cleanup()
      const detail = stderr.trim() || stdout.trim()
      reject(new Error(
        code === null
          ? `dsh web exited before announcing a URL${detail === '' ? '' : `: ${detail}`}`
          : `dsh web exited with code ${String(code)}${detail === '' ? '' : `: ${detail}`}`,
      ))
    }
    const cleanup = (): void => {
      child.stdout?.off('data', onStdout)
      child.stderr?.off('data', onStderr)
      child.off('error', onError)
      child.off('close', onClose)
    }
    child.stdout?.on('data', onStdout)
    child.stderr?.on('data', onStderr)
    child.on('error', onError)
    child.on('close', onClose)
  })
}

/** Spawn `dsh web --no-open` using Electron's embedded Node runtime. */
async function startDshWeb(): Promise<string> {
  assertHarnessNode()
  const root = harnessRoot()
  const { nodeArgs, dshArgs } = resolveDshLaunch(root)
  const child = spawn(
    process.execPath,
    // Cordis HMR reads Node's internal ESM loader; without this flag the web
    // profile prints its URL then exits when the HMR plugin loads.
    ['--expose-internals', ...nodeArgs, ...dshArgs],
    {
      cwd: root,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  dshProcess = child
  return waitForWebUrl(child)
}

function stopDshWeb(): void {
  const child = dshProcess
  dshProcess = undefined
  if (child === undefined || child.killed) return
  child.kill('SIGTERM')
}

function windowIcon(): NativeImage | undefined {
  const iconPath = process.platform === 'win32'
    ? join(ELECTRON_ROOT, 'build', 'icon.ico')
    : join(ELECTRON_ROOT, 'build', 'icon.png')
  if (!existsSync(iconPath)) return undefined
  const image = nativeImage.createFromPath(iconPath)
  return image.isEmpty() ? undefined : image
}

function createMainWindow(url: string): BrowserWindow {
  const icon = windowIcon()
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'DeepSeek Harness',
    ...(icon === undefined ? {} : { icon }),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(ELECTRON_ROOT, 'lib', 'preload.js'),
    },
  })
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    void shell.openExternal(target)
    return { action: 'deny' }
  })
  void window.loadURL(url)
  return window
}

async function boot(): Promise<void> {
  const url = await startDshWeb()
  mainWindow = createMainWindow(url)
  mainWindow.on('closed', () => {
    mainWindow = undefined
    stopDshWeb()
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow !== undefined) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    boot().catch(failBoot)
  })

  app.on('window-all-closed', () => {
    stopDshWeb()
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    stopDshWeb()
  })

  app.on('activate', () => {
    if (mainWindow === undefined && BrowserWindow.getAllWindows().length === 0) {
      void boot().catch(failBoot)
    }
  })
}
