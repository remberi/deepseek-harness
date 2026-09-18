// @vitest-environment jsdom
/** CompanionPolicy mirrors the Host section, writes explicit user choices, and keeps artwork and position locally. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { CompanionSettings } from '../src/companion-settings.ts'
import { COMPANION_LOCAL_KEY, type CompanionLocalState } from '../src/client/companion-local.ts'
import { CompanionPolicy } from '../src/client/companion-policy.ts'

beforeEach(() => { localStorage.clear() })

function fakeScope(value: CompanionSettings | undefined) {
  const store = createSnapshotStore<SettingsScopeSnapshot<CompanionSettings>>({
    status: value === undefined ? 'loading' : 'ready',
    value,
    base: undefined,
    user: undefined,
    revision: 0,
    writable: true,
    mode: 'host',
  })
  const set = vi.fn<SettingsScope<CompanionSettings>['set']>(() => Promise.resolve())
  const scope: SettingsScope<CompanionSettings> = {
    getSnapshot: () => store.getSnapshot(),
    subscribe: listener => store.subscribe(listener),
    set,
    unset: () => Promise.resolve(),
    mutate: () => Promise.resolve(),
  }
  return {
    scope,
    set,
    arrive: (next: CompanionSettings) => { store.update((draft) => { draft.status = 'ready'; draft.value = next }) },
  }
}

describe('CompanionPolicy', () => {
  it('starts hidden with click reaction, then adopts the Host section without writing back', () => {
    const b = fakeScope(undefined)
    const policy = new CompanionPolicy(b.scope)
    expect(policy.settings.getSnapshot()).toEqual({ enabled: false, interaction: 'click' })
    b.arrive({ enabled: true, interaction: 'hover' })
    expect(policy.settings.getSnapshot()).toEqual({ enabled: true, interaction: 'hover' })
    expect(b.set).not.toHaveBeenCalled()
  })

  it('adopts a section already present at construction', () => {
    const b = fakeScope({ enabled: true, interaction: 'none' })
    expect(new CompanionPolicy(b.scope).settings.getSnapshot()).toEqual({ enabled: true, interaction: 'none' })
  })

  it('publishes and persists each field once per change', () => {
    const b = fakeScope({ enabled: false, interaction: 'click' })
    const policy = new CompanionPolicy(b.scope)
    const seen: CompanionSettings[] = []
    policy.settings.subscribe(() => { seen.push(policy.settings.getSnapshot()) })

    policy.setEnabled(true)
    policy.setEnabled(true)
    policy.setInteraction('follow')
    policy.setInteraction('follow')
    expect(b.set.mock.calls).toEqual([['enabled', true], ['interaction', 'follow']])
    expect(seen).toEqual([
      { enabled: true, interaction: 'click' },
      { enabled: true, interaction: 'follow' },
    ])

    // An echo of the same section is not republished.
    b.arrive({ enabled: true, interaction: 'follow' })
    expect(seen).toHaveLength(2)
  })

  it('keeps artwork and position in this browser, once per change, and rehydrates them', () => {
    const policy = new CompanionPolicy(fakeScope(undefined).scope)
    expect(policy.local.getSnapshot()).toEqual({ artwork: null, position: null })
    const seen: CompanionLocalState[] = []
    policy.local.subscribe(() => { seen.push(policy.local.getSnapshot()) })

    policy.setArtwork('data:image/png;base64,AAAA')
    policy.setArtwork('data:image/png;base64,AAAA')
    policy.setPosition({ right: 300, bottom: 40 })
    policy.setPosition({ right: 300, bottom: 40 })
    expect(seen).toEqual([
      { artwork: 'data:image/png;base64,AAAA', position: null },
      { artwork: 'data:image/png;base64,AAAA', position: { right: 300, bottom: 40 } },
    ])
    expect(JSON.parse(localStorage.getItem(COMPANION_LOCAL_KEY) ?? '')).toEqual(seen[1])

    // A fresh policy in the same browser starts from the saved state.
    expect(new CompanionPolicy(fakeScope(undefined).scope).local.getSnapshot()).toEqual(seen[1])

    policy.setPosition(null)
    policy.setArtwork(null)
    expect(policy.local.getSnapshot()).toEqual({ artwork: null, position: null })
  })

  it('discards a saved state that fails validation', () => {
    localStorage.setItem(COMPANION_LOCAL_KEY, JSON.stringify({ artwork: 7, position: { right: 'far' } }))
    expect(new CompanionPolicy(fakeScope(undefined).scope).local.getSnapshot()).toEqual({ artwork: null, position: null })
    expect(localStorage.getItem(COMPANION_LOCAL_KEY)).toBeNull()

    localStorage.setItem(COMPANION_LOCAL_KEY, '{not json')
    expect(new CompanionPolicy(fakeScope(undefined).scope).local.getSnapshot()).toEqual({ artwork: null, position: null })
    expect(localStorage.getItem(COMPANION_LOCAL_KEY)).toBeNull()
  })
})
