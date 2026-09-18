/** Pointer direction becomes a clamped pose offset. */
import { describe, expect, it } from 'vitest'
import { EYE_CENTER, POSE_LEAN_PX, eyeOffsetToward, poseTransform } from '../src/client/eye-offset.ts'

const face = { left: 1000, top: 600, width: 120, height: 140 }

describe('eyeOffsetToward', () => {
  it('looks straight ahead at the eye line', () => {
    expect(eyeOffsetToward(face, { x: 1060, y: 600 + 140 * 0.45 })).toEqual(EYE_CENTER)
  })

  it('scales with distance and clamps to the unit square', () => {
    const near = eyeOffsetToward(face, { x: 1060 + 120, y: 663 - 60 })
    expect(near.x).toBeCloseTo(0.5)
    expect(near.y).toBeCloseTo(-0.25)
    expect(eyeOffsetToward(face, { x: 0, y: 5000 })).toEqual({ x: -1, y: 1 })
  })
})

describe('poseTransform', () => {
  it('leans the picture by a fixed pixel range', () => {
    expect(poseTransform(EYE_CENTER)).toBe('translate(0.00px, 0.00px)')
    expect(poseTransform({ x: -1, y: 1 })).toBe(`translate(-${POSE_LEAN_PX.toFixed(2)}px, ${POSE_LEAN_PX.toFixed(2)}px)`)
  })
})
