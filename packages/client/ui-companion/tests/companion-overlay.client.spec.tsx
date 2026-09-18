// @vitest-environment jsdom
/** The floating whale girl appears only when enabled, reacts in the selected mode, and follows a drag. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { CompanionSettings } from '../src/companion-settings.ts'
import { DEFAULT_COMPANION_LOCAL_STATE, type CompanionLocalState } from '../src/client/companion-local.ts'
import { CompanionOverlay, DEFAULT_POSITION, type CompanionOverlayProps } from '../src/client/CompanionOverlay.tsx'
import { DEFAULT_COMPANION_ARTWORK } from '../src/client/default-artwork.ts'
import { en, SAY_KEYS } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const unusedHook = (): never => { throw new Error('the companion overlay consumes no global hooks') }

function mount(initial: CompanionSettings, local: CompanionLocalState = DEFAULT_COMPANION_LOCAL_STATE) {
  const source = createSnapshotStore(initial)
  const localSource = createSnapshotStore(local)
  const setPosition = vi.fn()
  const props: CompanionOverlayProps = {
    useSessions: unusedHook, useSessionStatus: unusedHook, useSessionRetainInfo: unusedHook,
    usePanelInfo: unusedHook, useWorkspaces: unusedHook, useResource: unusedHook,
    useCompanion: bindSnapshotSelector(source),
    useLocal: bindSnapshotSelector(localSource),
    setPosition,
    t: makeTranslate(en),
  }
  const view = render(<CompanionOverlay {...props} />)
  return { view, source, localSource, setPosition }
}

/** The pose wrapper's inline transform, the only artwork detail a pointer moves. */
function poseStyle(): string {
  const pose = document.querySelector('[data-waving]') as HTMLElement
  return pose.style.transform
}

/** The dock's inline offsets from the bottom-right corner. */
function dockOffsets(dock: HTMLElement): { right: string; bottom: string } {
  return { right: dock.style.right, bottom: dock.style.bottom }
}

/** Give the character a fixed size inside a 1000×800 viewport so clamping is predictable. */
function sizeViewport(her: HTMLElement): void {
  Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
  her.getBoundingClientRect = () => ({
    left: 868, top: 572, width: 112, height: 140, right: 980, bottom: 712, x: 868, y: 572, toJSON: () => ({}),
  })
}

