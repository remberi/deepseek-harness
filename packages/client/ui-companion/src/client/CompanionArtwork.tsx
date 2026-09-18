/** The character's picture: the built-in artwork, or the user's uploaded image at the same width. */

import clsx from 'clsx'
import type { ReactNode } from 'react'
import css from './CompanionArtwork.module.css'
import { DEFAULT_COMPANION_ARTWORK } from './default-artwork.ts'
import { poseTransform, type EyeOffset } from './eye-offset.ts'

/** Artwork props. */
export interface CompanionArtworkProps {
  /** Uploaded image data URL, or null for the built-in picture. */
  artwork: string | null
  /** Rendered width in CSS pixels. */
  size: number
  /** Lean toward the pointer in follow mode. */
  eye: EyeOffset
  /** Whether the picture wiggles (hover greeting). */
  waving: boolean
  /** Reserved so a talking pose can return without a caller change. */
  talking: boolean
}

/**
 * Render the character picture.
 * @param props - artwork source, size, and pose.
 * @returns the built-in or uploaded image.
 */
export function CompanionArtwork({ artwork, size, eye, waving, talking }: CompanionArtworkProps): ReactNode {
  return (
    <span className={css.pose} style={{ transform: poseTransform(eye) }} data-waving={waving} data-talking={talking}>
      <img
        className={clsx(css.custom, waving && css.waving, talking && css.talking)}
        src={artwork ?? DEFAULT_COMPANION_ARTWORK}
        alt=""
        draggable={false}
        style={{ width: size }}
      />
    </span>
  )
}
