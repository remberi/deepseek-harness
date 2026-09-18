/**
 * The floating whale girl: docked in the bottom-right corner of the shell
 * overlay until dragged elsewhere, shown only while the preference enables
 * her, reacting to the pointer in the mode the preference selects.
 */

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { CompanionSettings } from '../companion-settings.ts'
import { CompanionArtwork } from './CompanionArtwork.tsx'
import { clampPosition, type CompanionLocalState, type CompanionPosition } from './companion-local.ts'
import css from './CompanionOverlay.module.css'
import { EYE_CENTER, eyeOffsetToward, type EyeOffset } from './eye-offset.ts'
import { SAY_KEYS, type CompanionLocaleKey } from './locales.ts'

/** Registration-side overlay face. */
export interface CompanionOverlayInjected {
  hooks: {
    /** Persisted companion preferences bound as useCompanion. */
    companion: SnapshotStore<CompanionSettings>
    /** Browser-local artwork and position bound as useLocal. */
    local: SnapshotStore<CompanionLocalState>
  }
  /** Remember where a drag left the character. */
  setPosition: (position: CompanionPosition) => void
}

/** Full overlay props. */
export type CompanionOverlayProps =
  PropsRuntime<'shell.overlay'>
  & PropsLocale<'settings.companion'>
  & InjectFace<CompanionOverlayInjected>

/** Rendered artwork width in CSS pixels. */
const CHARACTER_SIZE = 152

/** How long a clicked line stays visible. */
const BUBBLE_MS = 3000

/** Pointer travel in CSS pixels that turns a press into a drag instead of a click. */
export const DRAG_THRESHOLD_PX = 4

/** Dock offsets used until the user drags the character. */
export const DEFAULT_POSITION: CompanionPosition = { right: 20, bottom: 88 }

/** The line at one position of the cycle; the index is already reduced modulo the list length. */
function sayKey(index: number): CompanionLocaleKey {
  return SAY_KEYS[index] as CompanionLocaleKey
}

/** One press being tracked from pointerdown until release. */
interface Press {
  pointerId: number
  startX: number
  startY: number
  origin: CompanionPosition
  dragging: boolean
}

/**
 * Render the docked character.
 * @param props - composed overlay props.
 * @returns the character with her speech bubble, or null while hidden.
 */
export function CompanionOverlay({ useCompanion, useLocal, setPosition, t }: CompanionOverlayProps): ReactNode {
  const { enabled, interaction } = useCompanion(value => value)
  const { artwork, position } = useLocal(value => value)
  const [dock, setDock] = useState<HTMLDivElement | null>(null)
  const [bubble, setBubble] = useState<CompanionLocaleKey | null>(null)
  const [phrase, setPhrase] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [eye, setEye] = useState<EyeOffset>(EYE_CENTER)
  const [dragged, setDragged] = useState<CompanionPosition | null>(null)
  const press = useRef<Press | null>(null)
  const swallowClick = useRef(false)

  // Every mode change resets the pose so a stale bubble or wave never
  // outlives the reaction that produced it.
  useEffect(() => {
    setBubble(null)
    setHovering(false)
    setEye(EYE_CENTER)
  }, [interaction, enabled])

  // The dock element exists only while enabled, so a hidden character installs no listener.
  useEffect(() => {
    if (dock === null || interaction !== 'follow') return
    const onMove = (event: PointerEvent) => {
      setEye(eyeOffsetToward(dock.getBoundingClientRect(), { x: event.clientX, y: event.clientY }))
    }
    window.addEventListener('pointermove', onMove)
    return () => { window.removeEventListener('pointermove', onMove) }
  }, [dock, interaction])

  useEffect(() => {
    if (bubble === null || interaction !== 'click') return
    const timer = setTimeout(() => { setBubble(null) }, BUBBLE_MS)
    return () => { clearTimeout(timer) }
  }, [bubble, phrase, interaction])

  if (!enabled) return null

  const say = () => {
    const next = (phrase + 1) % SAY_KEYS.length
    setPhrase(next)
    setBubble(sayKey(next))
  }
  const greet = (entering: boolean) => {
    setHovering(entering)
    setBubble(entering ? 'say.hello' : null)
  }
  // The pressed element stands in for the dock: the bubble is cleared when a
  // drag starts, so the character's own box is what must stay in view.
  const clamp = (next: CompanionPosition, pressed: HTMLElement): CompanionPosition => (
    clampPosition(next, pressed.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight })
  )
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    swallowClick.current = false
    press.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: dragged ?? position ?? DEFAULT_POSITION,
      dragging: false,
    }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const current = press.current
    if (current === null || current.pointerId !== event.pointerId) return
    const dx = event.clientX - current.startX
    const dy = event.clientY - current.startY
    if (!current.dragging) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      current.dragging = true
      event.currentTarget.setPointerCapture(event.pointerId)
      setBubble(null)
    }
    setDragged(clamp({ right: current.origin.right - dx, bottom: current.origin.bottom - dy }, event.currentTarget))
  }
  const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const current = press.current
    if (current === null || current.pointerId !== event.pointerId) return
    if (current.dragging) {
      const dx = event.clientX - current.startX
      const dy = event.clientY - current.startY
      setPosition(clamp({ right: current.origin.right - dx, bottom: current.origin.bottom - dy }, event.currentTarget))
      setDragged(null)
      event.currentTarget.releasePointerCapture(event.pointerId)
      // The click that follows this release belongs to the drag, not to her.
      swallowClick.current = true
    }
    press.current = null
  }
  const onClick = () => {
    if (swallowClick.current) {
      swallowClick.current = false
      return
    }
    say()
  }
  const isDragging = dragged !== null
  const talking = bubble !== null
  const at = dragged ?? position ?? DEFAULT_POSITION
  const style: CSSProperties = { right: at.right, bottom: at.bottom }
  const art = (
    <CompanionArtwork
      artwork={artwork}
      eye={eye}
      waving={interaction === 'hover' && hovering}
      talking={talking}
      size={CHARACTER_SIZE}
    />
  )
  const pressHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    'data-dragging': isDragging,
  }

  return (
    <div ref={setDock} className={css.dock} style={style} data-interaction={interaction} data-dragging={isDragging}>
      {bubble !== null ? <div className={css.bubble} role="status">{t(bubble)}</div> : null}
      {interaction === 'click'
        ? <button type="button" className={css.character} aria-label={t('character')} onClick={onClick} {...pressHandlers}>{art}</button>
        : (
          <div
            role="img"
            className={css.character}
            aria-label={t('character')}
            onPointerEnter={interaction === 'hover' ? () => { greet(true) } : undefined}
            onPointerLeave={interaction === 'hover' ? () => { greet(false) } : undefined}
            {...pressHandlers}
          >
            {art}
          </div>
        )}
    </div>
  )
}