describe('CompanionOverlay', () => {
  it('renders nothing while hidden and appears once enabled', () => {
    const b = mount({ enabled: false, interaction: 'click' })
    expect(b.view.container.childElementCount).toBe(0)
    act(() => { b.source.update((draft) => { draft.enabled = true }) })
    expect(screen.getByRole('button', { name: en.character })).toBeDefined()
    act(() => { b.source.update((draft) => { draft.enabled = false }) })
    expect(b.view.container.childElementCount).toBe(0)
  })

  it('answers each click with the next line and lets it fade after three seconds', () => {
    vi.useFakeTimers()
    mount({ enabled: true, interaction: 'click' })
    const her = screen.getByRole('button', { name: en.character })
    expect(screen.queryByRole('status')).toBeNull()

    fireEvent.click(her)
    expect(screen.getByRole('status').textContent).toBe(en['say.1'])
    expect(document.querySelector('[data-talking="true"]')).not.toBeNull()
    fireEvent.click(her)
    expect(screen.getByRole('status').textContent).toBe(en['say.2'])

    act(() => { vi.advanceTimersByTime(2999) })
    expect(screen.getByRole('status')).toBeDefined()
    act(() => { vi.advanceTimersByTime(1) })
    expect(screen.queryByRole('status')).toBeNull()

    // The cycle wraps around after the last line.
    for (let i = 0; i < SAY_KEYS.length - 2; i += 1) fireEvent.click(her)
    expect(screen.getByRole('status').textContent).toBe(en['say.0'])
  })

  it('greets and waves while hovered, then settles when the pointer leaves', () => {
    mount({ enabled: true, interaction: 'hover' })
    const her = screen.getByRole('img', { name: en.character })
    fireEvent.pointerEnter(her)
    expect(screen.getByRole('status').textContent).toBe(en['say.hello'])
    expect(document.querySelector('[data-waving="true"]')).not.toBeNull()
    fireEvent.pointerLeave(her)
    expect(screen.queryByRole('status')).toBeNull()
    expect(document.querySelector('[data-waving="true"]')).toBeNull()
  })

  it('leans toward the pointer in follow mode and recenters when the mode changes', () => {
    const b = mount({ enabled: true, interaction: 'follow' })
    const dock = screen.getByRole('img', { name: en.character }).parentElement!
    dock.getBoundingClientRect = () => ({
      left: 1000, top: 600, width: 120, height: 140, right: 1120, bottom: 740, x: 1000, y: 600, toJSON: () => ({}),
    })
    expect(poseStyle()).toBe('translate(0.00px, 0.00px)')
    fireEvent.pointerMove(window, { clientX: 0, clientY: 0 })
    expect(poseStyle()).toBe('translate(-8.00px, -8.00px)')

    act(() => { b.source.update((draft) => { draft.interaction = 'none' }) })
    expect(poseStyle()).toBe('translate(0.00px, 0.00px)')
    fireEvent.pointerMove(window, { clientX: 0, clientY: 0 })
    expect(poseStyle()).toBe('translate(0.00px, 0.00px)')
  })

  it('stays quiet in company mode', () => {
    mount({ enabled: true, interaction: 'none' })
    const her = screen.getByRole('img', { name: en.character })
    fireEvent.click(her)
    fireEvent.pointerEnter(her)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('sits in the default corner until a saved position moves her', () => {
    const b = mount({ enabled: true, interaction: 'none' })
    const dock = screen.getByRole('img', { name: en.character }).parentElement!
    expect(dockOffsets(dock)).toEqual({ right: `${DEFAULT_POSITION.right}px`, bottom: `${DEFAULT_POSITION.bottom}px` })
    act(() => { b.localSource.update((draft) => { draft.position = { right: 300, bottom: 40 } }) })
    expect(dockOffsets(dock)).toEqual({ right: '300px', bottom: '40px' })
  })

  it('follows a drag, clamps to the viewport, remembers the release point, and swallows the trailing click', () => {
    const b = mount({ enabled: true, interaction: 'click' })
    const her = screen.getByRole('button', { name: en.character })
    const dock = her.parentElement!
    sizeViewport(her)
    const capture = vi.fn()
    const release = vi.fn()
    her.setPointerCapture = capture
    her.releasePointerCapture = release

    // Movement under the threshold stays a click.
    fireEvent.pointerDown(her, { pointerId: 1, button: 0, clientX: 900, clientY: 700 })
    fireEvent.pointerMove(her, { pointerId: 1, clientX: 902, clientY: 701 })
    fireEvent.pointerUp(her, { pointerId: 1, clientX: 902, clientY: 701 })
    fireEvent.click(her)
    expect(screen.getByRole('status')).toBeDefined()
    expect(b.setPosition).not.toHaveBeenCalled()
    expect(dockOffsets(dock)).toEqual({ right: '20px', bottom: '88px' })

    // A real drag moves the dock live: 400px left and 200px up from the default corner.
    fireEvent.pointerDown(her, { pointerId: 2, button: 0, clientX: 900, clientY: 700 })
    fireEvent.pointerMove(her, { pointerId: 2, clientX: 500, clientY: 500 })
    expect(capture).toHaveBeenCalledWith(2)
    expect(screen.queryByRole('status')).toBeNull()
    expect(dock.dataset.dragging).toBe('true')
    expect(dockOffsets(dock)).toEqual({ right: '420px', bottom: '288px' })

    // Far past the top-left edge the dock stops at the viewport bound.
    fireEvent.pointerMove(her, { pointerId: 2, clientX: -2000, clientY: -2000 })
    expect(dockOffsets(dock)).toEqual({ right: '888px', bottom: '660px' })

    fireEvent.pointerUp(her, { pointerId: 2, clientX: 500, clientY: 500 })
    expect(b.setPosition).toHaveBeenCalledWith({ right: 420, bottom: 288 })
    expect(release).toHaveBeenCalledWith(2)
    expect(dock.dataset.dragging).toBe('false')
    fireEvent.click(her)
    expect(screen.queryByRole('status')).toBeNull()

    // The next plain click talks again.
    fireEvent.click(her)
    expect(screen.getByRole('status')).toBeDefined()
  })

  it('ignores secondary buttons and stray pointer events', () => {
    const b = mount({ enabled: true, interaction: 'click' })
    const her = screen.getByRole('button', { name: en.character })
    const dock = her.parentElement!
    sizeViewport(her)

    fireEvent.pointerMove(her, { pointerId: 9, clientX: 100, clientY: 100 })
    fireEvent.pointerUp(her, { pointerId: 9, clientX: 100, clientY: 100 })
    fireEvent.pointerDown(her, { pointerId: 3, button: 2, clientX: 900, clientY: 700 })
    fireEvent.pointerMove(her, { pointerId: 3, clientX: 500, clientY: 500 })
    fireEvent.pointerUp(her, { pointerId: 3, clientX: 500, clientY: 500 })
    expect(dockOffsets(dock)).toEqual({ right: '20px', bottom: '88px' })
    expect(b.setPosition).not.toHaveBeenCalled()

    // A press by one pointer ignores movement reported by another.
    fireEvent.pointerDown(her, { pointerId: 4, button: 0, clientX: 900, clientY: 700 })
    fireEvent.pointerMove(her, { pointerId: 5, clientX: 500, clientY: 500 })
    fireEvent.pointerUp(her, { pointerId: 5, clientX: 500, clientY: 500 })
    expect(dockOffsets(dock)).toEqual({ right: '20px', bottom: '88px' })
    fireEvent.pointerUp(her, { pointerId: 4, clientX: 900, clientY: 700 })
    fireEvent.click(her)
    expect(screen.getByRole('status')).toBeDefined()
  })

  it('shows the uploaded artwork instead of the built-in picture', () => {
    const b = mount({ enabled: true, interaction: 'none' }, { artwork: 'data:image/png;base64,AAAA', position: null })
    const her = screen.getByRole('img', { name: en.character })
    const picture = her.querySelector('img') as HTMLImageElement
    expect(picture.getAttribute('src')).toBe('data:image/png;base64,AAAA')
    expect(picture.style.width).toBe('152px')
    act(() => { b.localSource.update((draft) => { draft.artwork = null }) })
    expect((her.querySelector('img') as HTMLImageElement).getAttribute('src')).toBe(DEFAULT_COMPANION_ARTWORK)
  })
})
