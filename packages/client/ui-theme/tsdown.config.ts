import { clientBundle } from '../tsdown.client.ts'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const bundle = clientBundle(
  '@deepseek-ai/dsh-client-ui-theme',
  ['lib/types/index.js'],
  {
    lib: {
      copy: [{
        from: 'src/styles/{brand-font.css,montserrat-*.woff2,Montserrat-OFL.txt}',
        to: 'lib/styles',
      }],
    },
  },
)

const codexLogo = fileURLToPath(new URL('./src/client/assets/codex-logo.png', import.meta.url))

export default ((options) => bundle(options).map(config => ({
  ...config,
  plugins: [...(config.plugins ?? []), {
    name: 'theme-product-mark',
    resolveId(source: string) {
      return source === './assets/codex-logo.png' ? codexLogo : null
    },
    async load(id: string) {
      if (id !== codexLogo) return null
      this.addWatchFile(codexLogo)
      const image = await readFile(codexLogo)
      return `export default ${JSON.stringify(`data:image/png;base64,${image.toString('base64')}`)}`
    },
  }],
}))) satisfies typeof bundle
