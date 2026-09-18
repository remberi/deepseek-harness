/**
 * Whale-girl Settings page: a switch that shows or hides her, a selector for
 * how she reacts to the pointer, an upload that replaces her artwork in this
 * browser, a reset for her dragged position, and a still preview.
 */

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { Button, IconChevronDownOutline14, Menu, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { COMPANION_INTERACTIONS, type CompanionInteraction, type CompanionSettings } from '../companion-settings.ts'
import { CompanionArtwork } from './CompanionArtwork.tsx'
import { ARTWORK_MEDIA_TYPES, MAX_ARTWORK_DATA_URL_CHARS, refuseArtworkFile, type CompanionLocalState } from './companion-local.ts'
import css from './CompanionSection.module.css'
import { EYE_CENTER } from './eye-offset.ts'
import type { CompanionLocaleKey } from './locales.ts'

/** Registration-side Settings page face. */
export interface CompanionSectionInjected {
  hooks: {
    /** Persisted companion preferences bound as useCompanion. */
    companion: SnapshotStore<CompanionSettings>
    /** Browser-local artwork and position bound as useLocal. */
    local: SnapshotStore<CompanionLocalState>
  }
  /** Show or hide the character. */
  setEnabled: (enabled: boolean) => void
  /** Change how the character reacts to the pointer. */
  setInteraction: (interaction: CompanionInteraction) => void
  /** Replace the artwork with an image data URL, or null for the built-in picture. */
  setArtwork: (artwork: string | null) => void
  /** Forget the dragged position so the character returns to the default corner. */
  resetPosition: () => void
}

/** Full Settings page props. */
export type CompanionSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.companion'>
  & InjectFace<CompanionSectionInjected>

/** Preview artwork width in CSS pixels. */
const PREVIEW_SIZE = 128

/** Upload failures the page reports; each names its copy key. */
type ArtworkError = Extract<CompanionLocaleKey, `artwork.${'tooLarge' | 'unsupported' | 'unreadable'}`>

/** Outcome of reading one chosen file. */
type ArtworkRead = { ok: true; dataUrl: string } | { ok: false; reason: ArtworkError }

/**
 * Read one chosen image as a data URL after checking its type and size.
 * @param file - the chosen file.
 * @returns the data URL, or the copy key of the reason it was refused.
 */
function readArtwork(file: File): Promise<ArtworkRead> {
  const refused = refuseArtworkFile(file)
  if (refused !== null) return Promise.resolve({ ok: false, reason: refused })
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => { resolve({ ok: false, reason: 'artwork.unreadable' }) }
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') { resolve({ ok: false, reason: 'artwork.unreadable' }); return }
      resolve(result.length > MAX_ARTWORK_DATA_URL_CHARS ? { ok: false, reason: 'artwork.tooLarge' } : { ok: true, dataUrl: result })
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Render the whale-girl Settings page.
 * @param props - composed Settings slot props.
 * @returns the settings page element tree.
 */
export function CompanionSection({
  useCompanion, useLocal, setEnabled, setInteraction, setArtwork, resetPosition, t,
}: CompanionSectionProps): ReactNode {
  const { enabled, interaction } = useCompanion(value => value)
  const { artwork, position } = useLocal(value => value)
  const [open, setOpen] = useState(false)
  const [artworkError, setArtworkError] = useState<ArtworkError | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const closeMenu = () => { setOpen(false) }
  const selectInteraction = (id: string) => {
    closeMenu()
    setInteraction(id as CompanionInteraction)
  }
  const onFileChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    const read = await readArtwork(file)
    if (read.ok) {
      setArtworkError(null)
      setArtwork(read.dataUrl)
    } else {
      setArtworkError(read.reason)
    }
  }
  const selector = (
    <button
      type="button"
      className={css.selector}
      aria-haspopup="menu"
      aria-expanded={open}
      disabled={!enabled}
      onClick={() => { setOpen(value => !value) }}
    >
      {t(`interaction.${interaction}`)}
      <IconChevronDownOutline14 className={css.chevron} />
    </button>
  )

  return (
    <div className={css.section}>
      <div className={css.row}>
        <div className={css.rowText}>
          <div className={css.title}>{t('enabled.title')}</div>
          <div className={css.desc}>{t('enabled.description')}</div>
        </div>
        <Switch checked={enabled} onChange={setEnabled} label={t('enabled.title')} />
      </div>
      <div className={css.row}>
        <div className={css.rowText}>
          <div className={css.title}>{t('interaction.title')}</div>
          <div className={css.desc}>{t('interaction.description')}</div>
        </div>
        <Menu
          open={open}
          onClose={closeMenu}
          items={COMPANION_INTERACTIONS.map(id => ({ id, label: t(`interaction.${id}`) }))}
          selectedId={interaction}
          onSelect={selectInteraction}
          align="end"
          portal
          anchor={selector}
        />
      </div>
      <div className={css.row}>
        <div className={css.rowText}>
          <div className={css.title}>{t('artwork.title')}</div>
          <div className={css.desc}>{t('artwork.description')}</div>
          {artworkError !== null ? <div className={css.error} role="alert">{t(artworkError)}</div> : null}
        </div>
        <div className={css.actions}>
          <input
            ref={fileInput}
            className={css.fileInput}
            type="file"
            accept={ARTWORK_MEDIA_TYPES.join(',')}
            aria-label={t('artwork.upload')}
            onChange={(event) => { void onFileChosen(event) }}
          />
          <Button variant="outline" size="sm" onClick={() => { fileInput.current?.click() }}>{t('artwork.upload')}</Button>
          {artwork !== null
            ? <Button variant="ghost" size="sm" onClick={() => { setArtworkError(null); setArtwork(null) }}>{t('artwork.reset')}</Button>
            : null}
        </div>
      </div>
      <div className={css.row}>
        <div className={css.rowText}>
          <div className={css.title}>{t('position.title')}</div>
          <div className={css.desc}>{t('position.description')}</div>
        </div>
        <Button variant="outline" size="sm" disabled={position === null} onClick={resetPosition}>{t('position.reset')}</Button>
      </div>
      <div className={css.preview}>
        <div className={css.rowText}>
          <div className={css.title}>{t('preview.title')}</div>
          <div className={css.desc}>{t(`interaction.${interaction}.description`)}</div>
        </div>
        <div className={css.stage} role="img" aria-label={t('character')} data-enabled={enabled}>
          <CompanionArtwork artwork={artwork} eye={EYE_CENTER} waving={interaction === 'hover'} talking={false} size={PREVIEW_SIZE} />
        </div>
      </div>
    </div>
  )
}
