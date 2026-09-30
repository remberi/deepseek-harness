/**
 * Stage a portable `dsh` install for electron-builder extraResources.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateIcons } from './generate-icons.mjs'
import { main as pruneHarness } from './prune-harness.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const target = join(repoRoot, 'apps/electron/resources/harness')
const builtCli = join(repoRoot, 'apps/cli/lib/bin.js')
const APP_RUNTIME_PACKAGES = new Set(['@deepseek-ai/dsh', '@deepseek-ai/dsh-web-frontend'])
const REQUIRED_HARNESS_FILES = [
  '@deepseek-ai/dsh/lib/bin.js',
  '@deepseek-ai/dsh-web-frontend/dist/index.html',
  '@deepseek-ai/dsh-web-app/package.json',
  '@deepseek-ai/dsh-base/package.json',
]

/**
 * Electron's extraResources Node is the same runtime `dsh web` will use.
 * pnpm 11 also refuses Node below 22.13, and the harness floor is 22.19.
 */
function assertSupportedNode() {
  const version = process.versions.node
  const [majorRaw, minorRaw] = version.split('.')
  const major = Number(majorRaw)
  const minor = Number(minorRaw)
  if ((major === 22 && minor >= 19) || major >= 24) return
  throw new Error(
    `prepare-resources: Node ${version} is below ^22.19.0 || >=24.0.0; switch with nvm to 22.19+ or 24+ before packaging`,
  )
}

/**
 * @param {readonly string[]} args
 * @param {string} cwd
 */
function runPnpm(args, cwd) {
  const execpath = process.env.npm_execpath
  const fromPnpmJs = execpath !== undefined && execpath !== '' && /pnpm\.[cm]?js$/iu.test(execpath)
  const registry = process.env.npm_config_registry
  const registryArgs = registry !== undefined && registry !== '' ? ['--registry', registry] : []
  const result = fromPnpmJs
    ? spawnSync(process.execPath, [execpath, ...registryArgs, ...args], { cwd, stdio: 'inherit', env: process.env })
    : spawnSync('corepack', ['pnpm', ...registryArgs, ...args], { cwd, stdio: 'inherit', shell: process.platform === 'win32', env: process.env })
  if (result.status !== 0) {
    const launcher = fromPnpmJs ? 'pnpm' : 'corepack pnpm'
    throw new Error(`prepare-resources: ${launcher} ${[...registryArgs, ...args].join(' ')} exited with ${String(result.status ?? result.signal)}`)
  }
}

/**
 * @param {string} directory
 * @returns {number}
 */
function directorySize(directory) {
  let total = 0
  for (const entry of readdirSyncSafe(directory)) {
    const path = join(directory, entry.name)
    const metadata = statSync(path)
    if (metadata.isDirectory()) total += directorySize(path)
    else total += metadata.size
  }
  return total
}

/**
 * @param {string} directory
 * @returns {import('node:fs').Dirent[]}
 */
function readdirSyncSafe(directory) {
  try {
    return readdirSync(directory, { withFileTypes: true })
  } catch {
    return []
  }
}

/**
 * @returns {Array<[string, string]>}
 */
function packagesFromFlatRoot(root) {
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap((entry) => {
      const source = join(root, entry.name)
      const manifestPath = join(source, 'package.json')
      if (!existsSync(manifestPath)) return []
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
      if (typeof manifest.name !== 'string' || manifest.name === '') {
        throw new Error(`prepare-resources: ${manifestPath} has no package name`)
      }
      return [[manifest.name, source]]
    })
}

/**
 * @returns {Array<[string, string]>}
 */
function packagesFromGroupedRoot(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap((group) => packagesFromFlatRoot(join(root, group.name)))
}

/**
 * @returns {Array<[string, string]>}
 */
function sourceRuntimePackages() {
  return [
    ...packagesFromFlatRoot(join(repoRoot, 'vendor')),
    ...packagesFromGroupedRoot(join(repoRoot, 'packages')),
    ...packagesFromFlatRoot(join(repoRoot, 'apps')).filter(([name]) => APP_RUNTIME_PACKAGES.has(name)),
    ...packagesFromFlatRoot(join(repoRoot, 'native/system/packages')),
  ]
}

function assertHarnessArtifacts() {
  for (const relative of REQUIRED_HARNESS_FILES) {
    const path = join(target, 'node_modules', ...relative.split('/'))
    if (!existsSync(path)) {
      throw new Error(`prepare-resources: missing ${path} after deploy`)
    }
  }
}

assertSupportedNode()

if (!existsSync(builtCli)) {
  console.log('prepare-resources: building repository artifacts…')
  runPnpm(['-w', 'run', 'build'], repoRoot)
}

await generateIcons()

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })

console.log(`prepare-resources: deploying dsh-electron-runtime-closure to ${target}`)
const workspaceStatePath = join(repoRoot, 'node_modules/.pnpm-workspace-state-v1.json')
const workspaceState = existsSync(workspaceStatePath) ? readFileSync(workspaceStatePath) : undefined
try {
  runPnpm([
    '--filter',
    'dsh-electron-runtime-closure',
    'deploy',
    '--legacy',
    '--prod',
    '--config.node-linker=hoisted',
    '--config.auto-install-peers=false',
    '--config.link-workspace-packages=true',
    // The workspace osx-sign patch is for apps/desktop signing, not this closure.
    '--config.allowUnusedPatches=true',
    target,
  ], repoRoot)
} finally {
  // `pnpm deploy --prod` rewrites the workspace installer state as production/hoisted.
  if (workspaceState !== undefined) writeFileSync(workspaceStatePath, workspaceState)
}

const deployedBin = join(target, 'node_modules/@deepseek-ai/dsh/lib/bin.js')
if (!existsSync(deployedBin)) {
  throw new Error('prepare-resources: deploy did not produce @deepseek-ai/dsh/lib/bin.js')
}

for (const [packageName, source] of sourceRuntimePackages()) {
  const destination = join(target, 'node_modules', ...packageName.split('/'))
  rmSync(destination, { recursive: true, force: true })
  cpSync(source, destination, {
    recursive: true,
    filter: path => !path.split(sep).includes('node_modules'),
  })
  console.log(`prepare-resources: copied ${packageName}`)
}

assertHarnessArtifacts()

const before = directorySize(target)
await pruneHarness(target)
const after = directorySize(target)
const saved = ((before - after) / (1024 * 1024)).toFixed(1)
console.log(`prepare-resources: harness payload ~${(after / (1024 * 1024)).toFixed(1)} MiB (saved ~${saved} MiB)`)
console.log('prepare-resources: done')
