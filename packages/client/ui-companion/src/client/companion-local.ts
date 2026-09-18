/**
 * Browser-local companion state: the uploaded artwork and the dragged
 * position. Both stay in this browser's localStorage rather than the Host
 * settings document because an image blob does not belong in settings.yaml
 * and a pixel offset only means something for the viewport that produced it.
 */

import z from '@deepseek-ai/schemastery'

/** localStorage key holding the validated local state envelope. */
export const COMPANION_LOCAL_KEY = 'dsh.ui-companion.local.v1'

/**
 * Largest accepted original image file, in bytes. The stored data URL is
 * larger because FileReader encodes the bytes as `data:*;base64,...`.
 */
export const MAX_ARTWORK_BYTES = 1024 * 1024

/**
 * Largest accepted stored data URL. A file of `MAX_ARTWORK_BYTES` grows by
 * about 4/3 once base64-encoded, plus the `data:` prefix; browsers cap the
 * whole localStorage origin near 5 MiB, so one image stays well below that.
 */
export const MAX_ARTWORK_DATA_URL_CHARS = Math.ceil(MAX_ARTWORK_BYTES * 4 / 3) + 64

/** Image media types the upload accepts; `<img>` renders each without executing script. */
export const ARTWORK_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'] as const

/** Dock offsets from the viewport's bottom-right corner in CSS pixels. */
export interface CompanionPosition {
  /** Distance from the viewport's right edge to the dock's right edge. */
  right: number
  /** Distance from the viewport's bottom edge to the dock's bottom edge. */
  bottom: number
}

/** State kept in this browser only. */
export interface CompanionLocalState {
  /** Uploaded artwork as a data URL, or null for the built-in whale girl. */
  artwork: string | null
  /** Where the user dragged the character, or null for the default corner. */
  position: CompanionPosition | null
}

/** Built-in artwork in the default corner. */
export const DEFAULT_COMPANION_LOCAL_STATE: CompanionLocalState = { artwork: null, position: null }

const positionSchema = z.object({ right: z.number().required(), bottom: z.number().required() })

/** Fields as stored; an absent field means the default. */
interface StoredLocalState {
  artwork?: string | null
  position?: CompanionPosition | null
}

const storedSchema: z<StoredLocalState> = z.object({
  artwork: z.union([z.string().max(MAX_ARTWORK_DATA_URL_CHARS), z.const(null)]),
  position: z.union([positionSchema, z.const(null)]),
})

/**
 * Validate one stored envelope before this window trusts it.
 * @param raw - parsed JSON from storage.
 * @returns the state with absent fields resolved to their defaults.
 * @throws schemastery's validation error for any field outside the accepted values.
 */
export function validateCompanionLocalState(raw: unknown): CompanionLocalState {
  // schemastery types its input as the output type; the call itself validates the unknown value.
  const stored = storedSchema(raw as StoredLocalState)
  return { artwork: stored.artwork ?? null, position: stored.position ?? null }
}

/**
 * Restore the validated local state.
 * @returns the saved state, or the default when absent, inaccessible, or invalid.
 */
export function readCompanionLocalState(): CompanionLocalState {
  if (typeof localStorage === 'undefined') return DEFAULT_COMPANION_LOCAL_STATE
  let raw: string | null
  try { raw = localStorage.getItem(COMPANION_LOCAL_KEY) }
  catch (_storageUnavailable) { return DEFAULT_COMPANION_LOCAL_STATE }
  if (raw === null) return DEFAULT_COMPANION_LOCAL_STATE
  try {
    return validateCompanionLocalState(JSON.parse(raw))
  } catch (_invalidState) {
    clearCompanionLocalState()
    return DEFAULT_COMPANION_LOCAL_STATE
  }
}

/**
 * Persist the local state for this browser.
 * @param state - current in-memory state.
 */
export function writeCompanionLocalState(state: CompanionLocalState): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(COMPANION_LOCAL_KEY, JSON.stringify(state)) }
  catch (error) { console.error('Companion local state persistence failed:', error) }
}

/** Remove the persisted local state. */
export function clearCompanionLocalState(): void {
  if (typeof localStorage === 'undefined') return
  try { localStorage.removeItem(COMPANION_LOCAL_KEY) }
  catch (_storageUnavailable) { /* The invalid state is still excluded from this window. */ }
}

/**
 * Whether a chosen file is over the original-file cap or not an accepted image type.
 * @param file - the chosen file's size and media type.
 * @returns the copy key of the reason it was refused, or null to read it.
 */
export function refuseArtworkFile(file: { size: number; type: string }): 'artwork.tooLarge' | 'artwork.unsupported' | null {
  // The 1 MB cap is the original file. Checking the data URL instead would
  // reject ~750 KB images because base64 expands binary by about 4/3.
  if (file.size > MAX_ARTWORK_BYTES) return 'artwork.tooLarge'
  if (!(ARTWORK_MEDIA_TYPES as readonly string[]).includes(file.type)) return 'artwork.unsupported'
  return null
}

/**
 * Keep a dock of the given size fully inside the viewport.
 * @param position - requested offsets.
 * @param dock - dock width and height in CSS pixels.
 * @param viewport - viewport width and height in CSS pixels.
 * @returns offsets clamped so the dock stays visible.
 */
export function clampPosition(
  position: CompanionPosition,
  dock: { width: number; height: number },
  viewport: { width: number; height: number },
): CompanionPosition {
  return {
    right: Math.min(Math.max(0, position.right), Math.max(0, viewport.width - dock.width)),
    bottom: Math.min(Math.max(0, position.bottom), Math.max(0, viewport.height - dock.height)),
  }
}
