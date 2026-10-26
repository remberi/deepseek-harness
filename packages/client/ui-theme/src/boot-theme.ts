/**
 * Theme bootstrap row for the browser's pre-plugin interval. Each index
 * render embeds the current durable built-in preference, font sizes, and
 * font-family lists. Head CSS colors the document canvas before script
 * execution; the body script installs the palette selector, alias tokens for
 * tinted themes, and font variables that the client presenters adopt.
 */

import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import {
  builtinTheme,
  DEFAULT_FONT_SIZES,
  DEFAULT_PREFERENCE,
  FONT_ROLES,
  FONT_SIZE_SPECS,
  fontFamilyVariable,
  normalizeFontFamily,
  THEME_PREFERENCE_ATTRIBUTE,
  type BuiltinTheme,
  type FontFamilies,
  type FontSizes,
  type ThemePreference,
} from './theme-settings.ts'

/** Root attribute publishing the resolved scheme (`light`, `dark`, or `system`) for native chrome mirroring. */
const THEME_SOURCE_ATTRIBUTE = 'data-ds-theme-source'

function canvasStyle(theme: BuiltinTheme): string {
  return `:root{color-scheme:${theme.colorScheme}}body{background-color:${theme.canvas};--dsh-boot-bg:${theme.canvas}}`
}

/** CSS that colors the document canvas before any script executes. */
function bootThemeStyle(preference: ThemePreference): string {
  if (preference !== 'system') return canvasStyle(builtinTheme(preference))
  return `${canvasStyle(builtinTheme('light'))}@media(prefers-color-scheme:dark){${canvasStyle(builtinTheme('dark'))}}`
}

/**
 * Build the body script that installs the palette selector, tinted alias tokens,
 * and font variables. The theme source attribute publishes the resolved scheme
 * (never a tinted id) because the Electron preload forwards it to
 * `nativeTheme.themeSource`.
 */
function bootThemeBodyScript(preference: ThemePreference, fontSizes: FontSizes, fontFamilies: FontFamilies): string {
  const theme = preference === 'system' ? null : builtinTheme(preference)
  const sizes = FONT_ROLES.map(role =>
    `\n  document.body.style.setProperty(${JSON.stringify(FONT_SIZE_SPECS[role].variable)}, ${JSON.stringify(`${fontSizes[role]}px`)})`).join('')
  const families = FONT_ROLES.flatMap((kind) => {
    const list = normalizeFontFamily(fontFamilies[kind])
    return list === '' ? [] : [`\n  document.body.style.setProperty(${JSON.stringify(fontFamilyVariable(kind))}, ${JSON.stringify(list)})`]
  }).join('')
  return `(() => {
  const preference = ${JSON.stringify(preference)}
  const theme = ${JSON.stringify(theme === null ? null : { colorScheme: theme.colorScheme, tokens: theme.tokens })}
  const systemDark = preference === 'system'
    && typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === null ? systemDark : theme.colorScheme === 'dark'
  const root = document.documentElement
  root.setAttribute(${JSON.stringify(THEME_PREFERENCE_ATTRIBUTE)}, preference)
  root.setAttribute(${JSON.stringify(THEME_SOURCE_ATTRIBUTE)}, preference === 'system' ? 'system' : (dark ? 'dark' : 'light'))
  document.body.toggleAttribute('data-ds-dark-theme', dark)${sizes}${families}
  if (theme !== null) {
    for (const [name, value] of Object.entries(theme.tokens)) document.body.style.setProperty(name, value)
  }
})()`
}

/**
 * Theme bootstrap rows: head CSS colors the document canvas before
 * first paint, then the body script installs the palette selector and font
 * size and font families before the shell mount and module script.
 * @param preference - Current Host-backed built-in preference.
 * @param fontSizes - Current Host-backed font sizes in px by role.
 * @param fontFamilies - Current Host-backed font lists; each is normalized before embedding.
 * @returns head and body script rows in execution order.
 */
export function bootThemeInjections(
  preference: ThemePreference = DEFAULT_PREFERENCE,
  fontSizes: FontSizes = DEFAULT_FONT_SIZES,
  fontFamilies: FontFamilies = { text: '', code: '', terminal: '' },
): IndexInjection[] {
  return [
    { kind: 'style', text: bootThemeStyle(preference) },
    { kind: 'script', placement: 'body', text: bootThemeBodyScript(preference, fontSizes, fontFamilies) },
  ]
}
