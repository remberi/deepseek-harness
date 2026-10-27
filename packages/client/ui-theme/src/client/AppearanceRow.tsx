/**
 * Appearance preference row registered into the General section item slot
 * (figma 501:30012 'Frame 2117131228'): title + one preference cube per
 * built-in preference. The base cubes (Light, Dark, System) carry icons.
 * Registered by this package — the theme feature owns its own settings surface.
 * Selection follows the persisted preference, never the resolved active theme.
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
const CUBES: readonly Cube[] = [
  { id: 'light', labelKey: 'appearance.light', visual: <IconLightOutlineMedium /> },
  { id: 'dark', labelKey: 'appearance.dark', visual: <IconDarkOutlineMedium /> },
  { id: 'system', labelKey: 'appearance.system', visual: <IconFollowsystemOutlineMedium /> },
]

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
