/** The built-in theme catalog both halves read: ids, schemes, and token symmetry. */
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

  it('base themes override nothing; tinted catalog is empty', () => {
    for (const theme of BUILTIN_BASE_THEMES) expect(theme.tokens).toEqual({})
    expect(BUILTIN_STYLE_THEMES).toEqual([])
  })

  it('freezes the catalog rows and their tokens', () => {
    for (const theme of BUILTIN_THEMES) {
      expect(Object.isFrozen(theme)).toBe(true)
      expect(Object.isFrozen(theme.tokens)).toBe(true)
    }
  })
})
