/** Host registration for the whale-girl companion preferences. */

import type { Context, Volatile } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import {
  COMPANION_INTERACTIONS, DEFAULT_COMPANION_ENABLED, DEFAULT_COMPANION_INTERACTION,
  type CompanionInteraction,
} from './companion-settings.ts'

export {
  COMPANION_ENABLED_FIELD, COMPANION_INTERACTION_FIELD, COMPANION_INTERACTIONS,
  COMPANION_SETTINGS_NAMESPACE, CompanionSettingsSchema, DEFAULT_COMPANION_ENABLED,
  DEFAULT_COMPANION_INTERACTION, DEFAULT_COMPANION_SETTINGS,
  type CompanionInteraction, type CompanionSettings,
} from './companion-settings.ts'

/** Live companion visibility and pointer-reaction preferences. */
export interface Config {
  /** Whether the character floats over the Web GUI. */
  enabled: Volatile<boolean>
  /** How the character reacts to the pointer. */
  interaction: Volatile<CompanionInteraction>
}

/** Configuration projected through the companion plugin's shared form. */
export const Config = z.object({
  enabled: z.boolean().default(DEFAULT_COMPANION_ENABLED).volatile(),
  interaction: z.union([...COMPANION_INTERACTIONS]).default(DEFAULT_COMPANION_INTERACTION).volatile(),
})

/**
 * Keep the companion fiber off generated settings pages; the browser half
 * reads the same entry through `ctx.configForms`.
 * @param ctx - Host context that may acquire the settings service.
 * @param config - validated live companion preferences (owned by the loader).
 */
export function apply(ctx: Context, config: Config): void {
  void config
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })
}
