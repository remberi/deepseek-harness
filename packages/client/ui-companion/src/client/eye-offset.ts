/** Pointer-to-pose geometry shared by the overlay and its tests. */

/** Pupil / lean offset, each axis in the range -1 (left/up) to 1 (right/down). */
export interface EyeOffset {
  x: number
  y: number
}

/** Pointer distance, in CSS pixels, at which the pose reaches its edge. */
const FULL_TRAVEL_PX = 240

/** How far the picture leans, in CSS pixels, at full offset. */
export const POSE_LEAN_PX = 8

/** Pupils / pose looking straight ahead. */
export const EYE_CENTER: EyeOffset = { x: 0, y: 0 }

/**
 * Direction from the character's face toward the pointer, clamped to the unit square.
 * @param face - the character's bounding box in viewport coordinates.
 * @param pointer - pointer position in viewport coordinates.
 * @returns the offset toward the pointer.
 */
export function eyeOffsetToward(
  face: { left: number; top: number; width: number; height: number },
  pointer: { x: number; y: number },
): EyeOffset {
  const centerX = face.left + face.width / 2
  // The face sits in the upper half of the full-body artwork.
  const centerY = face.top + face.height * 0.45
  const clamp = (value: number) => Math.max(-1, Math.min(1, value))
  return {
    x: clamp((pointer.x - centerX) / FULL_TRAVEL_PX),
    y: clamp((pointer.y - centerY) / FULL_TRAVEL_PX),
  }
}

/**
 * CSS translate that leans the picture toward an {@link EyeOffset}.
 * @param eye - unit-square offset.
 * @returns an inline transform string.
 */
export function poseTransform(eye: EyeOffset): string {
  return `translate(${(eye.x * POSE_LEAN_PX).toFixed(2)}px, ${(eye.y * POSE_LEAN_PX).toFixed(2)}px)`
}
