/**
 * Browser half of the Brand themes bundle.
 *
 * Provides two product-inspired palettes — `claude-code` (warm cream, terracotta
 * accent) and `gpt` (cool gray, green accent) — as token override layers on top
 * of the active `ui-theme` theme, and adds a "Brand themes" row to the General
 * settings section.
 *
 * The layer is scheme-aware: every alias token carries a light and a dark value,
 * so a brand theme follows the Appearance row (Light, Dark, or System) instead of
 * forcing one base palette. This also keeps the selection stable across settings
 * adoption, which a plugin-registered theme id does not survive because those ids
 * are outside the durable `ui-theme` schema. The choice is remembered in browser
 * storage and re-applied when the plugin loads.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-theme-claude-gpt',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PLUGIN_ID = '@local/dsh-theme-claude-gpt'
    const NAMESPACE = 'dsh-theme-claude-gpt'
    const SETTINGS_SLOT = 'settings.general.item'
    const ROW_ID = 'brand-themes'
    const ROW_ORDER = 12
    const STORAGE_KEY = `${PLUGIN_ID}:active`

    /** Row copy; every other locale falls back to English per key. */
    const DICTIONARIES = {
      en: {
        title: 'Brand themes',
        description: 'Product-inspired palettes from the Brand themes plugin; they follow the Light, Dark, or System appearance above.',
        'label.claudeCode': 'Claude Code',
        'label.gpt': 'GPT',
        'label.default': 'Built-in',
      },
      zh: {
        title: '品牌主题',
        description: '由「品牌主题」插件提供的产品风格配色，会跟随上方的浅色、深色或跟随系统外观。',
        'label.claudeCode': 'Claude Code',
        'label.gpt': 'GPT',
        'label.default': '内置',
      },
    }

    /**
     * Expand one role palette to the alias tokens every brand theme overrides,
     * so both themes cover the same token set in both schemes. Values follow the
     * `--dsw-*` alias layer from ui-theme.
     * @param {object} palette - role colors of one theme in one scheme.
     * @returns {Record<string, string>} token name to CSS value.
     */
    function paletteTokens(palette) {
      const wash = (alpha) => `rgba(${palette.ink}, ${alpha})`
      return {
        '--dsw-alias-bg-base': palette.canvas,
        '--dsw-alias-bg-layer-1': palette.surface,
        '--dsw-alias-bg-layer-2': palette.surfaceRaised,
        '--dsw-alias-bg-layer-3': palette.surfaceTop,
        '--dsw-alias-bg-overlay': palette.overlay,
        '--dsw-alias-bg-module-platform': palette.platform,
        '--dsw-alias-bg-multi-select': palette.platform,
        '--dsw-alias-border-l1': wash(0.06),
        '--dsw-alias-border-l2': wash(0.12),
        '--dsw-alias-border-l2-darkmode-thin': wash(0.08),
        '--dsw-alias-border-l3': wash(0.16),
        '--dsw-alias-border-l4': wash(0.2),
        '--dsw-alias-brand-primary': palette.accent,
        '--dsw-alias-brand-primary-invert': palette.accent,
        '--dsw-alias-brand-text': palette.accent,
        '--dsw-alias-button-primary-hover': palette.accentHover,
        '--dsw-alias-button-elevated-fill': palette.surfaceTop,
        '--dsw-alias-button-floating-fill': palette.surface,
        '--dsw-alias-button-floating-hover': palette.platform,
        '--dsw-alias-interactive-bg-hover': wash(0.08),
        '--dsw-alias-interactive-bg-hover-accent': wash(0.2),
        '--dsw-alias-interactive-bg-hover-solid': palette.platform,
        '--dsw-alias-interactive-bg-active': wash(0.14),
        '--dsw-alias-label-primary': palette.textPrimary,
        '--dsw-alias-label-secondary': palette.textSecondary,
        '--dsw-alias-label-tertiary': palette.textTertiary,
        '--dsw-alias-label-caption': palette.textCaption,
        '--dsw-alias-link': palette.accent,
        '--dsw-alias-markdown-code-block': palette.codeBlock,
        '--dsw-alias-markdown-code-block-banner': palette.codeBlock,
        '--dsw-alias-markdown-inline-code': palette.inlineCode,
        '--dsw-alias-markdown-placeholder': palette.platform,
        '--dsw-alias-markdown-tag': palette.platform,
        '--dsw-alias-state-business-primary': palette.accent,
        '--dsw-alias-state-business-tertiary': palette.accentSoft,
        '--dsw-specific-bubble': palette.bubble,
        '--dsw-specific-bubble-highlight': palette.bubbleHighlight,
        '--dsw-specific-input-major': palette.surface,
        '--dsw-specific-login-input': palette.platform,
        '--dsw-specific-selector': palette.platform,
        '--dsw-specific-sidebar-fill': palette.sidebar,
        '--dsw-specific-sidebar-nav-item-active': palette.sidebarActive,
        '--dsw-specific-sidebar-nav-item-active-accent': palette.accentSoft,
        '--dsw-specific-sidebar-nav-item-hover': palette.sidebarHover,
        '--dsw-specific-tip': palette.platform,
      }
    }

    /**
     * Fold one theme's light and dark palettes into the `{ light, dark }` pairs
     * the theme service requires, so neither scheme can lose a token.
     * @param {{ light: object, dark: object }} theme - role palettes by scheme.
     * @returns {Record<string, { light: string, dark: string }>} override pairs.
     */
    function overlayPairs(theme) {
      const light = paletteTokens(theme.light)
      const dark = paletteTokens(theme.dark)
      const pairs = {}
      for (const name of Object.keys(light)) pairs[name] = { light: light[name], dark: dark[name] }
      return pairs
    }

    /** One selectable brand theme: id, settings label, and override pairs. */
    function brandTheme(id, labelKey, light, dark) {
      return {
        id,
        labelKey,
        pairs: overlayPairs({ light, dark }),
      }
    }

    /** The brand themes, in settings-row order. */
    const THEMES = [
      brandTheme('claude-code', 'label.claudeCode', {
        canvas: 'rgb(250, 248, 245)',
        surface: 'rgb(255, 255, 253)',
        surfaceRaised: 'rgb(246, 241, 235)',
        surfaceTop: 'rgb(255, 255, 255)',
        overlay: 'rgb(255, 255, 255)',
        platform: 'rgb(243, 237, 230)',
        ink: '65, 48, 39',
        accent: 'rgb(171, 74, 43)',
        accentHover: 'rgb(145, 57, 31)',
        accentSoft: 'rgb(251, 230, 218)',
        textPrimary: 'rgb(41, 37, 32)',
        textSecondary: 'rgb(99, 88, 78)',
        textTertiary: 'rgb(112, 100, 89)',
        textCaption: 'rgb(112, 100, 89)',
        codeBlock: 'rgb(243, 239, 234)',
        inlineCode: 'rgb(246, 235, 227)',
        bubble: 'rgb(250, 233, 222)',
        bubbleHighlight: 'rgb(246, 219, 203)',
        sidebar: 'rgb(246, 242, 237)',
        sidebarActive: 'rgb(247, 224, 209)',
        sidebarHover: 'rgb(239, 231, 221)',
      }, {
        canvas: 'rgb(27, 26, 24)',
        surface: 'rgb(35, 33, 32)',
        surfaceRaised: 'rgb(44, 41, 39)',
        surfaceTop: 'rgb(52, 48, 45)',
        overlay: 'rgb(38, 35, 34)',
        platform: 'rgb(51, 47, 43)',
        ink: '230, 221, 210',
        accent: 'rgb(217, 119, 87)',
        accentHover: 'rgb(232, 140, 110)',
        accentSoft: 'rgb(70, 45, 36)',
        textPrimary: 'rgb(240, 235, 228)',
        textSecondary: 'rgb(190, 181, 170)',
        textTertiary: 'rgb(160, 152, 142)',
        textCaption: 'rgb(150, 142, 132)',
        codeBlock: 'rgb(40, 37, 34)',
        inlineCode: 'rgb(52, 44, 38)',
        bubble: 'rgb(60, 50, 44)',
        bubbleHighlight: 'rgb(74, 60, 52)',
        sidebar: 'rgb(30, 28, 26)',
        sidebarActive: 'rgb(62, 46, 39)',
        sidebarHover: 'rgb(48, 44, 40)',
      }),
      brandTheme('gpt', 'label.gpt', {
        canvas: 'rgb(247, 247, 248)',
        surface: 'rgb(255, 255, 255)',
        surfaceRaised: 'rgb(236, 236, 241)',
        surfaceTop: 'rgb(255, 255, 255)',
        overlay: 'rgb(255, 255, 255)',
        platform: 'rgb(236, 236, 241)',
        ink: '52, 53, 65',
        // OpenAI green adjusted until white-on-accent and accent-on-white stay readable.
        accent: 'rgb(13, 138, 107)',
        accentHover: 'rgb(10, 115, 89)',
        accentSoft: 'rgb(209, 240, 232)',
        textPrimary: 'rgb(52, 53, 65)',
        textSecondary: 'rgb(86, 88, 105)',
        textTertiary: 'rgb(108, 111, 133)',
        textCaption: 'rgb(120, 122, 134)',
        codeBlock: 'rgb(240, 240, 242)',
        inlineCode: 'rgb(236, 236, 241)',
        bubble: 'rgb(236, 236, 241)',
        bubbleHighlight: 'rgb(224, 224, 230)',
        sidebar: 'rgb(247, 247, 248)',
        sidebarActive: 'rgb(232, 232, 236)',
        sidebarHover: 'rgb(240, 240, 242)',
      }, {
        canvas: 'rgb(33, 33, 33)',
        surface: 'rgb(47, 47, 47)',
        surfaceRaised: 'rgb(56, 56, 56)',
        surfaceTop: 'rgb(66, 66, 66)',
        overlay: 'rgb(47, 47, 47)',
        platform: 'rgb(56, 56, 56)',
        ink: '236, 236, 241',
        accent: 'rgb(16, 163, 127)',
        accentHover: 'rgb(25, 195, 125)',
        accentSoft: 'rgb(29, 75, 65)',
        textPrimary: 'rgb(236, 236, 236)',
        textSecondary: 'rgb(180, 180, 180)',
        textTertiary: 'rgb(154, 154, 154)',
        textCaption: 'rgb(142, 142, 142)',
        codeBlock: 'rgb(47, 47, 47)',
        inlineCode: 'rgb(56, 56, 56)',
        bubble: 'rgb(48, 48, 48)',
        bubbleHighlight: 'rgb(58, 58, 58)',
        sidebar: 'rgb(23, 23, 23)',
        sidebarActive: 'rgb(47, 47, 47)',
        sidebarHover: 'rgb(38, 38, 38)',
      }),
    ]

    const THEME_IDS = THEMES.map(theme => theme.id)

    /** Styles for the settings row; injected for the plugin's lifetime. */
    const STYLES = [
      '.dsh-brand-theme-group { display: flex; flex-direction: column; gap: 8px; padding: 16px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }',
      '.dsh-brand-theme-heading { display: flex; flex-direction: column; gap: 2px; }',
      '.dsh-brand-theme-title { font-size: 14px; font-weight: 400; line-height: 22px; color: var(--dsw-alias-label-primary); }',
      '.dsh-brand-theme-description { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }',
      '.dsh-brand-theme-cubes { display: flex; align-items: stretch; gap: 8px; flex-wrap: wrap; }',
      '.dsh-brand-theme-cube { box-sizing: border-box; flex: 1 1 160px; display: flex; align-items: center; justify-content: center; padding: 16px 24px; border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-xl); background: transparent; font: inherit; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary); cursor: pointer; }',
      '@media (hover: hover) { .dsh-brand-theme-cube:hover:not(.dsh-brand-theme-cube-selected) { background: var(--dsw-alias-interactive-bg-hover); } }',
      '.dsh-brand-theme-cube-selected { background: var(--dsw-alias-bg-module-platform); border-color: var(--dsw-static-neutral-bluish-400); }',
      '@media (max-width: 767px) { html:not([data-windows-titlebar]):not([data-platform=\'darwin\']) .dsh-brand-theme-cube { flex: 1 1 0; padding: 12px 6px; } }',
    ].join('\n')

    /**
     * Read the remembered brand theme id.
     * @returns {string | null} the stored id, or null when storage is empty or denied.
     */
    function readStoredTheme() {
      try {
        return localStorage.getItem(STORAGE_KEY)
      } catch (error) {
        // Private modes can deny storage; the selection then lasts the page session.
        console.debug(`${PLUGIN_ID}: reading the stored theme failed`, error)
        return null
      }
    }

    /**
     * Remember the selected brand theme, or clear the memory when the built-in
     * appearance is selected.
     * @param {string | null} id - brand theme id, or null to forget it.
     */
    function writeStoredTheme(id) {
      try {
        if (id === null) localStorage.removeItem(STORAGE_KEY)
        else localStorage.setItem(STORAGE_KEY, id)
      } catch (error) {
        console.debug(`${PLUGIN_ID}: storing the selected theme failed`, error)
      }
    }

    /**
     * Subscribe/read store for the settings row; holds the selected brand theme
     * id (null for the built-in appearance).
     * @param {string | null} initial - selection at plugin load.
     */
    function createStore(initial) {
      let state = initial
      const listeners = new Set()
      return {
        getSnapshot: () => state,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        set: (next) => {
          if (next === state) return
          state = next
          for (const listener of [...listeners]) listener()
        },
      }
    }

    const store = createStore(null)

    /** Disposer of the live override layer, if a brand theme is selected. */
    let overrideDispose = null

    /** Applies the selection in this page; persistence is the caller's concern. */
    let renderBrandTheme = () => {}

    /** One settings cube: label and pressed state. */
    function Cube({ id, label, selected, onSelect }) {
      return h('button', {
        type: 'button',
        className: selected ? 'dsh-brand-theme-cube dsh-brand-theme-cube-selected' : 'dsh-brand-theme-cube',
        'aria-pressed': selected,
        onClick: () => { onSelect(id) },
      }, label)
    }

    /**
     * General settings row listing the brand themes and the built-in appearance.
     * Selection is this plugin's own state; the Appearance row above decides the
     * light or dark scheme the selected palette follows.
     * @param {object} props - slot props, including the bound `t`.
     */
    function BrandThemeRow({ t }) {
      const active = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
      return h('div', { className: 'dsh-brand-theme-group' },
        h('div', { className: 'dsh-brand-theme-heading' },
          h('div', { className: 'dsh-brand-theme-title' }, t('title')),
          h('div', { className: 'dsh-brand-theme-description' }, t('description'))),
        h('div', { className: 'dsh-brand-theme-cubes' },
          THEMES.map(theme => h(Cube, {
            key: theme.id,
            id: theme.id,
            label: t(theme.labelKey),
            selected: active === theme.id,
            // Clicking the selected cube returns to the built-in appearance.
            onSelect: selectBrandTheme,
          })),
          h(Cube, {
            key: 'default',
            id: null,
            label: t('label.default'),
            selected: active === null,
            onSelect: selectBrandTheme,
          })))
    }

    /** Selects a brand theme, or the built-in appearance for null. */
    let selectBrandTheme = () => {}

    return {
      inject: ['theme', 'slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          if (typeof document === 'undefined') return () => {}
          const tag = document.createElement('style')
          tag.dataset.plugin = PLUGIN_ID
          tag.dataset.pluginCss = `${PLUGIN_ID}/brand-themes.css`
          tag.textContent = STYLES
          document.head.appendChild(tag)
          return () => { tag.remove() }
        }, `${PLUGIN_ID}: styles`)

        ctx.effect(() => ctx.locale.register(NAMESPACE, { en: DICTIONARIES.en, zh: DICTIONARIES.zh }),
          `${PLUGIN_ID}: dictionaries`)

        // The override layer rides the active theme; disposing the plugin
        // retracts it, and the next selection replaces it in place.
        ctx.effect(() => () => {
          overrideDispose?.()
          overrideDispose = null
        }, `${PLUGIN_ID}: theme layer`)

        renderBrandTheme = (id) => {
          const theme = id === null ? undefined : THEMES.find(candidate => candidate.id === id)
          overrideDispose?.()
          overrideDispose = null
          store.set(theme === undefined ? null : theme.id)
          if (theme === undefined) return
          overrideDispose = ctx.theme.overrideTokens(PLUGIN_ID, theme.pairs)
        }

        selectBrandTheme = (id) => {
          const next = id === store.getSnapshot() ? null : id
          renderBrandTheme(next)
          writeStoredTheme(next)
        }

        // Restore the remembered selection; the layer composes over whichever
        // built-in preference the Appearance row holds.
        const stored = readStoredTheme()
        renderBrandTheme(stored !== null && THEME_IDS.includes(stored) ? stored : null)

        // Other tabs share the same storage; follow their selection live.
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          ctx.effect(() => {
            const onStorage = (event) => {
              if (event.key !== STORAGE_KEY) return
              const value = event.newValue
              renderBrandTheme(value !== null && THEME_IDS.includes(value) ? value : null)
            }
            window.addEventListener('storage', onStorage)
            return () => { window.removeEventListener('storage', onStorage) }
          }, `${PLUGIN_ID}: cross-tab selection`)
        }

        ctx.slots.inject(SETTINGS_SLOT, () => ctx.slots.register({
          name: SETTINGS_SLOT,
          id: ROW_ID,
          order: ROW_ORDER,
          locale: NAMESPACE,
        }, BrandThemeRow))
      },
    }
  },
})
