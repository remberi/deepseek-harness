/** Whale-girl companion preferences stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the companion plugin. */
export const COMPANION_SETTINGS_NAMESPACE = 'ui-companion'

/** Field carrying whether the character is shown over the Web GUI. */
export const COMPANION_ENABLED_FIELD = 'enabled'

/** Field carrying how the character reacts to the pointer. */
export const COMPANION_INTERACTION_FIELD = 'interaction'

/**
 * Pointer reactions accepted at settings boundaries: `click` answers a click
 * with a speech bubble, `hover` greets while the pointer rests on her, `follow`
 * leans her toward the pointer, and `none` keeps her idle.
 */
export const COMPANION_INTERACTIONS = ['click', 'hover', 'follow', 'none'] as const

/** One pointer reaction mode. */
export type CompanionInteraction = typeof COMPANION_INTERACTIONS[number]

/** The character stays hidden until a user opts in. */
export const DEFAULT_COMPANION_ENABLED = false

/** Default reaction once shown. */
export const DEFAULT_COMPANION_INTERACTION: CompanionInteraction = 'click'

/** Durable companion section shared by the Host schema and browser scope. */
export interface CompanionSettings {
  /** Whether the character floats over the Web GUI. */
  enabled: boolean
  /** How the character reacts to the pointer. */
  interaction: CompanionInteraction
}

/** Section value before Host settings arrive and without a settings provider. */
export const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  enabled: DEFAULT_COMPANION_ENABLED,
  interaction: DEFAULT_COMPANION_INTERACTION,
}

/** Durable companion schema; also the wire envelope the browser scope validates against. */
export const CompanionSettingsSchema: z<CompanionSettings> = z.object({
  [COMPANION_ENABLED_FIELD]: z.boolean().default(DEFAULT_COMPANION_ENABLED),
  [COMPANION_INTERACTION_FIELD]: z.union([...COMPANION_INTERACTIONS]).default(DEFAULT_COMPANION_INTERACTION),
})
