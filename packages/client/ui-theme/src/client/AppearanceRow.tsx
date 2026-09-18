/**
 * Appearance preference row registered into the General section item slot
 * (figma 501:30012 'Frame 2117131228'): title + one preference cube per
 * built-in preference. The base cubes (Light, Dark, System) carry icons; the
 * tinted built-in themes carry a canvas/accent swatch derived from their own
 * tokens. Registered by this package — the theme feature owns its own
 * settings surface. Selection follows the persisted preference, never the
 * resolved active theme.
 */
import type { CSSProperties } from 'react'
import clsx from 'clsx'
import {
  IconDarkOutline16, IconFollowsystemOutline16, IconLightOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { BUILTIN_STYLE_THEMES, type BuiltinTheme, type ThemePreference } from '../theme-settings.ts'
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
  /** Icon for the base cubes; swatch colors for the tinted themes. */
  visual: { Icon: typeof IconLightOutline16 } | { canvas: string; accent: string }
}

/** Base cube order and icons (figma 501:30015-30017: Light, Dark, System). */
const BASE_CUBES: readonly Cube[] = [
  { id: 'light', labelKey: 'appearance.light', visual: { Icon: IconLightOutline16 } },
  { id: 'dark', labelKey: 'appearance.dark', visual: { Icon: IconDarkOutline16 } },
  { id: 'system', labelKey: 'appearance.system', visual: { Icon: IconFollowsystemOutline16 } },
]

/** Tinted cubes in catalog order; the swatch shows the theme's canvas and accent. */
const STYLE_CUBES: readonly Cube[] = BUILTIN_STYLE_THEMES.map((theme: BuiltinTheme): Cube => ({
  id: theme.id,
  labelKey: `appearance.${theme.id}`,
  visual: { canvas: theme.canvas, accent: theme.accent },
}))

const CUBES: readonly Cube[] = [...BASE_CUBES, ...STYLE_CUBES]

function CubeVisual({ visual }: { visual: Cube['visual'] }) {
  if ('Icon' in visual) return <visual.Icon />
  return (
    <span
      aria-hidden
      className={css.swatch}
      style={{ '--dsh-theme-swatch-canvas': visual.canvas, '--dsh-theme-swatch-accent': visual.accent } as CSSProperties}
    />
  )
}

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
            <CubeVisual visual={visual} />
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
