/**
 * Stage a portable `dsh` install for electron-builder extraResources.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateIcons } from './generate-icons.mjs'
import { main as pruneHarness } from './prune-harness.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const target = join(repoRoot, 'apps/electron/resources/harness')
const builtCli = join(repoRoot, 'apps/cli/lib/bin.js')

/**
 * @param {readonly string[]} args
 * @param {string} cwd
 */
function runPnpm(args, cwd) {
  const execpath = process.env.npm_execpath
  const fromPnpmJs = execpath !== undefined && execpath !== '' && /pnpm\.[cm]?js$/iu.test(execpath)
  const result = fromPnpmJs
    ? spawnSync(process.execPath, [execpath, ...args], { cwd, stdio: 'inherit' })
    : spawnSync('corepack', ['pnpm', ...args], { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) {
    const launcher = fromPnpmJs ? 'pnpm' : 'corepack pnpm'
    throw new Error(`prepare-resources: ${launcher} ${args.join(' ')} exited with ${String(result.status ?? result.signal)}`)
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

if (!existsSync(builtCli)) {
  console.log('prepare-resources: building repository artifacts…')
  runPnpm(['-w', 'run', 'build'], repoRoot)
}

await generateIcons()

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })

console.log(`prepare-resources: deploying dsh-electron-runtime-closure to ${target}`)
runPnpm([
  '--filter',
  'dsh-electron-runtime-closure',
  'deploy',
  '--legacy',
  '--prod',
  '--config.node-linker=hoisted',
  '--config.auto-install-peers=false',
  '--config.link-workspace-packages=true',
  target,
], repoRoot)

const deployedBin = join(target, 'node_modules/@deepseek-ai/dsh/lib/bin.js')
if (!existsSync(deployedBin)) {
  throw new Error('prepare-resources: deploy did not produce @deepseek-ai/dsh/lib/bin.js')
}

const before = directorySize(target)
await pruneHarness(target)
const after = directorySize(target)
const saved = ((before - after) / (1024 * 1024)).toFixed(1)
console.log(`prepare-resources: harness payload ~${(after / (1024 * 1024)).toFixed(1)} MiB (saved ~${saved} MiB)`)
console.log('prepare-resources: done')
