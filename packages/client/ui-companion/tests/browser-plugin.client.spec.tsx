// @vitest-environment jsdom
/** ui-companion apply wiring: dictionaries, the Settings page, the overlay, and the preference scope. */
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { SettingsScope, SettingsScopeSnapshot, SettingsScopeSpec } from '@deepseek-ai/dsh-client-ui-settings/client'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import type { CompanionSettings } from '../src/companion-settings.ts'
import { apply, inject } from '../src/client/index.ts'
import { CompanionOverlay, type CompanionOverlayInjected } from '../src/client/CompanionOverlay.tsx'
import { CompanionSection, type CompanionSectionInjected } from '../src/client/CompanionSection.tsx'

usePinnedBrowserLanguages('zh-CN')
afterEach(cleanup)

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  const section = createSnapshotStore<SettingsScopeSnapshot<CompanionSettings>>({
    status: 'ready', value: { enabled: false, interaction: 'click' },
    base: undefined, user: undefined, revision: 0, writable: true, mode: 'host',
  })
  const set = vi.fn<SettingsScope<CompanionSettings>['set']>(() => Promise.resolve())
  const bind = vi.fn((_spec: SettingsScopeSpec<CompanionSettings>): SettingsScope<CompanionSettings> => ({
    getSnapshot: () => section.getSnapshot(),
    subscribe: listener => section.subscribe(listener),
    set,
    unset: () => Promise.resolve(),
    mutate: () => Promise.resolve(),
  }))
  ctx.provide('settingsScope', { bind } as never)
  return { ctx, slots: ctx.get('slots') as SlotRegistry, locale, bind, set, section }
}

function declare(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'root',
    children: {
      'settings.section': { kind: 'list', scope: 'root' },
      'shell.overlay': { kind: 'list', scope: 'root' },
    },
  } as never, () => null)
}

describe('ui-companion browser plugin', () => {
  it('declares the slot, locale, and settings-scope services', () => {
    expect(inject).toEqual(['slots', 'locale', 'settingsScope'])
  })

  it('binds the namespace once and registers the page and the overlay with localized copy', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    expect(b.bind).toHaveBeenCalledExactlyOnceWith({ namespace: 'ui-companion' })

    const page = b.slots.entries('settings.section')[0]!
    expect(page.component).toBe(CompanionSection)
    expect(page.options).toMatchObject({ id: 'companion', order: 22 })
    expect(page.locale).toBe('settings.companion')
    expect(resolveSlotLabel(page.options.label)).toBe('虚拟人物')
    b.locale.setLocale('en')
    expect(resolveSlotLabel(b.slots.entries('settings.section')[0]!.options.label)).toBe('Virtual character')

    const overlay = b.slots.entries('shell.overlay')[0]!
    expect(overlay.component).toBe(CompanionOverlay)
    expect(overlay.options).toMatchObject({ id: 'companion' })
    expect(overlay.locale).toBe('settings.companion')

    // Both faces observe one policy: a page write reaches the overlay's hook and the Host.
    const pageFace = (page.inject as unknown as () => CompanionSectionInjected)()
    const overlayFace = (overlay.inject as unknown as () => CompanionOverlayInjected)()
    expect(overlayFace.hooks.companion).toBe(pageFace.hooks.companion)
    pageFace.setEnabled(true)
    pageFace.setInteraction('hover')
    expect(overlayFace.hooks.companion.getSnapshot()).toEqual({ enabled: true, interaction: 'hover' })
    expect(b.set.mock.calls).toEqual([['enabled', true], ['interaction', 'hover']])

    // A Host section accepted later is adopted by the same store.
    b.section.update((draft) => { draft.value = { enabled: false, interaction: 'follow' } })
    expect(pageFace.hooks.companion.getSnapshot()).toEqual({ enabled: false, interaction: 'follow' })

    // Artwork and position share one browser-local store; the page uploads and resets, the overlay drags.
    expect(overlayFace.hooks.local).toBe(pageFace.hooks.local)
    pageFace.setArtwork('data:image/png;base64,AAAA')
    overlayFace.setPosition({ right: 300, bottom: 40 })
    expect(pageFace.hooks.local.getSnapshot()).toEqual({ artwork: 'data:image/png;base64,AAAA', position: { right: 300, bottom: 40 } })
    pageFace.resetPosition()
    pageFace.setArtwork(null)
    expect(overlayFace.hooks.local.getSnapshot()).toEqual({ artwork: null, position: null })
    await b.ctx.fiber.dispose()
  })

  it('follows a late declaration and leaves with its fiber', async () => {
    const b = await bench()
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(b.slots.entries('settings.section')).toHaveLength(0)
    expect(b.slots.entries('shell.overlay')).toHaveLength(0)

    declare(b.slots)
    await vi.waitFor(() => {
      expect(b.slots.entries('settings.section')).toHaveLength(1)
      expect(b.slots.entries('shell.overlay')).toHaveLength(1)
    })

    await fiber.dispose()
    expect(b.slots.entries('settings.section')).toHaveLength(0)
    expect(b.slots.entries('shell.overlay')).toHaveLength(0)
    expect(() => b.locale.register('settings.companion', 'zh', {})).not.toThrow()
    await b.ctx.fiber.dispose()
  })
})
