/** The built-in theme catalog both halves read: ids, schemes, and the tinted themes' token symmetry. */
import { describe, expect, it } from 'vitest'
import {
  BUILTIN_BASE_THEMES, BUILTIN_STYLE_THEMES, BUILTIN_THEMES, builtinTheme, THEME_PREFERENCES,
} from '../src/theme-settings.ts'

describe('built-in theme catalog', () => {
  it('covers every persistable preference except system, base pair first', () => {
    expect(BUILTIN_THEMES.map(theme => theme.id)).toEqual(THEME_PREFERENCES.filter(id => id !== 'system'))
    expect(BUILTIN_BASE_THEMES.map(theme => theme.id)).toEqual(['light', 'dark'])
    expect(BUILTIN_THEMES).toEqual([...BUILTIN_BASE_THEMES, ...BUILTIN_STYLE_THEMES])
    for (const theme of BUILTIN_THEMES) expect(builtinTheme(theme.id)).toBe(theme)
  })

  it('base themes override nothing; every tinted theme overrides the same token set', () => {
    for (const theme of BUILTIN_BASE_THEMES) expect(theme.tokens).toEqual({})
    const [first, ...rest] = BUILTIN_STYLE_THEMES
    const names = Object.keys(first!.tokens).sort()
    expect(names.length).toBeGreaterThan(0)
    for (const theme of rest) expect(Object.keys(theme.tokens).sort()).toEqual(names)
  })

  it('tinted themes paint the same canvas and accent the boot stylesheet and swatch use', () => {
    for (const theme of BUILTIN_STYLE_THEMES) {
      expect(theme.tokens['--dsw-alias-bg-base']).toBe(theme.canvas)
      expect(theme.tokens['--dsw-alias-brand-primary']).toBe(theme.accent)
      expect(theme.tokens['--dsw-alias-border-l2']).toMatch(/^rgba\(\d+, \d+, \d+, 0\.12\)$/)
    }
    expect(BUILTIN_STYLE_THEMES.map(theme => [theme.id, theme.colorScheme])).toEqual([
      ['sepia', 'light'], ['ocean', 'light'], ['midnight', 'dark'],
    ])
  })

  it('freezes the catalog rows and their tokens', () => {
    for (const theme of BUILTIN_THEMES) {
      expect(Object.isFrozen(theme)).toBe(true)
      expect(Object.isFrozen(theme.tokens)).toBe(true)
    }
  })
})
