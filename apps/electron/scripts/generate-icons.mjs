/**
 * Render application icons from the Web favicon for electron-builder.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const electronRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(electronRoot, '..', '..')
const faviconPath = join(repoRoot, 'apps', 'web', 'public', 'favicon.svg')
const outDir = join(electronRoot, 'build')

/** DeepSeek Harness shell background used behind the white mark. */
const BACKGROUND = { r: 15, g: 17, b: 23, alpha: 1 }

/**
 * @param {string} svg
 * @returns {string}
 */
function iconSvg(svg) {
  return svg
    .replace(/<style>[\s\S]*?<\/style>/u, '')
    .replace(/fill="#000"/gu, 'fill="#ffffff"')
    .replace(/fill-opacity="[^"]*"/gu, 'fill-opacity="1"')
}

/**
 * @param {string} svg
 * @param {number} size
 * @returns {Promise<Buffer>}
 */
async function renderIconSize(svg, size) {
  const logoScale = 0.68
  const logo = await sharp(Buffer.from(svg))
    .resize(Math.max(1, Math.round(size * logoScale)), Math.max(1, Math.round(size * logoScale)))
    .png()
    .toBuffer()
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer()
}

export async function generateIcons() {
  const rawSvg = await readFile(faviconPath, 'utf8')
  const svg = iconSvg(rawSvg)
  await mkdir(outDir, { recursive: true })

  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
  const rendered = new Map()
  for (const size of sizes) {
    rendered.set(size, await renderIconSize(svg, size))
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
