/**
 * Browser half of the Screenshot bundle. A compact camera action in the composer
 * tool row captures the current tab through the screen-capture API, then opens a
 * frame-wide overlay. The user drags the area to keep, annotates it with a red
 * pen, a mosaic brush, or an eraser, and saves the result as a PNG download that
 * is also copied to the clipboard when the browser permits clipboard image writes.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-screenshot',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NAMESPACE = 'dsh-screenshot'
    const BUTTON_SLOT = 'conversation.input.right'
    const OVERLAY_SLOT = 'shell.overlay'
    const ENTRY_ID = 'dsh-screenshot'
    const MIN_SELECTION_PX = 3
    const DONE_DURATION_MS = 2200
    const FAILED_DURATION_MS = 4000
    const DOWNLOAD_REVOKE_MS = 10000
    const PEN_COLOR = '#e5484d'
    /** Brush sizes in displayed pixels, scaled to image pixels at draw time. */
    const TOOL_SIZES = { pen: 3, mosaic: 16, eraser: 14 }
    const TOOLS = ['pen', 'mosaic', 'eraser']

    const DICTIONARIES = {
      en: {
        action: 'Screenshot',
        capturing: 'Capturing screenshot…',
        selecting: 'Select area',
        saved: 'Screenshot saved',
        failed: 'Screenshot failed',
        selectionHint: 'Drag to select an area. Enter continues, Escape cancels.',
        selectAll: 'Whole image',
        cancel: 'Cancel',
        save: 'Save image',
        saving: 'Saving…',
        saveFailed: 'The image could not be saved.',
        pen: 'Red pen',
        mosaic: 'Mosaic',
        eraser: 'Eraser',
        reset: 'Reset edits',
        editHint: 'Drag to draw · Enter saves · Escape cancels',
      },
      zh: {
        action: '截图',
        capturing: '正在截图…',
        selecting: '选择区域',
        saved: '截图已保存',
        failed: '截图失败',
        selectionHint: '拖拽选择截图区域；Enter 继续，Esc 取消。',
        selectAll: '整张',
        cancel: '取消',
        save: '保存图片',
        saving: '正在保存…',
        saveFailed: '无法保存图片。',
        pen: '红笔',
        mosaic: '马赛克',
        eraser: '橡皮擦',
        reset: '重置标注',
        editHint: '拖动绘制 · Enter 保存 · Esc 取消',
      },
    }

    const BUTTON_STYLE = {
      display: 'grid',
      placeItems: 'center',
      flex: 'none',
      width: 28,
      height: 28,
      padding: 0,
      border: 'none',
      borderRadius: 999,
      background: 'var(--dsw-specific-selector)',
      color: 'var(--dsw-alias-label-primary)',
      cursor: 'pointer',
      transition: 'background-color 120ms ease',
    }

    const OVERLAY_STYLE = {
      position: 'fixed',
      inset: 0,
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 24px 96px',
      background: 'rgba(0, 0, 0, 0.65)',
    }

    const FRAME_STYLE = {
      position: 'relative',
      display: 'inline-block',
      lineHeight: 0,
      touchAction: 'none',
      userSelect: 'none',
      boxShadow: '0 18px 48px rgba(0, 0, 0, 0.45)',
    }

    const TOOLBAR_STYLE = {
      position: 'fixed',
      left: '50%',
      bottom: 24,
      transform: 'translateX(-50%)',
      zIndex: 41,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      maxWidth: 'calc(100vw - 48px)',
      padding: '10px 14px',
      border: '1px solid var(--dsw-alias-border-l1)',
      borderRadius: 'var(--dsw-radius-md)',
      background: 'var(--dsw-alias-bg-overlay)',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
      color: 'var(--dsw-alias-label-primary)',
      fontSize: 13,
      lineHeight: '20px',
    }

    const TOOLBAR_BUTTON_STYLE = {
      height: 28,
      padding: '0 10px',
      border: 'none',
      borderRadius: 'var(--dsw-radius-sm)',
      background: 'transparent',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: 13,
      lineHeight: '20px',
      cursor: 'pointer',
      flex: 'none',
    }

    const STYLES = [
      '@media (hover: hover) {',
      '  .dsh-screenshot-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-solid); }',
      '  .dsh-screenshot-toolbar button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }',
      '  .dsh-screenshot-toolbar .dsh-screenshot-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }',
      '}',
      '.dsh-screenshot-button:focus-visible, .dsh-screenshot-toolbar button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }',
      '.dsh-screenshot-button:disabled { opacity: 0.7; cursor: default; }',
      '.dsh-screenshot-toolbar button:disabled { opacity: 0.5; cursor: default; }',
    ].join('\n')

    /** Two-digit zero padding for the timestamped download name. */
    function pad(value) {
      return String(value).padStart(2, '0')
    }

    /** Build a sortable local-time download name for one capture. */
    function fileName(now) {
      const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
      const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
      return `dsh-screenshot-${date}-${time}.png`
    }

    /** Copy a bitmap into a canvas and return it for PNG encoding. */
    function drawToCanvas(source, width, height) {
      if (width <= 0 || height <= 0) throw new Error('The shared source produced an empty frame.')
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (context === null) throw new Error('Canvas rendering is unavailable in this browser.')
      context.drawImage(source, 0, 0, width, height)
      return canvas
    }

    /** Grab one frame from the shared video track without attaching DOM. */
    async function captureFrame(stream) {
      const track = stream.getVideoTracks()[0]
      if (track === undefined) throw new Error('The shared source has no video track.')
      if (typeof ImageCapture === 'function') {
        let bitmap
        try {
          bitmap = await new ImageCapture(track).grabFrame()
        } catch (error) {
          // ImageCapture is not available for every capture source (notably some
          // window surfaces); the video-element path below covers those.
          console.debug('dsh-screenshot: ImageCapture frame grab failed, using video fallback', error)
        }
        if (bitmap !== undefined) {
          try {
            return drawToCanvas(bitmap, bitmap.width, bitmap.height)
          } finally {
            if (typeof bitmap.close === 'function') bitmap.close()
          }
        }
      }
      const video = document.createElement('video')
      video.muted = true
      video.playsInline = true
      video.srcObject = stream
      try {
        await video.play()
        await new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
        return drawToCanvas(video, video.videoWidth, video.videoHeight)
      } finally {
        video.pause()
        video.srcObject = null
      }
    }

    /**
     * Ask the user to share the current tab and capture one frame. Returning the
     * frame as an object URL lets the selection overlay display exactly what was
     * grabbed and crop from the same pixels. Stopping every track immediately
     * dismisses the sharing indicator.
     */
    async function captureScreenshot() {
      const media = navigator.mediaDevices
      if (media === undefined || typeof media.getDisplayMedia !== 'function') {
        throw new Error('This browser does not support capturing the page.')
      }
      const stream = await media.getDisplayMedia({
        video: { frameRate: { ideal: 5, max: 10 } },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
      })
      try {
        const canvas = await captureFrame(stream)
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
        if (blob === null) throw new Error('The captured frame could not be encoded as PNG.')
        return URL.createObjectURL(blob)
      } finally {
        for (const track of stream.getTracks()) track.stop()
      }
    }

    /** Save an edited capture as a download through a transient object URL. */
    function saveBlob(blob) {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName(new Date())
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_REVOKE_MS)
    }

    /** Best-effort clipboard image write; the download already delivered the PNG. */
    async function copyBlob(blob) {
      if (navigator.clipboard === undefined || typeof ClipboardItem !== 'function') return
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      } catch (error) {
        console.debug('dsh-screenshot: clipboard image write was refused', error)
      }
    }

    /** Clamp a pointer coordinate into the displayed frame. */
    function clamp(value, max) {
      return Math.min(Math.max(value, 0), max)
    }

    /** Build a positive rectangle from two corners in frame space. */
    function rectangleOf(start, end) {
      return {
        left: Math.min(start.x, end.x),
        top: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
      }
    }

    /** Shared capture state owned by this plugin instance; both slot entries read it. */
    function createStore() {
      let state = { capture: null, edit: null, notice: null }
      const listeners = new Set()
      return {
        getSnapshot: () => state,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        set: (next) => {
          state = next
          for (const listener of [...listeners]) listener()
        },
      }
    }

    const store = createStore()

    /** Drop the active capture or edit and release its object URL. */
    function closeCapture(notice) {
      const opened = store.getSnapshot().capture
      store.set({ capture: null, edit: null, notice: notice ?? null })
      if (opened !== null) window.setTimeout(() => URL.revokeObjectURL(opened.url), 0)
      if (notice === 'saved') {
        window.setTimeout(() => {
          if (store.getSnapshot().notice === 'saved') store.set({ ...store.getSnapshot(), notice: null })
        }, DONE_DURATION_MS)
      }
    }

    /** Camera glyph for the idle state. */
    function cameraIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, style: { display: 'block' },
      },
      h('path', {
        d: 'M2.2 5.2h2.3l1-1.7h5l1 1.7h2.3a1.2 1.2 0 0 1 1.2 1.2v6.4a1.2 1.2 0 0 1-1.2 1.2H2.2A1.2 1.2 0 0 1 1 12.8V6.4a1.2 1.2 0 0 1 1.2-1.2Z',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round',
      }),
      h('circle', { cx: 8, cy: 9.1, r: 2.6, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }))
    }

    /** Corner-bracket glyph shown while the selection overlay is open. */
    function selectionIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, style: { display: 'block' },
      },
      h('path', {
        d: 'M2.2 6V3.7a1.5 1.5 0 0 1 1.5-1.5H6M10 2.2h2.3a1.5 1.5 0 0 1 1.5 1.5V6M13.8 10v2.3a1.5 1.5 0 0 1-1.5 1.5H10M6 13.8H3.7a1.5 1.5 0 0 1-1.5-1.5V10',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round',
      }))
    }

    /** Spinning ring shown while the sharing picker and frame grab are pending. */
    function spinnerIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, style: { display: 'block' },
      },
      h('circle', {
        cx: 8, cy: 8, r: 5.4, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
        strokeDasharray: '7 27', strokeLinecap: 'round',
      }, h('animateTransform', {
        attributeName: 'transform', type: 'rotate', from: '0 8 8', to: '360 8 8',
        dur: '0.9s', repeatCount: 'indefinite',
      })))
    }

    /** Check glyph confirming the PNG was saved. */
    function savedIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, style: { display: 'block' },
      },
      h('path', {
        d: 'M3.2 8.4 6.4 11.6 12.8 4.8', fill: 'none', stroke: 'currentColor',
        strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
      }))
    }

    /** Alert glyph shown when capture is unsupported or failed unexpectedly. */
    function failedIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, style: { display: 'block' },
      },
      h('circle', { cx: 8, cy: 8, r: 6.1, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }),
      h('path', {
        d: 'M8 4.9v3.7', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round',
      }),
      h('circle', { cx: 8, cy: 11, r: 0.85, fill: 'currentColor' }))
    }

    /** Pencil glyph for the red pen tool. */
    function penIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, style: { display: 'block' },
      },
      h('path', {
        d: 'M10.6 2.4 13.6 5.4 6.2 12.8 2.9 13.1 3.2 9.8 10.6 2.4Z',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round',
      }),
      h('path', { d: 'M9.3 3.7 12.3 6.7', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }))
    }

    /** Checkerboard glyph for the mosaic tool. */
    function mosaicIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, style: { display: 'block' },
      },
      h('rect', { x: 2.2, y: 2.2, width: 5.4, height: 5.4, rx: 1, fill: 'currentColor' }),
      h('rect', { x: 8.4, y: 8.4, width: 5.4, height: 5.4, rx: 1, fill: 'currentColor' }),
      h('rect', { x: 8.4, y: 2.2, width: 5.4, height: 5.4, rx: 1, fill: 'currentColor', opacity: 0.4 }),
      h('rect', { x: 2.2, y: 8.4, width: 5.4, height: 5.4, rx: 1, fill: 'currentColor', opacity: 0.4 }))
    }

    /** Angled block glyph for the eraser tool. */
    function eraserIcon() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, style: { display: 'block' },
      },
      h('path', {
        d: 'M8.2 2.3a1.6 1.6 0 0 1 2.3 0l3.2 3.2a1.6 1.6 0 0 1 0 2.3l-5.4 5.4H4.6L2.3 10.9a1.6 1.6 0 0 1 0-2.3l5.9-6.3Z',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinejoin: 'round',
      }),
      h('path', { d: 'M5.1 8.7 10.9 14.5', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 }))
    }

    /** Toolbar text button used by both overlay phases. */
    function toolbarButton(label, onClick, primary, disabled) {
      return h('button', {
        type: 'button',
        className: primary ? 'dsh-screenshot-primary' : undefined,
        onClick,
        disabled,
        style: primary
          ? {
            ...TOOLBAR_BUTTON_STYLE,
            color: 'var(--dsw-alias-label-primary-foreground)',
            background: 'var(--dsw-alias-button-primary-fill)',
          }
          : TOOLBAR_BUTTON_STYLE,
      }, label)
    }

    /** Square icon button for one annotation tool. */
    function toolButton(tool, active, icon, label, onSelect) {
      return h('button', {
        type: 'button',
        title: label,
        'aria-label': label,
        'aria-pressed': active ? 'true' : 'false',
        onClick: onSelect,
        style: {
          ...TOOLBAR_BUTTON_STYLE,
          display: 'grid',
          placeItems: 'center',
          width: 28,
          padding: 0,
          color: active ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
          background: active ? 'var(--dsw-alias-interactive-bg-active)' : 'transparent',
        },
      }, icon)
    }

    /** Composer tool-row camera action; the entry declares `locale` for its `t` seat. */
    function ScreenshotButton(props) {
      const t = props.t
      const snapshot = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
      const [capturing, setCapturing] = React.useState(false)
      const [failed, setFailed] = React.useState(false)
      const failedTimer = React.useRef(0)
      React.useEffect(() => () => {
        window.clearTimeout(failedTimer.current)
      }, [])

      const run = async () => {
        if (capturing || snapshot.capture !== null || snapshot.edit !== null) return
        setCapturing(true)
        try {
          const url = await captureScreenshot()
          setFailed(false)
          store.set({ capture: { url }, edit: null, notice: null })
        } catch (error) {
          // A dismissed sharing picker is a normal cancellation, not a failure.
          if (error !== null && (error.name === 'NotAllowedError' || error.name === 'AbortError')) return
          console.error('dsh-screenshot: capture failed', error)
          setFailed(true)
          window.clearTimeout(failedTimer.current)
          failedTimer.current = window.setTimeout(() => setFailed(false), FAILED_DURATION_MS)
        } finally {
          setCapturing(false)
        }
      }

      const status = capturing
        ? 'capturing'
        : snapshot.capture !== null || snapshot.edit !== null
          ? 'selecting'
          : snapshot.notice === 'saved'
            ? 'saved'
            : failed
              ? 'failed'
              : 'idle'
      const label = t(status === 'idle' ? 'action' : status)
      const icon = status === 'capturing'
        ? spinnerIcon()
        : status === 'selecting'
          ? selectionIcon()
          : status === 'saved'
            ? savedIcon()
            : status === 'failed'
              ? failedIcon()
              : cameraIcon()
      const color = status === 'saved'
        ? 'var(--dsw-alias-state-success-primary)'
        : status === 'failed'
          ? 'var(--dsw-alias-state-error-primary)'
          : 'var(--dsw-alias-label-primary)'

      return h('div', { style: { display: 'contents' } },
        h('style', null, STYLES),
        h('button', {
          type: 'button',
          className: 'dsh-screenshot-button',
          title: label,
          'aria-label': label,
          'aria-busy': status === 'capturing' ? 'true' : 'false',
          disabled: status === 'capturing' || status === 'selecting',
          onMouseDown: (event) => { event.preventDefault() },
          onClick: run,
          style: { ...BUTTON_STYLE, color },
        }, icon))
    }

    /** Paint one pixelated block over a circular brush footprint. */
    function stampMosaic(context, pixelated, x, y, radius) {
      const left = clamp(Math.floor(x - radius), pixelated.width)
      const top = clamp(Math.floor(y - radius), pixelated.height)
      const width = Math.min(pixelated.width - left, Math.ceil(radius * 2))
      const height = Math.min(pixelated.height - top, Math.ceil(radius * 2))
      if (width <= 0 || height <= 0) return
      context.save()
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.clip()
      context.drawImage(pixelated, left, top, width, height, left, top, width, height)
      context.restore()
    }

    /** Annotation editor over the cropped capture: red pen, mosaic, or eraser. */
    function AnnotationEditor(props) {
      const t = props.t
      const base = props.base
      const [tool, setTool] = React.useState('pen')
      const [saving, setSaving] = React.useState(false)
      const [error, setError] = React.useState(null)
      const [dirty, setDirty] = React.useState(false)
      const baseRef = React.useRef(null)
      const annotationRef = React.useRef(null)
      const wrapperRef = React.useRef(null)
      const pixelatedRef = React.useRef(null)
      const dragRef = React.useRef(null)
      const savingRef = React.useRef(false)

      React.useEffect(() => {
        const canvas = baseRef.current
        const context = canvas === null ? null : canvas.getContext('2d')
        if (context !== null) context.drawImage(base, 0, 0)
      }, [base])

      React.useEffect(() => {
        // Pixelate once per capture so the mosaic brush only blits image regions.
        const pixelated = document.createElement('canvas')
        pixelated.width = base.width
        pixelated.height = base.height
        const block = Math.max(4, Math.round(base.width / 160))
        const small = document.createElement('canvas')
        small.width = Math.max(1, Math.floor(base.width / block))
        small.height = Math.max(1, Math.floor(base.height / block))
        const smallContext = small.getContext('2d')
        if (smallContext !== null) {
          smallContext.imageSmoothingEnabled = true
          smallContext.drawImage(base, 0, 0, small.width, small.height)
        }
        const context = pixelated.getContext('2d')
        if (context !== null) {
          context.imageSmoothingEnabled = false
          context.drawImage(small, 0, 0, small.width, small.height, 0, 0, pixelated.width, pixelated.height)
        }
        pixelatedRef.current = pixelated
        return () => { pixelatedRef.current = null }
      }, [base])

      const canvasPoint = (event) => {
        const wrapper = wrapperRef.current
        const canvas = annotationRef.current
        if (wrapper === null || canvas === null) return null
        const bounds = wrapper.getBoundingClientRect()
        if (bounds.width === 0 || bounds.height === 0) return null
        return {
          x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
          y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
          scale: canvas.width / bounds.width,
        }
      }

      const drawStroke = (from, to, scale) => {
        const canvas = annotationRef.current
        const context = canvas === null ? null : canvas.getContext('2d')
        if (context === null) return
        if (tool === 'mosaic') {
          const pixelated = pixelatedRef.current
          if (pixelated === null) return
          const radius = TOOL_SIZES.mosaic * scale
          const distance = Math.hypot(to.x - from.x, to.y - from.y)
          const steps = Math.max(1, Math.ceil(distance / Math.max(radius / 2, 1)))
          for (let index = 1; index <= steps; index += 1) {
            const ratio = index / steps
            stampMosaic(context, pixelated, from.x + (to.x - from.x) * ratio, from.y + (to.y - from.y) * ratio, radius)
          }
          return
        }
        context.save()
        context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
        context.strokeStyle = PEN_COLOR
        context.lineWidth = TOOL_SIZES[tool] * scale
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.beginPath()
        context.moveTo(from.x, from.y)
        context.lineTo(to.x, to.y)
        context.stroke()
        context.restore()
      }

      const drawDot = (point) => {
        const canvas = annotationRef.current
        const context = canvas === null ? null : canvas.getContext('2d')
        if (context === null) return
        if (tool === 'mosaic') {
          const pixelated = pixelatedRef.current
          if (pixelated !== null) stampMosaic(context, pixelated, point.x, point.y, TOOL_SIZES.mosaic * point.scale)
          return
        }
        context.save()
        context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
        context.fillStyle = PEN_COLOR
        context.beginPath()
        context.arc(point.x, point.y, (TOOL_SIZES[tool] * point.scale) / 2, 0, Math.PI * 2)
        context.fill()
        context.restore()
      }

      const startDraw = (event) => {
        if (event.button !== 0 || savingRef.current) return
        const point = canvasPoint(event)
        const wrapper = wrapperRef.current
        if (point === null || wrapper === null) return
        event.preventDefault()
        wrapper.setPointerCapture(event.pointerId)
        dragRef.current = { pointerId: event.pointerId, last: point }
        drawDot(point)
        setDirty(true)
      }

      const moveDraw = (event) => {
        const drag = dragRef.current
        if (drag === null || drag.pointerId !== event.pointerId) return
        const point = canvasPoint(event)
        if (point === null) return
        drawStroke(drag.last, point, point.scale)
        drag.last = point
      }

      const endDraw = (event) => {
        const drag = dragRef.current
        if (drag === null || drag.pointerId !== event.pointerId) return
        dragRef.current = null
        const wrapper = wrapperRef.current
        if (wrapper !== null && wrapper.hasPointerCapture(event.pointerId)) wrapper.releasePointerCapture(event.pointerId)
      }

      const clearAnnotations = () => {
        const canvas = annotationRef.current
        const context = canvas === null ? null : canvas.getContext('2d')
        if (canvas === null || context === null) return
        context.clearRect(0, 0, canvas.width, canvas.height)
        setDirty(false)
      }

      const save = async () => {
        if (savingRef.current) return
        const annotation = annotationRef.current
        const context = annotation === null ? null : annotation.getContext('2d')
        if (context === null) return
        savingRef.current = true
        setSaving(true)
        setError(null)
        try {
          const output = document.createElement('canvas')
          output.width = base.width
          output.height = base.height
          const outputContext = output.getContext('2d')
          if (outputContext === null) throw new Error('Canvas rendering is unavailable in this browser.')
          outputContext.drawImage(base, 0, 0)
          outputContext.drawImage(annotation, 0, 0)
          const blob = await new Promise((resolve) => output.toBlob(resolve, 'image/png'))
          if (blob === null) throw new Error('The edited image could not be encoded as PNG.')
          // The overlay may have been dismissed while the canvas was encoding.
          if (store.getSnapshot().edit === null) return
          saveBlob(blob)
          await copyBlob(blob)
          closeCapture('saved')
        } catch (saveError) {
          console.error('dsh-screenshot: saving the edited image failed', saveError)
          setError(t('saveFailed'))
          savingRef.current = false
          setSaving(false)
        }
      }

      React.useEffect(() => {
        const onKeyDown = (event) => {
          if (savingRef.current) return
          if (event.key === 'Escape') {
            event.preventDefault()
            closeCapture(undefined)
          } else if (event.key === 'Enter') {
            event.preventDefault()
            void save()
          }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
      })

      const hint = h('span', {
        style: {
          flex: '1 1 auto',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: error === null ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-state-error-primary)',
        },
      }, error ?? t('editHint'))

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': t('selecting'),
        style: OVERLAY_STYLE,
      },
      h('div', {
        ref: wrapperRef,
        onPointerDown: startDraw,
        onPointerMove: moveDraw,
        onPointerUp: endDraw,
        onPointerCancel: endDraw,
        style: { ...FRAME_STYLE, cursor: 'crosshair' },
      },
      h('canvas', {
        ref: baseRef,
        width: base.width,
        height: base.height,
        'aria-hidden': true,
        style: {
          display: 'block',
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 160px)',
          width: 'auto',
          height: 'auto',
        },
      }),
      h('canvas', {
        ref: annotationRef,
        width: base.width,
        height: base.height,
        'aria-hidden': true,
        style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' },
      })),
      h('div', { className: 'dsh-screenshot-toolbar', style: { ...TOOLBAR_STYLE, gap: 8 } },
      hint,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 2, flex: 'none' } },
      toolButton('pen', tool === 'pen', penIcon(), t('pen'), () => setTool('pen')),
      toolButton('mosaic', tool === 'mosaic', mosaicIcon(), t('mosaic'), () => setTool('mosaic')),
      toolButton('eraser', tool === 'eraser', eraserIcon(), t('eraser'), () => setTool('eraser'))),
      dirty && !saving ? toolbarButton(t('reset'), clearAnnotations, false, false) : null,
      toolbarButton(t('cancel'), () => closeCapture(undefined), false, saving),
      toolbarButton(saving ? t('saving') : t('save'), () => { void save() }, true, saving)))
    }

    /** Frame-wide overlay: choose the region to keep, then annotate it. */
    function ScreenshotOverlay(props) {
      const t = props.t
      const snapshot = React.useSyncExternalStore(store.subscribe, store.getSnapshot)
      const capture = snapshot.capture
      const edit = snapshot.edit
      const [rect, setRect] = React.useState(null)
      const [ready, setReady] = React.useState(false)
      const frameRef = React.useRef(null)
      const imageRef = React.useRef(null)
      const dragRef = React.useRef(null)

      React.useEffect(() => {
        setRect(null)
        setReady(false)
      }, [capture])

      const pointOf = (event) => {
        const bounds = frameRef.current.getBoundingClientRect()
        return { x: clamp(event.clientX - bounds.left, bounds.width), y: clamp(event.clientY - bounds.top, bounds.height) }
      }

      /** Crop the selected region out of the captured frame and enter annotation. */
      const confirmSelection = () => {
        const image = imageRef.current
        const frame = frameRef.current
        if (image === null || frame === null || !ready) return
        const bounds = frame.getBoundingClientRect()
        const scaleX = image.naturalWidth / bounds.width
        const scaleY = image.naturalHeight / bounds.height
        let sourceX = 0
        let sourceY = 0
        let sourceWidth = image.naturalWidth
        let sourceHeight = image.naturalHeight
        if (rect !== null) {
          sourceX = Math.round(rect.left * scaleX)
          sourceY = Math.round(rect.top * scaleY)
          sourceWidth = Math.max(1, Math.round(rect.width * scaleX))
          sourceHeight = Math.max(1, Math.round(rect.height * scaleY))
          sourceWidth = Math.min(sourceWidth, image.naturalWidth - sourceX)
          sourceHeight = Math.min(sourceHeight, image.naturalHeight - sourceY)
        }
        if (sourceWidth <= 0 || sourceHeight <= 0) return
        const base = document.createElement('canvas')
        base.width = sourceWidth
        base.height = sourceHeight
        const context = base.getContext('2d')
        if (context === null) return
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight)
        const opened = store.getSnapshot().capture
        store.set({ capture: null, edit: { base }, notice: null })
        if (opened !== null) window.setTimeout(() => URL.revokeObjectURL(opened.url), 0)
      }

      React.useEffect(() => {
        if (capture === null) return
        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            closeCapture(undefined)
          } else if (event.key === 'Enter') {
            event.preventDefault()
            confirmSelection()
          }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
      })

      if (edit !== null) return h(AnnotationEditor, { t, base: edit.base })
      if (capture === null) return null

      const startDrag = (event) => {
        if (event.button !== 0 || !ready) return
        const frame = frameRef.current
        if (frame === null) return
        event.preventDefault()
        frame.setPointerCapture(event.pointerId)
        const start = pointOf(event)
        dragRef.current = { pointerId: event.pointerId, start }
        setRect({ left: start.x, top: start.y, width: 0, height: 0 })
      }

      const moveDrag = (event) => {
        const drag = dragRef.current
        if (drag === null || drag.pointerId !== event.pointerId) return
        setRect(rectangleOf(drag.start, pointOf(event)))
      }

      const endDrag = (event) => {
        const drag = dragRef.current
        if (drag === null || drag.pointerId !== event.pointerId) return
        dragRef.current = null
        const frame = frameRef.current
        if (frame !== null && frame.hasPointerCapture(event.pointerId)) frame.releasePointerCapture(event.pointerId)
        const next = rectangleOf(drag.start, pointOf(event))
        setRect(next.width < MIN_SELECTION_PX || next.height < MIN_SELECTION_PX ? null : next)
      }

      const selection = rect === null
        ? null
        : h('div', {
          'aria-hidden': true,
          style: {
            position: 'absolute',
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            border: '1.5px solid var(--dsw-alias-label-primary-foreground)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
            pointerEvents: 'none',
          },
        })

      return h('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': t('selecting'),
        style: OVERLAY_STYLE,
      },
      h('div', {
        ref: frameRef,
        onPointerDown: startDrag,
        onPointerMove: moveDrag,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
        style: { ...FRAME_STYLE, cursor: ready ? 'crosshair' : 'progress' },
      },
      h('img', {
        ref: imageRef,
        src: capture.url,
        alt: '',
        draggable: false,
        onLoad: () => setReady(true),
        style: {
          display: 'block',
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 160px)',
          width: 'auto',
          height: 'auto',
          pointerEvents: 'none',
          userSelect: 'none',
        },
      }),
      selection),
      h('div', { className: 'dsh-screenshot-toolbar', style: TOOLBAR_STYLE },
      h('span', {
        style: {
          flex: '1 1 auto',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--dsw-alias-label-secondary)',
        },
      }, t('selectionHint')),
      rect === null ? null : toolbarButton(t('selectAll'), () => setRect(null), false, false),
      toolbarButton(t('cancel'), () => closeCapture(undefined), false, false),
      toolbarButton(t('save'), confirmSelection, true, !ready)))
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => () => {
          const capture = store.getSnapshot().capture
          if (capture !== null) URL.revokeObjectURL(capture.url)
        }, 'dsh-screenshot: release capture')
        const disposers = []
        ctx.effect(() => {
          disposers.push(ctx.locale.register(NAMESPACE, 'en', DICTIONARIES.en))
          disposers.push(ctx.locale.register(NAMESPACE, 'zh', DICTIONARIES.zh))
          return () => {
            for (const dispose of disposers.splice(0)) dispose()
          }
        }, 'dsh-screenshot: dictionaries')
        const t = ctx.locale.bind(NAMESPACE)
        ctx.slots.inject(BUTTON_SLOT, () => ctx.slots.register({
          name: BUTTON_SLOT,
          id: ENTRY_ID,
          order: 10,
          label: () => t('action'),
          locale: NAMESPACE,
        }, ScreenshotButton))
        ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register({
          name: OVERLAY_SLOT,
          id: ENTRY_ID,
          order: 1000,
          label: () => t('selecting'),
          locale: NAMESPACE,
        }, ScreenshotOverlay))
      },
    }
  },
})
