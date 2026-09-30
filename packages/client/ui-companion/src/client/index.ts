/**
 * Whale-girl companion, browser half: the Host-backed preference policy with
 * its browser-local artwork and position, the Settings page that edits them,
 * and the draggable character floating in the shell overlay.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: declares the `shell.overlay` seat the character registers into.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { COMPANION_SETTINGS_NAMESPACE, type CompanionSettings } from '../companion-settings.ts'
import { CompanionOverlay, type CompanionOverlayInjected } from './CompanionOverlay.tsx'
import { CompanionPolicy } from './companion-policy.ts'
import { CompanionSection, type CompanionSectionInjected } from './CompanionSection.tsx'
import { en, zh, type CompanionLocaleKey } from './locales.ts'

export type { CompanionOverlayInjected, CompanionOverlayProps } from './CompanionOverlay.tsx'
export type { CompanionSectionInjected, CompanionSectionProps } from './CompanionSection.tsx'
export type { CompanionLocaleKey } from './locales.ts'
export type { CompanionLocalState, CompanionPosition } from './companion-local.ts'
export type { CompanionInteraction, CompanionSettings } from '../companion-settings.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Whale-girl Settings page and character copy. */
    'settings.companion': CompanionLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'settings.companion'

/** Services required by the configuration form and both registrations. */
export const inject = ['slots', 'locale', 'configForms']

/**
 * Bind the companion preferences and contribute the Settings page and the
 * floating character.
 * @param ctx - the plugin's Client context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-companion: dictionaries')

  const t = ctx.locale.bind(NS)
  const policy = new CompanionPolicy(
    ctx.configForms.get<CompanionSettings>(COMPANION_SETTINGS_NAMESPACE),
  )

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'companion',
    order: 22,
    label: () => t('nav'),
    locale: NS,
    inject: (): CompanionSectionInjected => ({
      hooks: { companion: policy.settings, local: policy.local },
      setEnabled: (enabled) => { policy.setEnabled(enabled) },
      setInteraction: (interaction) => { policy.setInteraction(interaction) },
      setArtwork: (artwork) => { policy.setArtwork(artwork) },
      resetPosition: () => { policy.setPosition(null) },
    }),
  }, CompanionSection))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'companion',
    locale: NS,
    inject: (): CompanionOverlayInjected => ({
      hooks: { companion: policy.settings, local: policy.local },
      setPosition: (position) => { policy.setPosition(position) },
    }),
  }, CompanionOverlay))
}
