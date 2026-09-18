// @vitest-environment jsdom
/** The whale-girl Settings page toggles visibility, selects the reaction, uploads artwork, and resets her position. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { CompanionInteraction, CompanionSettings } from '../src/companion-settings.ts'
import { DEFAULT_COMPANION_LOCAL_STATE, MAX_ARTWORK_BYTES, type CompanionLocalState } from '../src/client/companion-local.ts'
import { CompanionSection, type CompanionSectionProps } from '../src/client/CompanionSection.tsx'
import { DEFAULT_COMPANION_ARTWORK } from '../src/client/default-artwork.ts'
import { en, zh } from '../src/client/locales.ts'

afterEach(cleanup)

const unusedHook = (): never => { throw new Error('the companion page consumes no global hooks') }

function mount(
  initial: CompanionSettings,
  dictionary: typeof en | typeof zh = en,
  local: CompanionLocalState = DEFAULT_COMPANION_LOCAL_STATE,
) {
  const source = createSnapshotStore(initial)
  const localSource = createSnapshotStore(local)
  const setEnabled = vi.fn((enabled: boolean) => { source.update((draft) => { draft.enabled = enabled }) })
  const setInteraction = vi.fn((interaction: CompanionInteraction) => {
    source.update((draft) => { draft.interaction = interaction })
  })
  const setArtwork = vi.fn((artwork: string | null) => { localSource.update((draft) => { draft.artwork = artwork }) })
  const resetPosition = vi.fn(() => { localSource.update((draft) => { draft.position = null }) })
  const props: CompanionSectionProps = {
    close: () => {},
    useSessions: unusedHook, useSessionStatus: unusedHook, useSessionRetainInfo: unusedHook,
    usePanelInfo: unusedHook, useWorkspaces: unusedHook, useResource: unusedHook,
    useCompanion: bindSnapshotSelector(source),
    useLocal: bindSnapshotSelector(localSource),
    setEnabled,
    setInteraction,
    setArtwork,
    resetPosition,
    t: makeTranslate(dictionary),
  }
  render(<CompanionSection {...props} />)
  return { setEnabled, setInteraction, setArtwork, resetPosition }
}

/** Choose one file through the hidden input. */
function chooseFile(file: File): void {
  const input = screen.getByLabelText(en['artwork.upload'], { selector: 'input' }) as HTMLInputElement
  Object.defineProperty(input, 'files', { configurable: true, value: [file] })
  fireEvent.change(input)
}

