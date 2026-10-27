/**
 * Browser half of the Account balance bundle.
 *
 * Adds one row to the sidebar account menu, between the shipped Settings and
 * Feedback rows, that shows the remaining topped-up balance and opens the
 * Platform top-up page in a new tab. The row registers into the account menu's
 * `settings.launcher.menu.item` list slot, which the shipped account plugin
 * declares, so no account code is imported here.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-account-balance',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { MenuItemButton, IconRightUpOutlineRegular } = require('@deepseek-ai/dsh-client-ui-primitives')

    const PLUGIN_ID = '@local/dsh-account-balance'
    const NAMESPACE = 'dsh-account-balance'
    const MENU_ITEM_SLOT = 'settings.launcher.menu.item'
    const ROW_ID = 'account-balance'
    const ROW_ORDER = 0

    /** Row copy; every other locale falls back to English per key. */
    const DICTIONARIES = {
      en: {
        balance: 'Balance',
      },
      zh: {
        balance: '余额',
      },
    }

    /** Styles for the row; injected for the plugin's lifetime. */
    const STYLES = [
      '.dsh-account-balance-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; width: 100%; }',
      '.dsh-account-balance-amount { font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-primary); }',
    ].join('\n')

    /**
     * One account-menu row: the balance label plus the amount at the right.
     * @param {object} props - account facts, the menu dismissal, and the bound `t`.
     * @returns {object | null} the row, or null when the account is signed out.
     */
    function AccountBalanceRow(props) {
      if (!props.signedIn) return null
      return h(MenuItemButton, {
        icon: h(IconRightUpOutlineRegular, { size: 16 }),
        disabled: props.topUpUrl === undefined,
        onSelect: () => {
          props.close()
          if (props.topUpUrl !== undefined) window.open(props.topUpUrl, '_blank', 'noopener,noreferrer')
        },
      }, h('span', { className: 'dsh-account-balance-row' },
        props.t('balance'),
        h('span', { className: 'dsh-account-balance-amount' }, props.balanceText ?? '—')))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => {
          if (typeof document === 'undefined') return () => {}
          const tag = document.createElement('style')
          tag.dataset.plugin = PLUGIN_ID
          tag.dataset.pluginCss = `${PLUGIN_ID}/account-balance.css`
          tag.textContent = STYLES
          document.head.appendChild(tag)
          return () => { tag.remove() }
        }, `${PLUGIN_ID}: styles`)

        ctx.effect(() => ctx.locale.register(NAMESPACE, { en: DICTIONARIES.en, zh: DICTIONARIES.zh }),
          `${PLUGIN_ID}: dictionaries`)

        ctx.slots.inject(MENU_ITEM_SLOT, () => ctx.slots.register({
          name: MENU_ITEM_SLOT,
          id: ROW_ID,
          order: ROW_ORDER,
          locale: NAMESPACE,
        }, AccountBalanceRow))
      },
    }
  },
})
