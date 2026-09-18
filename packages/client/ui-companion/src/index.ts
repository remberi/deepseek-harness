/** Host registration for the whale-girl companion preferences. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import { COMPANION_SETTINGS_NAMESPACE, CompanionSettingsSchema } from './companion-settings.ts'

export {
  COMPANION_ENABLED_FIELD, COMPANION_INTERACTION_FIELD, COMPANION_INTERACTIONS,
  COMPANION_SETTINGS_NAMESPACE, DEFAULT_COMPANION_ENABLED, DEFAULT_COMPANION_INTERACTION,
  DEFAULT_COMPANION_SETTINGS, type CompanionInteraction, type CompanionSettings,
} from './companion-settings.ts'

/**
 * Register the durable companion section when the optional settings service is
 * composed; without a provider the browser half keeps the section process-local.
 * @param ctx - Host context that may acquire the settings service.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(COMPANION_SETTINGS_NAMESPACE, CompanionSettingsSchema)
  })
}
