/** Durable companion section: defaults, accepted reactions, refused values, Host registration. */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { liveConfig, omitsGeneratedPage } from '../../../settings/settings/tests/live-config.ts'
import { plainConfig } from '../../../settings/settings/src/schema.ts'
import * as HostPlugin from '@deepseek-ai/dsh-client-ui-companion'
import {
  COMPANION_INTERACTIONS, CompanionSettingsSchema, Config, DEFAULT_COMPANION_SETTINGS, apply,
} from '@deepseek-ai/dsh-client-ui-companion'

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
    const configuration = await liveConfig(ctx, { Config, apply })
    const { fiber } = configuration
    expect(plainConfig(configuration.fiber.config)).toEqual(DEFAULT_COMPANION_SETTINGS)
    await configuration.update({ enabled: true, interaction: 'follow' })
    expect(plainConfig(configuration.fiber.config)).toEqual({ enabled: true, interaction: 'follow' })
    await expect(configuration.update({ interaction: 'dance' })).rejects.toThrow()
    await fiber.dispose()
  })

  it('stays inert without a settings service', async () => {
    const ctx = new Context()
    await ctx.plugin({ Config, apply }).await()
    expect(ctx.get('settings')).toBeUndefined()
    await ctx.fiber.dispose()
  })
})

it('keeps its own instance off the generated Settings pages', () => omitsGeneratedPage(ctx => ctx.plugin(HostPlugin)))
