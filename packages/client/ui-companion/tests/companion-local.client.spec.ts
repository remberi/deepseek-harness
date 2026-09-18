// @vitest-environment jsdom
/** Browser-local companion state: validated storage round trip and viewport clamping. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clampPosition, clearCompanionLocalState, COMPANION_LOCAL_KEY, validateCompanionLocalState,
  MAX_ARTWORK_BYTES, MAX_ARTWORK_DATA_URL_CHARS, refuseArtworkFile, readCompanionLocalState, writeCompanionLocalState,
} from '../src/client/companion-local.ts'

beforeEach(() => { localStorage.clear() })

describe('validateCompanionLocalState', () => {
  it('fills defaults and accepts a saved state', () => {
    expect(validateCompanionLocalState({})).toEqual({ artwork: null, position: null })
    expect(validateCompanionLocalState({ artwork: 'data:image/png;base64,AAAA', position: { right: 1, bottom: 2 } }))
      .toEqual({ artwork: 'data:image/png;base64,AAAA', position: { right: 1, bottom: 2 } })
  })

  it('refuses artwork above the size cap and malformed positions', () => {
    expect(validateCompanionLocalState({ artwork: 'x'.repeat(MAX_ARTWORK_BYTES) })).toEqual({
      artwork: 'x'.repeat(MAX_ARTWORK_BYTES), position: null,
    })
    expect(() => validateCompanionLocalState({ artwork: 'x'.repeat(MAX_ARTWORK_DATA_URL_CHARS + 1) })).toThrow()
    expect(() => validateCompanionLocalState({ position: { right: 1 } })).toThrow()
    expect(() => validateCompanionLocalState({ position: { right: '1', bottom: 2 } })).toThrow()
  })
})

describe('companion local storage', () => {
  it('round-trips through localStorage and reports the default when nothing is saved', () => {
    expect(readCompanionLocalState()).toEqual({ artwork: null, position: null })
    writeCompanionLocalState({ artwork: null, position: { right: 300, bottom: 40 } })
    expect(readCompanionLocalState()).toEqual({ artwork: null, position: { right: 300, bottom: 40 } })
    clearCompanionLocalState()
    expect(localStorage.getItem(COMPANION_LOCAL_KEY)).toBeNull()
  })

  it('drops an invalid entry instead of trusting it', () => {
    localStorage.setItem(COMPANION_LOCAL_KEY, JSON.stringify({ artwork: [] }))
    expect(readCompanionLocalState()).toEqual({ artwork: null, position: null })
    expect(localStorage.getItem(COMPANION_LOCAL_KEY)).toBeNull()
  })

  it('treats a throwing storage as absent and only logs a failed write', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = () => { throw new DOMException('quota', 'QuotaExceededError') }
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(failing)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(failing)
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(failing)
    expect(readCompanionLocalState()).toEqual({ artwork: null, position: null })
    expect(() => { writeCompanionLocalState({ artwork: null, position: null }) }).not.toThrow()
    expect(() => { clearCompanionLocalState() }).not.toThrow()
    expect(error).toHaveBeenCalledOnce()
    getItem.mockRestore()
    setItem.mockRestore()
    removeItem.mockRestore()
    error.mockRestore()
  })

  it('does nothing without a localStorage', () => {
    vi.stubGlobal('localStorage', undefined)
    try {
      expect(readCompanionLocalState()).toEqual({ artwork: null, position: null })
      expect(() => { writeCompanionLocalState({ artwork: null, position: null }) }).not.toThrow()
      expect(() => { clearCompanionLocalState() }).not.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('refuseArtworkFile', () => {
  it('caps the original file at 1 MB, not the base64 data URL', () => {
    expect(refuseArtworkFile({ size: 800 * 1024, type: 'image/jpeg' })).toBeNull()
    expect(refuseArtworkFile({ size: MAX_ARTWORK_BYTES, type: 'image/png' })).toBeNull()
    expect(refuseArtworkFile({ size: MAX_ARTWORK_BYTES + 1, type: 'image/png' })).toBe('artwork.tooLarge')
  })

  it('refuses a media type the image element will not render', () => {
    expect(refuseArtworkFile({ size: 16, type: 'application/pdf' })).toBe('artwork.unsupported')
    expect(refuseArtworkFile({ size: 16, type: '' })).toBe('artwork.unsupported')
  })
})

describe('clampPosition', () => {
  const dock = { width: 112, height: 140 }
  const viewport = { width: 1000, height: 800 }

  it('leaves an in-range position alone', () => {
    expect(clampPosition({ right: 20, bottom: 88 }, dock, viewport)).toEqual({ right: 20, bottom: 88 })
  })

  it('stops at every viewport edge', () => {
    expect(clampPosition({ right: -50, bottom: -50 }, dock, viewport)).toEqual({ right: 0, bottom: 0 })
    expect(clampPosition({ right: 5000, bottom: 5000 }, dock, viewport)).toEqual({ right: 888, bottom: 660 })
  })

  it('pins to the corner when the dock is larger than the viewport', () => {
    expect(clampPosition({ right: 30, bottom: 30 }, dock, { width: 100, height: 100 })).toEqual({ right: 0, bottom: 0 })
  })
})
