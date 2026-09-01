/**
 * Render application icons from the shared Web PNG for electron-builder.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const electronRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(electronRoot, '..', '..')
const iconSourcePath = join(repoRoot, 'apps', 'web', 'public', 'app-icon.png')
const outDir = join(electronRoot, 'build')

/**
 * @param {number} size
 * @returns {Promise<Buffer>}
 */
async function renderIconSize(size) {
  return sharp(await readFile(iconSourcePath))
    .resize(size, size, { fit: 'cover' })
    .png()
    .toBuffer()
}

export async function generateIcons() {
  await mkdir(outDir, { recursive: true })

  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
  const rendered = new Map()
  for (const size of sizes) {
    rendered.set(size, await renderIconSize(size))
  }

  await writeFile(join(outDir, 'icon.png'), rendered.get(1024))
  const icoSizes = [16, 32, 48, 64, 128, 256]
  const ico = await toIco(icoSizes.map(size => rendered.get(size)))
  await writeFile(join(outDir, 'icon.ico'), ico)

  console.log(`generate-icons: wrote ${join(outDir, 'icon.png')} and icon.ico`)
}

const invokedDirectly = process.argv[1] !== undefined
  && fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(process.argv[1]))

if (invokedDirectly) {
  await generateIcons()
}
