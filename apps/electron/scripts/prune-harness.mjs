/**
 * Remove development artifacts and foreign-platform payloads from a deployed dsh
 * closure before electron-builder copies it into extraResources.
 */
import { readdir, rm, stat } from 'node:fs/promises'
import { join, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Directory names safe to drop anywhere under node_modules. */
const DROP_DIR_NAMES = new Set([
  'tests',
  'test',
  '__tests__',
  'coverage',
  '.github',
  'snapshots',
  'website',
  '.agents',
  'examples',
  '.turbo',
  '.cache',
])

/** Package name substrings to drop on the current host platform. */
const FOREIGN_PLATFORM_PACKAGES = {
  win32: [
    'node-addon-landlock-run-linux',
    'claude-agent-sdk-darwin',
    'claude-agent-sdk-linux',
    'claude-agent-sdk-win32-arm64',
    'codex-darwin',
    'codex-linux',
    'codex-win32-arm64',
    'node-addon-require-builtin-darwin',
    'node-addon-require-builtin-linux',
    'node-addon-require-builtin-win32-arm64',
    'node-addon-require-builtin-win32-ia32',
  ],
  darwin: [
    'node-addon-landlock-run-linux',
    'claude-agent-sdk-linux',
    'claude-agent-sdk-win32',
    'codex-linux',
    'codex-win32',
    'node-addon-require-builtin-linux',
    'node-addon-require-builtin-win32',
  ],
  linux: [
    'claude-agent-sdk-darwin',
    'claude-agent-sdk-win32',
    'codex-darwin',
    'codex-win32',
    'node-addon-require-builtin-darwin',
    'node-addon-require-builtin-win32',
  ],
}

/**
 * @param {string} root
 * @returns {Promise<{ removedFiles: number; removedBytes: number; removedDirs: number }>}
 */
export async function pruneHarness(root) {
  let removedFiles = 0
  let removedBytes = 0
  let removedDirs = 0

  const foreignPackages = FOREIGN_PLATFORM_PACKAGES[process.platform] ?? []

  async function dropPath(path) {
    const metadata = await stat(path)
    removedBytes += metadata.size
    if (metadata.isDirectory()) {
      await rm(path, { recursive: true, force: true })
      removedDirs += 1
    } else {
      await rm(path, { force: true })
      removedFiles += 1
    }
  }

  function shouldDropFile(name, parentDir) {
    if (name.endsWith('.map')) return true
    if (name.endsWith('.d.ts') || name.endsWith('.d.ts.map')) return true
    if (name.endsWith('.tsbuildinfo')) return true
    if (/\.(spec|test)\.(js|mjs|cjs)$/iu.test(name)) return true
    if (name === 'README.md' || name === 'README.zh.md' || name === 'README.i18n.yaml') return true
    if (name.startsWith('CHANGELOG')) return true
    if (name === 'tsconfig.json' || name === 'tsdown.config.ts' || name === 'vitest.config.ts') return true
    if (parentDir.endsWith(`${sep}src`) || parentDir.includes(`${sep}src${sep}`)) {
      if (name.endsWith('.ts') || name.endsWith('.tsx')) return true
    }
    return false
  }

  async function walk(directory) {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }

    const relative = directory.slice(root.length + 1)
    const packageMatch = relative.match(/^node_modules\/(@[^/]+\/[^/]+|[^/]+)/u)
    if (packageMatch !== null) {
      const packageName = packageMatch[1]
      if (foreignPackages.some(marker => packageName.includes(marker))) {
        await dropPath(directory)
        return
      }
    }

    for (const entry of entries) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        if (DROP_DIR_NAMES.has(entry.name)) {
          await dropPath(path)
          continue
        }
        if (entry.name === 'src' && directory.endsWith(`${sep}node_modules${sep}koffi`)) {
          await walk(path)
          continue
        }
        if (entry.name === 'src') {
          const libDir = join(directory, 'lib')
          try {
            const libStat = await stat(libDir)
            if (libStat.isDirectory()) {
              await dropPath(path)
              continue
            }
          } catch {
            // keep src when no compiled lib/ exists
          }
        }
        await walk(path)
        continue
      }
      if (shouldDropFile(entry.name, directory)) {
        await dropPath(path)
      }
    }
  }

  await walk(root)

  return { removedFiles, removedBytes, removedDirs }
}

/**
 * @param {string} harnessRoot
 */
export async function main(harnessRoot) {
  const { removedFiles, removedBytes, removedDirs } = await pruneHarness(harnessRoot)
  const mib = (removedBytes / (1024 * 1024)).toFixed(1)
  console.log(
    `prune-harness: removed ${String(removedFiles)} file(s), ${String(removedDirs)} dir(s), ~${mib} MiB`,
  )
}

const invokedDirectly = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(process.argv[1]))

if (invokedDirectly) {
  const target = process.argv[2]
  if (target === undefined || target === '') {
    console.error('usage: node prune-harness.mjs <harness-root>')
    process.exit(1)
  }
  await main(target)
}