describe('CompanionSection', () => {
  it('shows her hidden by default, with the reaction selector locked until she is shown', () => {
    const b = mount({ enabled: false, interaction: 'click' })
    const toggle = screen.getByRole('switch', { name: en['enabled.title'] })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('button', { name: /Click to talk/ })).toHaveProperty('disabled', true)
    expect(screen.getByText(en['interaction.click.description'])).toBeDefined()
    expect(screen.getByRole('img', { name: en.character }).getAttribute('data-enabled')).toBe('false')

    fireEvent.click(toggle)
    expect(b.setEnabled).toHaveBeenCalledWith(true)
    expect(screen.getByRole('switch', { name: en['enabled.title'] }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('button', { name: /Click to talk/ })).toHaveProperty('disabled', false)
    expect(screen.getByRole('img', { name: en.character }).getAttribute('data-enabled')).toBe('true')
  })

  it('selects a reaction and previews its description', () => {
    const b = mount({ enabled: true, interaction: 'click' })
    fireEvent.click(screen.getByRole('button', { name: /Click to talk/ }))
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual([
      'Click to talk', 'Wave on hover', 'Follow the pointer', 'Quiet company',
    ])
    fireEvent.click(screen.getByRole('menuitem', { name: 'Follow the pointer' }))
    expect(b.setInteraction).toHaveBeenCalledWith('follow')
    expect(screen.getByRole('button', { name: /Follow the pointer/ })).toBeDefined()
    expect(screen.getByText(en['interaction.follow.description'])).toBeDefined()
    expect(screen.queryByRole('menuitem')).toBeNull()
  })

  it('renders the Chinese copy', () => {
    mount({ enabled: true, interaction: 'hover' }, zh)
    expect(screen.getByText('显示鲸鱼娘')).toBeDefined()
    expect(screen.getByRole('button', { name: /悬停互动/ })).toBeDefined()
    expect(screen.getByText(zh['interaction.hover.description'])).toBeDefined()
    expect(screen.getByRole('button', { name: zh['artwork.upload'] })).toBeDefined()
  })

  it('uploads an image as her artwork, previews it, and restores the built-in picture', async () => {
    const b = mount({ enabled: true, interaction: 'click' })
    const stage = screen.getByRole('img', { name: en.character })
    expect(stage.querySelector('img')?.getAttribute('src')).toBe(DEFAULT_COMPANION_ARTWORK)
    expect(screen.queryByRole('button', { name: en['artwork.reset'] })).toBeNull()

    chooseFile(new File([new Uint8Array([137, 80, 78, 71])], 'her.png', { type: 'image/png' }))
    await waitFor(() => { expect(b.setArtwork).toHaveBeenCalledWith('data:image/png;base64,iVBORw==') })
    expect(stage.querySelector('img')?.getAttribute('src')).toBe('data:image/png;base64,iVBORw==')

    fireEvent.click(screen.getByRole('button', { name: en['artwork.reset'] }))
    expect(b.setArtwork).toHaveBeenLastCalledWith(null)
    expect(stage.querySelector('img')?.getAttribute('src')).toBe(DEFAULT_COMPANION_ARTWORK)
  })

  it('refuses an unsupported format and clears the notice on success', async () => {
    const b = mount({ enabled: true, interaction: 'click' })
    chooseFile(new File(['%PDF'], 'her.pdf', { type: 'application/pdf' }))
    await waitFor(() => { expect(screen.getByRole('alert').textContent).toBe(en['artwork.unsupported']) })

    // An original under 1 MB is accepted even when the data URL exceeds 1 MB.
    const readAsDataURL = vi.spyOn(FileReader.prototype, 'readAsDataURL')
    readAsDataURL.mockImplementationOnce(function (this: FileReader) {
      Object.defineProperty(this, 'result', { value: `data:image/png;base64,${'A'.repeat(MAX_ARTWORK_BYTES)}` })
      this.dispatchEvent(new Event('load'))
    })
    chooseFile(new File([new Uint8Array([137, 80, 78, 71])], 'ok.png', { type: 'image/png' }))
    await waitFor(() => { expect(b.setArtwork).toHaveBeenCalledOnce() })
    expect(screen.queryByRole('alert')).toBeNull()
    readAsDataURL.mockRestore()

    chooseFile(new File([new Uint8Array([1])], 'tiny.png', { type: 'image/png' }))
    await waitFor(() => { expect(b.setArtwork).toHaveBeenCalledTimes(2) })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('opens the file picker from the upload button and ignores a cancelled selection', () => {
    const b = mount({ enabled: true, interaction: 'click' })
    const input = screen.getByLabelText(en['artwork.upload'], { selector: 'input' })
    const pick = vi.spyOn(input as HTMLInputElement, 'click')
    fireEvent.click(screen.getByRole('button', { name: en['artwork.upload'] }))
    expect(pick).toHaveBeenCalledOnce()
    fireEvent.change(input, { target: { files: [] } })
    expect(b.setArtwork).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('reports an image the browser cannot read', async () => {
    const b = mount({ enabled: true, interaction: 'click' })
    const readAsDataURL = vi.spyOn(FileReader.prototype, 'readAsDataURL')
    readAsDataURL.mockImplementationOnce(function (this: FileReader) { this.dispatchEvent(new Event('error')) })
    chooseFile(new File([new Uint8Array([1])], 'broken.png', { type: 'image/png' }))
    await waitFor(() => { expect(screen.getByRole('alert').textContent).toBe(en['artwork.unreadable']) })

    // A load event without a string result is reported the same way.
    readAsDataURL.mockImplementationOnce(function (this: FileReader) { this.dispatchEvent(new Event('load')) })
    chooseFile(new File([new Uint8Array([1])], 'empty.png', { type: 'image/png' }))
    await waitFor(() => { expect(screen.getByRole('alert').textContent).toBe(en['artwork.unreadable']) })
    expect(b.setArtwork).not.toHaveBeenCalled()
    readAsDataURL.mockRestore()
  })

  it('offers to return her to the corner only after she was dragged', () => {
    const b = mount({ enabled: true, interaction: 'click' }, en, { artwork: null, position: { right: 300, bottom: 40 } })
    const reset = screen.getByRole('button', { name: en['position.reset'] })
    expect(reset).toHaveProperty('disabled', false)
    fireEvent.click(reset)
    expect(b.resetPosition).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: en['position.reset'] })).toHaveProperty('disabled', true)
  })
})
