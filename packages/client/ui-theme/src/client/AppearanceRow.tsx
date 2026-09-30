/**
 * Appearance preference row registered into the General section item slot
 * (figma 501:30012 'Frame 2117131228'): title + one preference cube per
 * built-in preference. The base cubes (Light, Dark, System) carry icons; the
 * Claude Code and Codex themes carry their product marks. Registered by this
 * package — the theme feature owns its own
 * settings surface. Selection follows the persisted preference, never the
 * resolved active theme.
 */
import type { ReactElement } from 'react'
import clsx from 'clsx'
import {
  IconDarkOutlineMedium, IconFollowsystemOutlineMedium, IconLightOutlineMedium,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { ThemePreference } from '../theme-settings.ts'
import type { ThemeKey } from './locales.ts'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { createAppearanceRowStore } from './settings-store.ts'
import css from './AppearanceRow.module.css'
import codexLogo from './assets/codex-logo.png'

/** Injected business face: the preference write (t rides the standard locale seat). */
export interface AppearanceRowInjected {
  /** Switch the theme preference. */
  setTheme: (id: ThemePreference) => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type AppearanceRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createAppearanceRowStore>>
  & PropsLocale<'settings.theme'> & AppearanceRowInjected

interface Cube {
  id: ThemePreference
  labelKey: ThemeKey
  visual: ReactElement
}

/** Base cube order and icons (figma 501:30015-30017: Light, Dark, System). */
const BASE_CUBES: readonly Cube[] = [
  { id: 'light', labelKey: 'appearance.light', visual: <IconLightOutlineMedium /> },
  { id: 'dark', labelKey: 'appearance.dark', visual: <IconDarkOutlineMedium /> },
  { id: 'system', labelKey: 'appearance.system', visual: <IconFollowsystemOutlineMedium /> },
]

/** Claude Code's mark follows the pinned Simple Icons artwork. */
const claudeCodeMark = (
  <svg className={css.brandMark} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M21 10.5h3v3h-3v3h-1.5v3H18v-3h-1.5v3H15v-3H9v3H7.5v-3H6v3H4.5v-3H3v-3H0v-3h3v-6h18Zm-15 0h1.5v-3H6Zm10.5 0H18v-3h-1.5z" />
  </svg>
)

const STYLE_CUBES: readonly Cube[] = [
  { id: 'claudeCode', labelKey: 'appearance.claudeCode', visual: <span className={css.claudeMark}>{claudeCodeMark}</span> },
  { id: 'codex', labelKey: 'appearance.codex', visual: <img className={css.brandMark} src={codexLogo} alt="" aria-hidden /> },
]

const CUBES: readonly Cube[] = [...BASE_CUBES, ...STYLE_CUBES]

/**
 * Render the Appearance row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function AppearanceRow({ t, setTheme, useStore }: AppearanceRowComponentProps) {
  const preference = useStore(s => s.preference)
  return (
    <div className={css.group}>
      <div className={css.title}>{t('appearance.title')}</div>
      <div className={css.cubeRow}>
        {CUBES.map(({ id, labelKey, visual }) => (
          <button
            key={id}
            type="button"
            className={clsx(css.themeCube, preference === id && css.selected)}
            aria-pressed={preference === id}
            onClick={() => { setTheme(id) }}
          >
            {visual}
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
