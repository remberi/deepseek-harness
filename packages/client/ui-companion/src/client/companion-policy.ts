/** Host-backed companion visibility and interaction preferences plus browser-local artwork and position. */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  COMPANION_ENABLED_FIELD, COMPANION_INTERACTION_FIELD, DEFAULT_COMPANION_SETTINGS,
  type CompanionInteraction, type CompanionSettings,
} from '../companion-settings.ts'
import {
  readCompanionLocalState, writeCompanionLocalState,
  type CompanionLocalState, type CompanionPosition,
} from './companion-local.ts'

/** Live companion state consumed by the character overlay and its Settings page. */
export class CompanionPolicy {
  /** Reactive current section; hidden with click interaction before Host settings arrive. */
  readonly settings: SnapshotStore<CompanionSettings> = createSnapshotStore({ ...DEFAULT_COMPANION_SETTINGS })

  /** Reactive browser-local artwork and position, rehydrated from localStorage on construction. */
  readonly local: SnapshotStore<CompanionLocalState> = createSnapshotStore(readCompanionLocalState())

  /**
   * @param host - durable companion settings scope.
   */
  constructor(private readonly host: SettingsScope<CompanionSettings>) {
    host.subscribe(() => { this.adopt() })
    this.adopt()
  }

  /**
   * Publish and persist whether the character is shown.
   * @param enabled - true to float the character over the Web GUI.
   */
  setEnabled(enabled: boolean): void {
    if (this.settings.getSnapshot().enabled === enabled) return
    this.settings.update((draft) => { draft.enabled = enabled })
    void this.host.set(COMPANION_ENABLED_FIELD, enabled)
  }

  /**
   * Publish and persist one explicit reaction choice.
   * @param interaction - pointer reaction mode.
   */
  setInteraction(interaction: CompanionInteraction): void {
    if (this.settings.getSnapshot().interaction === interaction) return
    this.settings.update((draft) => { draft.interaction = interaction })
    void this.host.set(COMPANION_INTERACTION_FIELD, interaction)
  }

  /**
   * Replace the artwork shown for the character in this browser.
   * @param artwork - image data URL, or null to return to the built-in whale girl.
   */
  setArtwork(artwork: string | null): void {
    if (this.local.getSnapshot().artwork === artwork) return
    this.local.update((draft) => { draft.artwork = artwork })
    writeCompanionLocalState(this.local.getSnapshot())
  }

  /**
   * Remember where the character was dragged in this browser.
   * @param position - dock offsets, or null to return to the default corner.
   */
  setPosition(position: CompanionPosition | null): void {
    const current = this.local.getSnapshot().position
    if (current?.right === position?.right && current?.bottom === position?.bottom) return
    this.local.update((draft) => { draft.position = position })
    writeCompanionLocalState(this.local.getSnapshot())
  }

  /** Adopt the latest accepted Host section without writing it back. */
  private adopt(): void {
    const section = this.host.getSnapshot().value
    if (section === undefined) return
    const current = this.settings.getSnapshot()
    if (current.enabled === section.enabled && current.interaction === section.interaction) return
    this.settings.set({ enabled: section.enabled, interaction: section.interaction })
  }
}
