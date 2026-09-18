/** Durable companion section: defaults, accepted reactions, refused values, Host registration. */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import {
  COMPANION_INTERACTIONS, COMPANION_SETTINGS_NAMESPACE, CompanionSettingsSchema, DEFAULT_COMPANION_SETTINGS,
} from '../src/companion-settings.ts'
import { apply as hostApply } from '../src/index.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  protected load(): Promise<Record<string, unknown>> { return Promise.resolve({}) }
  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> {
    return Promise.resolve()
  }
}

describe('companion settings schema', () => {
  it('hides the character and answers clicks by default', () => {
    expect(CompanionSettingsSchema({} as never)).toEqual(DEFAULT_COMPANION_SETTINGS)
    expect(DEFAULT_COMPANION_SETTINGS).toEqual({ enabled: false, interaction: 'click' })
  })

  it('accepts every declared reaction and refuses an unknown one', () => {
    for (const interaction of COMPANION_INTERACTIONS) {
      expect(CompanionSettingsSchema({ enabled: true, interaction })).toEqual({ enabled: true, interaction })
    }
    expect(() => CompanionSettingsSchema({ interaction: 'dance' } as never)).toThrow()
    expect(() => CompanionSettingsSchema({ enabled: 'yes' } as never)).toThrow()
  })
})

describe('ui-companion host', () => {
  it('registers, validates, and disposes the durable namespace with its fiber', async () => {
    const ctx = new Context()
    await ctx.plugin(MemorySettings).await()
    const fiber = ctx.plugin({ apply: hostApply })
    await fiber.await()
    const ns = COMPANION_SETTINGS_NAMESPACE
    expect(ctx.settings.get(ns)).toEqual(DEFAULT_COMPANION_SETTINGS)
    await ctx.settings.update(ns, { enabled: true, interaction: 'follow' })
    expect(ctx.settings.get(ns)).toEqual({ enabled: true, interaction: 'follow' })
    await expect(ctx.settings.update(ns, { interaction: 'dance' })).rejects.toThrow()
    await fiber.dispose()
    expect(ctx.settings.get(ns)).toBeUndefined()
  })

  it('stays inert without a settings service', async () => {
    const ctx = new Context()
    await ctx.plugin({ apply: hostApply }).await()
    expect(ctx.get('settings')).toBeUndefined()
    await ctx.fiber.dispose()
  })
})
