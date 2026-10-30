/**
 * Browser half of the Sticky notes bundle.
 *
 * Two surfaces share one browser-local board:
 *
 * - a docked sticky-note board on the right edge of the shell overlay, where
 *   the user creates, edits, completes, recolours and deletes todo notes, and
 *   which can be collapsed to a small edge tab;
 * - a "便利签 / Sticky notes" page in Settings that controls the wind-sway
 *   effect, its intensity, the default paper colour, and clearing the board.
 *
 * The board lives in this browser's `localStorage` (key
 * `@local/dsh-sticky-notes:board.v1`), so it survives reloads and follows the
 * same browser profile. The Host half (`index.js`) is empty.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-sticky-notes',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PLUGIN_ID = '@local/dsh-sticky-notes'
    const NAMESPACE = 'dsh-sticky-notes'
    const OVERLAY_SLOT = 'shell.overlay'
    const SETTINGS_SLOT = 'settings.section'
    const STORAGE_KEY = `${PLUGIN_ID}:board.v1`
    const BOARD_VERSION = 1

    const PRIORITIES = ['high', 'medium', 'low']
    const IMPORTANCES = ['critical', 'normal', 'minor']
    const INTENSITIES = ['gentle', 'lively']

    /** Paper palettes: `classic` is the standard sticky-note yellow. */
    const PALETTE = [
      { id: 'classic', hex: '#f6e27a' },
      { id: 'rose', hex: '#f6c9d4' },
      { id: 'mint', hex: '#c8e8cf' },
      { id: 'sky', hex: '#c6ddf2' },
      { id: 'lavender', hex: '#ddd0f0' },
      { id: 'peach', hex: '#f7cfad' },
      { id: 'cream', hex: '#f1e9d2' },
      { id: 'graphite', hex: '#d3d7dd' },
    ]
    const PALETTE_BY_ID = new Map(PALETTE.map(entry => [entry.id, entry]))
    const CUSTOM_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

    const DEFAULT_SETTINGS = { sway: true, intensity: 'gentle', defaultColor: 'classic' }

    /** Display copy; every other locale falls back to English per key. */
    const DICTIONARIES = {
      en: {
        nav: 'Sticky notes',
        'panel.title': 'Sticky notes',
        'panel.subtitle': '{count} open',
        'launcher.count': '{count} open',
        'search.placeholder': 'Search notes',
        'search.clear': 'Clear search',
        'filter.all': 'All dates',
        'filter.today': 'Today',
        'filter.week': 'Last 7 days',
        'filter.dateLabel': 'Filter by date',
        'filter.results': '{count} found',
        'filter.clear': 'Clear filters',
        'filter.emptyTitle': 'Nothing matches',
        'filter.emptyDescription': 'Try another keyword or date.',
        'archive.count': 'Done · {count}',
        'archive.show': 'Show done notes',
        'archive.hide': 'Hide done notes',
        'archive.empty': 'Nothing archived here.',
        'note.completedOn': 'Done {date}',
        'action.add': 'New todo',
        'action.hide': 'Hide sticky notes',
        'action.show': 'Show sticky notes',
        'action.settings': 'Sticky note settings',
        'action.save': 'Save',
        'action.cancel': 'Cancel',
        'action.delete': 'Delete',
        'action.edit': 'Edit',
        'action.confirmDelete': 'Click again to delete',
        'editor.new': 'New todo',
        'editor.edit': 'Edit todo',
        'editor.placeholder': 'What needs doing?',
        'editor.priority': 'Priority',
        'editor.importance': 'Importance',
        'editor.color': 'Paper colour',
        'editor.customColor': 'Custom colour',
        'editor.hint': '⌘/Ctrl + Enter saves, Esc cancels',
        'priority.high': 'High',
        'priority.medium': 'Medium',
        'priority.low': 'Low',
        'importance.critical': 'Important',
        'importance.normal': 'Normal',
        'importance.minor': 'Minor',
        'note.done': 'Mark done',
        'note.undoDone': 'Mark not done',
        'empty.title': 'No sticky notes yet',
        'empty.allDone': 'All done — the archive is right below.',
        'empty.noActiveMatches': 'No open notes match these filters.',
        'empty.description': 'Write down the first thing to do — it stays pinned on the right.',
        'empty.action': 'Write the first one',
        'color.classic': 'Classic yellow',
        'color.rose': 'Rose',
        'color.mint': 'Mint',
        'color.sky': 'Sky',
        'color.lavender': 'Lavender',
        'color.peach': 'Peach',
        'color.cream': 'Cream',
        'color.graphite': 'Graphite',
        'color.custom': 'Custom',
        'intensity.gentle': 'Gentle',
        'intensity.lively': 'Lively',
        'settings.sway': 'Wind sway',
        'settings.swayDescription': 'Notes sway gently as if hanging on a board. Turn this off for a completely still board.',
        'settings.intensity': 'Sway amount',
        'settings.defaultColor': 'Default paper colour',
        'settings.windEnable': 'Turn wind sway on',
        'settings.windDisable': 'Turn wind sway off',
        'settings.moreInSettings': 'More options: Settings → Sticky notes',
        'section.title': 'Sticky notes',
        'section.description': 'A todo board pinned to the right edge of the window. Each note can carry a priority, an importance level and its own paper colour; the board can be hidden at any time. Everything stays in this browser.',
        'section.appearance': 'Paper and motion',
        'section.data': 'Data',
        'section.stats': '{total} notes · {open} open',
        'section.storage': 'Notes are stored in this browser\'s localStorage. Export or back them up yourself before switching browsers or clearing site data.',
        'section.clear': 'Clear all sticky notes',
        'section.clearConfirm': 'Click again to clear everything',
        'section.cleared': 'All sticky notes cleared.',
      },
      zh: {
        nav: '便利签',
        'panel.title': '便利签',
        'panel.subtitle': '{count} 条未完成',
        'launcher.count': '{count} 条未完成',
        'search.placeholder': '搜索便利签',
        'search.clear': '清除搜索',
        'filter.all': '全部',
        'filter.today': '今天',
        'filter.week': '7 天内',
        'filter.dateLabel': '按日期筛选',
        'filter.results': '找到 {count} 条',
        'filter.clear': '清除筛选',
        'filter.emptyTitle': '没有匹配的便利签',
        'filter.emptyDescription': '换个关键字或日期试试。',
        'archive.count': '已完成 · {count}',
        'archive.show': '展开已完成',
        'archive.hide': '收起已完成',
        'archive.empty': '这里还没有已完成的便利签。',
        'note.completedOn': '完成于 {date}',
        'action.add': '新建待办',
        'action.hide': '收起便利签',
        'action.show': '打开便利签',
        'action.settings': '便利签设置',
        'action.save': '保存',
        'action.cancel': '取消',
        'action.delete': '删除',
        'action.edit': '编辑',
        'action.confirmDelete': '再点一次删除',
        'editor.new': '新建待办',
        'editor.edit': '编辑待办',
        'editor.placeholder': '要做的事…',
        'editor.priority': '优先级',
        'editor.importance': '重要程度',
        'editor.color': '便签底色',
        'editor.customColor': '自定义颜色',
        'editor.hint': '⌘/Ctrl + Enter 保存，Esc 取消',
        'priority.high': '高',
        'priority.medium': '中',
        'priority.low': '低',
        'importance.critical': '重要',
        'importance.normal': '一般',
        'importance.minor': '次要',
        'note.done': '标记完成',
        'note.undoDone': '取消完成',
        'empty.title': '还没有便利签',
        'empty.allDone': '全部完成，归档就在下面。',
        'empty.noActiveMatches': '没有匹配的未完成事项。',
        'empty.description': '写下第一件要做的事，它会一直贴在右边。',
        'empty.action': '写第一条',
        'color.classic': '经典黄',
        'color.rose': '玫瑰粉',
        'color.mint': '薄荷绿',
        'color.sky': '天空蓝',
        'color.lavender': '薰衣草',
        'color.peach': '蜜桃橙',
        'color.cream': '米白',
        'color.graphite': '石墨灰',
        'color.custom': '自定义',
        'intensity.gentle': '轻柔',
        'intensity.lively': '明显',
        'settings.sway': '随风飘动',
        'settings.swayDescription': '便利签会像挂在板子上一样轻轻摇曳；关闭后完全静止。',
        'settings.intensity': '飘动幅度',
        'settings.defaultColor': '新便签默认底色',
        'settings.windEnable': '开启随风飘动',
        'settings.windDisable': '关闭随风飘动',
        'settings.moreInSettings': '更多选项：设置 → 便利签',
        'section.title': '便利签',
        'section.description': '挂在窗口右侧的待办板。每条便利签都能标注优先级、重要程度并单独设置底色，面板可随时收起；所有内容保存在当前浏览器。',
        'section.appearance': '纸面与动效',
        'section.data': '数据',
        'section.stats': '{total} 条便利签 · {open} 条未完成',
        'section.storage': '便利签保存在当前浏览器的 localStorage 中；换浏览器或清理站点数据前请自行备份。',
        'section.clear': '清空全部便利签',
        'section.clearConfirm': '再点一次，清空全部',
        'section.cleared': '已清空全部便利签。',
      },
    }

    /* ------------------------------------------------------------------ *
     * Normalisation and persistence
     * ------------------------------------------------------------------ */

    /** @param {unknown} value - candidate record. @returns {boolean} whether it is a plain object. */
    function isRecord(value) {
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    }

    /** @returns {string} a fresh note id. */
    function nextId() {
      const cryptoObject = typeof crypto === 'undefined' ? undefined : crypto
      if (cryptoObject !== undefined && typeof cryptoObject.randomUUID === 'function') {
        return cryptoObject.randomUUID()
      }
      return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    }

    /**
     * Resolve a stored colour to a palette id or a custom hex colour.
     * @param {unknown} value - stored colour.
     * @param {string} [fallback] - value used when the input is invalid.
     * @returns {string} palette id or `#rrggbb`.
     */
    function resolveColor(value, fallback = 'classic') {
      if (typeof value === 'string') {
        if (PALETTE_BY_ID.has(value)) return value
        if (CUSTOM_COLOR_PATTERN.test(value)) return value.toLowerCase()
      }
      return fallback
    }

    /**
     * The CSS colour behind a stored colour value.
     * @param {string} color - palette id or hex colour.
     * @returns {string} hex colour.
     */
    function colorHex(color) {
      const entry = PALETTE_BY_ID.get(color)
      return entry === undefined ? color : entry.hex
    }

    /** @param {unknown} value - candidate. @returns {string} a valid priority. */
    function normalizePriority(value) {
      return typeof value === 'string' && PRIORITIES.includes(value) ? value : 'medium'
    }

    /** @param {unknown} value - candidate. @returns {string} a valid importance. */
    function normalizeImportance(value) {
      return typeof value === 'string' && IMPORTANCES.includes(value) ? value : 'normal'
    }

    /**
     * Build one safe note from stored data.
     * @param {unknown} raw - stored note.
     * @returns {object | null} the note, or null when it has no text.
     */
    function normalizeNote(raw) {
      if (!isRecord(raw)) return null
      const text = typeof raw.text === 'string' ? raw.text.slice(0, 4000) : ''
      if (text.trim().length === 0) return null
      const now = Date.now()
      return {
        id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : nextId(),
        text,
        priority: normalizePriority(raw.priority),
        importance: normalizeImportance(raw.importance),
        color: resolveColor(raw.color),
        done: raw.done === true,
        completedAt: raw.done === true
          ? (Number.isFinite(raw.completedAt) ? raw.completedAt : (Number.isFinite(raw.createdAt) ? raw.createdAt : now))
          : null,
        createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : now,
        updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : now,
      }
    }

    /**
     * Build safe settings from stored data.
     * @param {unknown} raw - stored settings.
     * @returns {{sway: boolean, intensity: string, defaultColor: string}} sanitized settings.
     */
    function normalizeSettings(raw) {
      const source = isRecord(raw) ? raw : {}
      return {
        sway: source.sway !== false,
        intensity: typeof source.intensity === 'string' && INTENSITIES.includes(source.intensity)
          ? source.intensity
          : DEFAULT_SETTINGS.intensity,
        defaultColor: resolveColor(source.defaultColor, DEFAULT_SETTINGS.defaultColor),
      }
    }

    /**
     * Build a safe board from stored data; bad data degrades to an empty board.
     * @param {unknown} raw - parsed storage value.
     * @returns {object} the normalized board.
     */
    function normalizeBoard(raw) {
      const source = isRecord(raw) ? raw : {}
      const notes = []
      const seen = new Set()
      if (Array.isArray(source.notes)) {
        for (const candidate of source.notes) {
          const note = normalizeNote(candidate)
          if (note === null || seen.has(note.id)) continue
          seen.add(note.id)
          notes.push(note)
        }
      }
      return {
        version: BOARD_VERSION,
        notes,
        settings: normalizeSettings(source.settings),
        ui: {
          open: isRecord(source.ui) ? source.ui.open === true : true,
          archiveOpen: isRecord(source.ui) ? source.ui.archiveOpen === true : false,
        },
      }
    }

    /** @returns {object} the board read from this browser, or a fresh one. */
    function loadBoard() {
      if (typeof window === 'undefined' || window.localStorage === undefined) return normalizeBoard(null)
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        return normalizeBoard(raw === null ? null : JSON.parse(raw))
      } catch (error) {
        console.debug(`${PLUGIN_ID}: reading the saved board failed`, error)
        return normalizeBoard(null)
      }
    }

    /** @param {object} board - board to persist. */
    function writeBoard(board) {
      if (typeof window === 'undefined' || window.localStorage === undefined) return
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
      } catch (error) {
        console.debug(`${PLUGIN_ID}: saving the board failed`, error)
      }
    }

    /* ------------------------------------------------------------------ *
     * Stores
     * ------------------------------------------------------------------ */

    /**
     * Create a minimal external store for `useSyncExternalStore`.
     * @param {object} initial - initial snapshot.
     * @returns {{getSnapshot: () => object, subscribe: (listener: () => void) => () => void, set: (next: object) => void}} the store.
     */
    function createStore(initial) {
      let state = initial
      const listeners = new Set()
      return {
        getSnapshot: () => state,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        set: (next) => {
          if (next === state) return
          state = next
          for (const listener of [...listeners]) listener()
        },
      }
    }

    /** The browser-local note board. */
    const boardStore = createStore(loadBoard())

    /**
     * Persist and publish one board replacement.
     * @param {(current: object) => object} updater - produces the next board.
     */
    function updateBoard(updater) {
      const next = normalizeBoard(updater(boardStore.getSnapshot()))
      boardStore.set(next)
      writeBoard(next)
    }

    /* ------------------------------------------------------------------ *
     * Board helpers
     * ------------------------------------------------------------------ */

    const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }
    const IMPORTANCE_RANK = { critical: 0, normal: 1, minor: 2 }

    /**
     * Open notes first, then by priority, importance and newest first.
     * @param {object[]} notes - notes to order.
     * @returns {object[]} a new ordered array.
     */
    function sortActiveNotes(notes) {
      return [...notes].sort((left, right) =>
        PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority]
        || IMPORTANCE_RANK[left.importance] - IMPORTANCE_RANK[right.importance]
        || right.createdAt - left.createdAt)
    }

    /**
     * Archived notes: most recently completed first.
     * @param {object[]} notes - archived notes.
     * @returns {object[]} a new ordered array.
     */
    function sortArchivedNotes(notes) {
      return [...notes].sort((left, right) =>
        (right.completedAt === null ? right.updatedAt : right.completedAt)
        - (left.completedAt === null ? left.updatedAt : left.completedAt))
    }

    const DAY_MS = 24 * 60 * 60 * 1000

    /**
     * Local midnight of a timestamp.
     * @param {number} timestamp - any timestamp.
     * @returns {number} local start of that day.
     */
    function startOfDay(timestamp) {
      const date = new Date(timestamp)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    }

    /**
     * Short localized date label.
     * @param {number} timestamp - any timestamp.
     * @returns {string} date text.
     */
    function formatDate(timestamp) {
      try {
        return new Intl.DateTimeFormat(undefined, { month: 'numeric', day: 'numeric' }).format(timestamp)
      } catch (error) {
        const date = new Date(timestamp)
        return `${date.getMonth() + 1}/${date.getDate()}`
      }
    }

    /**
     * Resolve the active date filter to a local half-open range.
     * @param {string} kind - `all`, `today`, `week`, or `date`.
     * @param {string} customDate - `YYYY-MM-DD` when kind is `date`.
     * @returns {[number, number] | null} the range, or null for all dates.
     */
    function dateFilterRange(kind, customDate) {
      const today = startOfDay(Date.now())
      if (kind === 'today') return [today, today + DAY_MS]
      if (kind === 'week') return [today - 6 * DAY_MS, today + DAY_MS]
      if (kind === 'date') {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(customDate)
        if (match === null) return null
        const start = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime()
        if (!Number.isFinite(start)) return null
        return [start, start + DAY_MS]
      }
      return null
    }

    /**
     * Keyword match over note text.
     * @param {object} note - note to test.
     * @param {string} query - user keyword.
     * @returns {boolean} whether the note matches.
     */
    function matchesQuery(note, query) {
      const keyword = query.trim().toLowerCase()
      if (keyword.length === 0) return true
      return note.text.toLowerCase().includes(keyword)
    }

    /**
     * Date match on the note's creation day.
     * @param {object} note - note to test.
     * @param {[number, number] | null} range - local day range.
     * @returns {boolean} whether the note matches.
     */
    function matchesDate(note, range) {
      if (range === null) return true
      return note.createdAt >= range[0] && note.createdAt < range[1]
    }

    /**
     * Stable tilt derived from the note id; every note then shares the board's
     * one wind cycle so a full board sways together.
     * @param {string} id - note id.
     * @returns {string} CSS rotation for this note.
     */
    function noteTilt(id) {
      let hash = 0
      for (let index = 0; index < id.length; index += 1) {
        hash = (Math.imul(hash, 31) + id.charCodeAt(index)) | 0
      }
      const positive = Math.abs(hash)
      return `${(((positive % 9) - 4) * 0.16).toFixed(2)}deg`
    }

    /**
     * Inline style for one note.
     * @param {object} note - the note.
     * @returns {object} CSS custom properties for the note.
     */
    function noteStyle(note) {
      return { '--note-color': colorHex(note.color), '--note-tilt': noteTilt(note.id) }
    }

    /**
     * Board-wide wind cycle for the current intensity.
     * @param {string} intensity - `gentle` or `lively`.
     * @returns {{angle: string, duration: string}} CSS values shared by every note.
     */
    function windCycle(intensity) {
      return intensity === 'lively'
        ? { angle: '2.8deg', duration: '4.2s' }
        : { angle: '1.35deg', duration: '5.8s' }
    }

    /* ------------------------------------------------------------------ *
     * Icons
     * ------------------------------------------------------------------ */

    /**
     * One stroked 24×24 glyph.
     * @param {{children?: object, size?: number}} props - path children and size.
     * @returns {object} the svg element.
     */
    function Glyph({ children, size = 16 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      }, children)
    }

    const iconPlus = () => h(Glyph, null, h('path', { d: 'M12 5v14M5 12h14' }))
    const iconClose = () => h(Glyph, null, h('path', { d: 'M6 6l12 12M18 6L6 18' }))
    const iconChevronRight = () => h(Glyph, null, h('path', { d: 'M9 5l7 7-7 7' }))
    const iconChevronDown = () => h(Glyph, null, h('path', { d: 'M5 9l7 7 7-7' }))
    const iconSearch = (size = 15) => h(Glyph, { size }, h('circle', { cx: 11, cy: 11, r: 6 }), h('path', { d: 'M15.5 15.5L21 21' }))
    const iconCalendar = (size = 14) => h(Glyph, { size },
      h('rect', { x: 4, y: 5.5, width: 16, height: 15, rx: 2.5 }),
      h('path', { d: 'M8 3.5v4M16 3.5v4M4 10.5h16' }))
    const iconGear = () => h(Glyph, null,
      h('path', { d: 'M4 7h9M17 7h3M4 17h3M11 17h9' }),
      h('circle', { cx: 15, cy: 7, r: 2.2 }),
      h('circle', { cx: 9, cy: 17, r: 2.2 }))
    const iconWind = () => h(Glyph, null,
      h('path', { d: 'M3 8h11a3 3 0 1 0-3-3' }),
      h('path', { d: 'M3 12h15a3 3 0 1 1-3 3' }),
      h('path', { d: 'M3 16h6' }))
    const iconCheck = () => h(Glyph, null, h('path', { d: 'M4.5 12.5l5 5 10-11' }))
    const iconTrash = () => h(Glyph, null,
      h('path', { d: 'M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13' }),
      h('path', { d: 'M10 11v5.5M14 11v5.5' }))
    const iconPencil = () => h(Glyph, null,
      h('path', { d: 'M4 20h4L19 9l-4-4L4 16v4z' }),
      h('path', { d: 'M13.5 6.5l4 4' }))
    const iconFlag = (size = 11) => h(Glyph, { size }, h('path', { d: 'M6 21V4M6 4h11l-2.5 4L17 12H6' }))
    const iconStar = (size = 11) => h(Glyph, { size }, h('path', { d: 'M12 3.5l2.6 5.3 5.9.9-4.2 4.2 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.2 5.9-.9z' }))
    const iconNote = (size = 18) => h(Glyph, { size }, h('path', { d: 'M6 4h9l4 4v12H6z' }), h('path', { d: 'M15 4v4h4M9 12h7M9 16h5' }))

    /* ------------------------------------------------------------------ *
     * Controls shared by the board popover and the Settings page
     * ------------------------------------------------------------------ */

    /**
     * Round switch with an accessible role.
     * @param {{checked: boolean, onChange: (next: boolean) => void, label: string}} props - switch state and label.
     * @returns {object} the switch button.
     */
    function Switch({ checked, onChange, label }) {
      return h('button', {
        type: 'button',
        role: 'switch',
        'aria-checked': checked,
        'aria-label': label,
        className: `dsh-sticky-switch${checked ? ' dsh-sticky-switch-on' : ''}`,
        'data-setting': 'sway',
        onClick: () => { onChange(!checked) },
      }, h('span', { className: 'dsh-sticky-switch-thumb', 'aria-hidden': 'true' }))
    }

    /**
     * Two-option intensity selector.
     * @param {{t: Function, value: string, disabled?: boolean, onChange: (next: string) => void}} props - current intensity.
     * @returns {object} the segmented control.
     */
    function IntensityControl({ t, value, disabled = false, onChange }) {
      return h('div', {
        className: 'dsh-sticky-segmented',
        role: 'group',
        'aria-label': t('settings.intensity'),
        'data-setting': 'intensity',
      }, INTENSITIES.map(intensity => h('button', {
        key: intensity,
        type: 'button',
        className: `dsh-sticky-seg${value === intensity ? ' dsh-sticky-seg-active' : ''}`,
        'aria-pressed': value === intensity,
        disabled,
        'data-intensity-option': intensity,
        onClick: () => { onChange(intensity) },
      }, t(`intensity.${intensity}`))))
    }

    /**
     * Palette swatches for the default paper colour.
     * @param {{t: Function, value: string, onChange: (next: string) => void}} props - current colour.
     * @returns {object} the swatch row.
     */
    function DefaultColorControl({ t, value, onChange }) {
      return h('div', {
        className: 'dsh-sticky-swatches',
        role: 'group',
        'aria-label': t('settings.defaultColor'),
        'data-setting': 'defaultColor',
      }, PALETTE.map(entry => h('button', {
        key: entry.id,
        type: 'button',
        className: `dsh-sticky-swatch${value === entry.id ? ' dsh-sticky-swatch-active' : ''}`,
        style: { '--swatch-color': entry.hex },
        title: t(`color.${entry.id}`),
        'aria-label': t(`color.${entry.id}`),
        'aria-pressed': value === entry.id,
        'data-color-id': entry.id,
        onClick: () => { onChange(entry.id) },
      }, value === entry.id ? h('span', { className: 'dsh-sticky-swatch-check' }, iconCheck()) : null)))
    }

    /* ------------------------------------------------------------------ *
     * Note card and inline editor
     * ------------------------------------------------------------------ */

    /**
     * Delete control that arms itself on the first press.
     * @param {{t: Function, onDelete: () => void}} props - copy and delete callback.
     * @returns {object} the delete button.
     */
    function DeleteNoteButton({ t, onDelete }) {
      const [armed, setArmed] = React.useState(false)
      React.useEffect(() => {
        if (!armed) return undefined
        const timer = setTimeout(() => { setArmed(false) }, 2600)
        return () => { clearTimeout(timer) }
      }, [armed])
      return h('button', {
        type: 'button',
        className: `dsh-sticky-icon-btn dsh-sticky-icon-danger${armed ? ' dsh-sticky-armed' : ''}`,
        title: armed ? t('action.confirmDelete') : t('action.delete'),
        'aria-label': armed ? t('action.confirmDelete') : t('action.delete'),
        'data-armed': armed ? 'true' : 'false',
        'data-action': 'delete',
        onClick: (event) => {
          event.stopPropagation()
          if (armed) onDelete()
          else setArmed(true)
        },
      }, iconTrash())
    }

    /**
     * One rendered sticky note.
     * @param {{t: Function, note: object, archived?: boolean, onToggleDone: Function, onEdit: Function, onDelete: Function}} props - note and actions.
     * @returns {object} the note article.
     */
    function StickyNoteCard({ t, note, archived = false, onToggleDone, onEdit, onDelete }) {
      return h('article', {
        className: `dsh-sticky-note${note.done ? ' dsh-sticky-note-done' : ''}`,
        style: noteStyle(note),
        'data-note-id': note.id,
        'data-archived': archived ? 'true' : 'false',
        'data-priority': note.priority,
        'data-importance': note.importance,
        'data-color': note.color,
        'data-done': note.done ? 'true' : 'false',
      },
      h('span', { className: 'dsh-sticky-tape', 'aria-hidden': 'true' }),
      h('div', { className: 'dsh-sticky-note-top' },
        h('button', {
          type: 'button',
          role: 'checkbox',
          'aria-checked': note.done,
          'aria-label': note.done ? t('note.undoDone') : t('note.done'),
          className: 'dsh-sticky-check',
          'data-action': 'toggle-done',
          onClick: () => { onToggleDone(note.id) },
        }, note.done ? iconCheck() : null),
        h('div', { className: 'dsh-sticky-badges' },
          h('span', {
            className: `dsh-sticky-badge dsh-sticky-priority-${note.priority}`,
            title: `${t('editor.priority')}: ${t(`priority.${note.priority}`)}`,
            'data-badge': 'priority',
          }, iconFlag(), t(`priority.${note.priority}`)),
          h('span', {
            className: `dsh-sticky-badge dsh-sticky-importance-${note.importance}`,
            title: `${t('editor.importance')}: ${t(`importance.${note.importance}`)}`,
            'data-badge': 'importance',
          }, iconStar(), t(`importance.${note.importance}`))),
        h('div', { className: 'dsh-sticky-note-actions' },
          h('button', {
            type: 'button',
            className: 'dsh-sticky-icon-btn',
            title: t('action.edit'),
            'aria-label': t('action.edit'),
            'data-action': 'edit',
            onClick: () => { onEdit(note) },
          }, iconPencil()),
          h(DeleteNoteButton, { t, onDelete: () => { onDelete(note.id) } }))),
      h('p', { className: 'dsh-sticky-note-text', title: note.text }, note.text),
      h('div', { className: 'dsh-sticky-note-foot' },
        h('span', { className: 'dsh-sticky-note-date' },
          note.done && note.completedAt !== null
            ? t('note.completedOn', { date: formatDate(note.completedAt) })
            : formatDate(note.createdAt))))
    }

    /**
     * Inline editor for one note (new or existing).
     * @param {object} props - t, initial values, settings, and callbacks.
     * @returns {object} the editor form.
     */
    function NoteEditor({ t, initial, settings, onSave, onCancel, onDelete }) {
      const [text, setText] = React.useState(initial.text)
      const [priority, setPriority] = React.useState(initial.priority)
      const [importance, setImportance] = React.useState(initial.importance)
      const [color, setColor] = React.useState(initial.color)
      const [armedDelete, setArmedDelete] = React.useState(false)
      const textareaRef = React.useRef(null)
      const canSave = text.trim().length > 0

      React.useEffect(() => {
        if (!armedDelete) return undefined
        const timer = setTimeout(() => { setArmedDelete(false) }, 3200)
        return () => { clearTimeout(timer) }
      }, [armedDelete])

      React.useEffect(() => {
        const element = textareaRef.current
        if (element === null) return
        element.focus()
        element.setSelectionRange(element.value.length, element.value.length)
      }, [])

      const save = () => {
        if (!canSave) return
        onSave({ text: text.trim(), priority, importance, color })
      }

      const onKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
          return
        }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          save()
        }
      }

      const colorInputValue = CUSTOM_COLOR_PATTERN.test(color) ? color : colorHex(color)

      return h('form', {
        className: 'dsh-sticky-editor',
        style: { '--note-color': colorHex(color) },
        'data-editor': 'card',
        onSubmit: (event) => { event.preventDefault(); save() },
        onKeyDown,
      },
      h('div', { className: 'dsh-sticky-editor-head' },
        h('span', { className: 'dsh-sticky-editor-title' }, initial.id === undefined ? t('editor.new') : t('editor.edit'))),
      h('textarea', {
        ref: textareaRef,
        className: 'dsh-sticky-textarea',
        value: text,
        rows: 3,
        placeholder: t('editor.placeholder'),
        'aria-label': t('editor.placeholder'),
        'data-editor': 'text',
        onChange: (event) => { setText(event.target.value) },
      }),
      h('div', { className: 'dsh-sticky-field' },
        h('span', { className: 'dsh-sticky-field-label' }, t('editor.priority')),
        h('div', { className: 'dsh-sticky-segmented', role: 'group', 'aria-label': t('editor.priority') },
          PRIORITIES.map(value => h('button', {
            key: value,
            type: 'button',
            className: `dsh-sticky-seg${priority === value ? ' dsh-sticky-seg-active' : ''}`,
            'aria-pressed': priority === value,
            'data-priority-option': value,
            onClick: () => { setPriority(value) },
          }, h('i', { className: `dsh-sticky-dot dsh-sticky-dot-${value}`, 'aria-hidden': 'true' }), t(`priority.${value}`))))),
      h('div', { className: 'dsh-sticky-field' },
        h('span', { className: 'dsh-sticky-field-label' }, t('editor.importance')),
        h('div', { className: 'dsh-sticky-segmented', role: 'group', 'aria-label': t('editor.importance') },
          IMPORTANCES.map(value => h('button', {
            key: value,
            type: 'button',
            className: `dsh-sticky-seg${importance === value ? ' dsh-sticky-seg-active' : ''}`,
            'aria-pressed': importance === value,
            'data-importance-option': value,
            onClick: () => { setImportance(value) },
          }, t(`importance.${value}`))))),
      h('div', { className: 'dsh-sticky-field' },
        h('span', { className: 'dsh-sticky-field-label' }, t('editor.color')),
        h('div', { className: 'dsh-sticky-swatches' },
          PALETTE.map(entry => h('button', {
            key: entry.id,
            type: 'button',
            className: `dsh-sticky-swatch dsh-sticky-swatch-sm${color === entry.id ? ' dsh-sticky-swatch-active' : ''}`,
            style: { '--swatch-color': entry.hex },
            title: t(`color.${entry.id}`),
            'aria-label': t(`color.${entry.id}`),
            'aria-pressed': color === entry.id,
            'data-color-id': entry.id,
            onClick: () => { setColor(entry.id) },
          }, null)),
          h('label', {
            className: `dsh-sticky-custom-color${CUSTOM_COLOR_PATTERN.test(color) ? ' dsh-sticky-swatch-active' : ''}`,
            title: t('editor.customColor'),
          },
          h('input', {
            type: 'color',
            value: colorInputValue,
            'aria-label': t('editor.customColor'),
            'data-editor': 'custom-color',
            onChange: (event) => { setColor(resolveColor(event.target.value, colorHex(color)).toLowerCase()) },
          }),
          h('span', { 'aria-hidden': 'true' }, iconPlus())))),
      h('div', { className: 'dsh-sticky-editor-actions' },
        h('button', {
          type: 'submit',
          className: 'dsh-sticky-btn dsh-sticky-btn-primary',
          disabled: !canSave,
          'data-action': 'save',
        }, t('action.save')),
        h('button', {
          type: 'button',
          className: 'dsh-sticky-btn',
          'data-action': 'cancel',
          onClick: onCancel,
        }, t('action.cancel')),
        onDelete === undefined
          ? null
          : h('button', {
            type: 'button',
            className: `dsh-sticky-btn dsh-sticky-btn-danger${armedDelete ? ' dsh-sticky-btn-armed' : ''}`,
            'data-action': 'editor-delete',
            'data-armed': armedDelete ? 'true' : 'false',
            onClick: () => {
              if (armedDelete) onDelete()
              else setArmedDelete(true)
            },
          }, armedDelete ? t('action.confirmDelete') : t('action.delete'))),
      h('p', { className: 'dsh-sticky-editor-hint' }, t('editor.hint')))
    }

    /* ------------------------------------------------------------------ *
     * Right-edge dock
     * ------------------------------------------------------------------ */

    /**
     * Inline settings popover inside the board header.
     * @param {{t: Function, settings: object, onChange: Function}} props - board settings.
     * @returns {object} the popover.
     */
    function BoardSettingsPopover({ t, settings, onChange }) {
      return h('div', { className: 'dsh-sticky-popover', role: 'dialog', 'aria-label': t('action.settings') },
        h('div', { className: 'dsh-sticky-popover-row' },
          h('div', { className: 'dsh-sticky-popover-copy' },
            h('div', { className: 'dsh-sticky-popover-title' }, t('settings.sway')),
            h('div', { className: 'dsh-sticky-popover-desc' }, t('settings.swayDescription'))),
          h(Switch, {
            checked: settings.sway,
            label: settings.sway ? t('settings.windDisable') : t('settings.windEnable'),
            onChange: (sway) => { onChange({ sway }) },
          })),
        h('div', { className: 'dsh-sticky-popover-row' },
          h('span', { className: 'dsh-sticky-popover-title' }, t('settings.intensity')),
          h(IntensityControl, {
            t,
            value: settings.intensity,
            disabled: !settings.sway,
            onChange: (intensity) => { onChange({ intensity }) },
          })),
        h('div', { className: 'dsh-sticky-popover-col' },
          h('span', { className: 'dsh-sticky-popover-title' }, t('settings.defaultColor')),
          h(DefaultColorControl, {
            t,
            value: settings.defaultColor,
            onChange: (defaultColor) => { onChange({ defaultColor }) },
          })),
        h('div', { className: 'dsh-sticky-popover-hint' }, t('settings.moreInSettings')))
    }

    /**
     * The docked board: a hideable panel on the right edge, or its launcher tab.
     * @param {{t: Function}} props - localized copy.
     * @returns {object} the dock.
     */
    function StickyNotesDock({ t }) {
      const board = React.useSyncExternalStore(boardStore.subscribe, boardStore.getSnapshot, boardStore.getSnapshot)
      const settings = board.settings
      const open = board.ui.open
      const archiveOpen = board.ui.archiveOpen === true
      const openCount = board.notes.filter(note => !note.done).length
      const [draft, setDraft] = React.useState(null)
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [query, setQuery] = React.useState('')
      const [dateKind, setDateKind] = React.useState('all')
      const [customDate, setCustomDate] = React.useState('')
      const rootRef = React.useRef(null)
      const wind = windCycle(settings.intensity)
      const range = dateFilterRange(dateKind, customDate)
      const filtering = query.trim().length > 0 || range !== null
      const matches = note => matchesQuery(note, query) && matchesDate(note, range)
      const activeNotes = sortActiveNotes(board.notes.filter(note => !note.done && matches(note)))
      const archivedAll = board.notes.filter(note => note.done)
      const archivedNotes = sortArchivedNotes(archivedAll.filter(matches))
      const editingNote = draft !== null && draft.mode === 'edit'
        ? board.notes.find(note => note.id === draft.id)
        : undefined
      const hasMatches = activeNotes.length > 0 || archivedNotes.length > 0

      React.useEffect(() => {
        if (!settingsOpen) return undefined
        const onPointerDown = (event) => {
          const root = rootRef.current
          if (root !== null && root.contains(event.target)) return
          setSettingsOpen(false)
        }
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          setSettingsOpen(false)
        }
        document.addEventListener('mousedown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('mousedown', onPointerDown)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [settingsOpen])

      const setOpen = (value) => {
        if (!value) setDraft(null)
        setSettingsOpen(false)
        updateBoard(current => ({ ...current, ui: { ...current.ui, open: value } }))
      }

      const updateSettings = (patch) => {
        updateBoard(current => ({ ...current, settings: { ...current.settings, ...patch } }))
      }

      const toggleArchive = () => {
        updateBoard(current => ({
          ...current,
          ui: { ...current.ui, archiveOpen: current.ui.archiveOpen !== true },
        }))
      }

      const openNewEditor = () => {
        setSettingsOpen(false)
        setDraft({ mode: 'new', text: '', priority: 'medium', importance: 'normal', color: settings.defaultColor })
      }

      const saveDraft = (value) => {
        const stamp = Date.now()
        if (draft !== null && draft.mode === 'edit' && draft.id !== undefined) {
          const id = draft.id
          updateBoard(current => ({
            ...current,
            notes: current.notes.map(note => note.id === id
              ? { ...note, ...value, updatedAt: stamp }
              : note),
          }))
        } else {
          updateBoard(current => ({
            ...current,
            notes: [
              {
                id: nextId(),
                ...value,
                done: false,
                completedAt: null,
                createdAt: stamp,
                updatedAt: stamp,
              },
              ...current.notes,
            ],
          }))
        }
        setDraft(null)
      }

      const deleteNote = (id) => {
        updateBoard(current => ({ ...current, notes: current.notes.filter(note => note.id !== id) }))
        setDraft(current => (current !== null && current.id === id ? null : current))
      }

      const toggleDone = (id) => {
        const stamp = Date.now()
        updateBoard(current => ({
          ...current,
          notes: current.notes.map(note => note.id === id
            ? { ...note, done: !note.done, completedAt: note.done ? null : stamp, updatedAt: stamp }
            : note),
        }))
      }

      const startEdit = (note) => {
        setSettingsOpen(false)
        setDraft({ mode: 'edit', id: note.id })
      }

      const clearFilters = () => {
        setQuery('')
        setDateKind('all')
        setCustomDate('')
      }

      const editorFor = (note) => h(NoteEditor, {
        key: note.id,
        t,
        initial: note,
        settings,
        onSave: saveDraft,
        onCancel: () => { setDraft(null) },
        onDelete: () => { deleteNote(note.id) },
      })

      const cardFor = (note, archived) => h(StickyNoteCard, {
        key: note.id,
        t,
        note,
        archived,
        onToggleDone: toggleDone,
        onEdit: startEdit,
        onDelete: deleteNote,
      })

      const content = []
      if (draft !== null && draft.mode === 'new') {
        content.push(h(NoteEditor, {
          key: 'new-note',
          t,
          initial: draft,
          settings,
          onSave: saveDraft,
          onCancel: () => { setDraft(null) },
        }))
      }
      if (editingNote !== undefined) content.push(editorFor(editingNote))

      const archivedCards = archivedNotes
        .filter(note => editingNote === undefined || note.id !== editingNote.id)
        .map(note => cardFor(note, true))
      const showArchive = archivedAll.length > 0 && (!filtering || archivedNotes.length > 0)

      if (board.notes.length === 0 && draft === null) {
        content.push(h('div', { className: 'dsh-sticky-empty' },
          h('div', { className: 'dsh-sticky-empty-note', 'aria-hidden': 'true' }, iconNote(28)),
          h('div', { className: 'dsh-sticky-empty-title' }, t('empty.title')),
          h('div', { className: 'dsh-sticky-empty-desc' }, t('empty.description')),
          h('button', {
            type: 'button',
            className: 'dsh-sticky-btn dsh-sticky-btn-primary',
            onClick: openNewEditor,
          }, t('empty.action'))))
      } else if (filtering && !hasMatches && draft === null) {
        content.push(h('div', { className: 'dsh-sticky-empty' },
          h('div', { className: 'dsh-sticky-empty-note', 'aria-hidden': 'true' }, iconSearch(26)),
          h('div', { className: 'dsh-sticky-empty-title' }, t('filter.emptyTitle')),
          h('div', { className: 'dsh-sticky-empty-desc' }, t('filter.emptyDescription')),
          h('button', {
            type: 'button',
            className: 'dsh-sticky-btn',
            onClick: clearFilters,
          }, t('filter.clear'))))
      } else {
        for (const note of activeNotes) {
          if (editingNote !== undefined && note.id === editingNote.id) continue
          content.push(cardFor(note, false))
        }
        if (activeNotes.length === 0 && draft === null) {
          content.push(h('div', { className: 'dsh-sticky-all-done' },
            filtering ? t('empty.noActiveMatches') : t('empty.allDone')))
        }
        if (showArchive) {
          content.push(h('section', { className: 'dsh-sticky-archive', 'data-dsh-sticky': 'archive' },
            h('button', {
              type: 'button',
              className: 'dsh-sticky-archive-head',
              'aria-expanded': archiveOpen,
              'aria-label': archiveOpen ? t('archive.hide') : t('archive.show'),
              'data-action': 'toggle-archive',
              onClick: toggleArchive,
            },
            h('span', { className: 'dsh-sticky-archive-icon', 'aria-hidden': 'true' },
              archiveOpen ? iconChevronDown() : iconChevronRight()),
            h('span', { className: 'dsh-sticky-archive-label' },
              t('archive.count', { count: filtering ? archivedNotes.length : archivedAll.length })),
            h('span', { className: 'dsh-sticky-archive-hint' },
              archiveOpen ? t('archive.hide') : t('archive.show'))),
            archiveOpen
              ? h('div', { className: 'dsh-sticky-archive-list' },
                archivedCards.length === 0
                  ? h('div', { className: 'dsh-sticky-archive-empty' }, t('archive.empty'))
                  : archivedCards)
              : null))
        }
      }

      const toolbar = h('div', { className: 'dsh-sticky-toolbar', 'data-dsh-sticky': 'filters' },
        h('div', { className: 'dsh-sticky-search-wrap' },
          h('span', { className: 'dsh-sticky-search-icon', 'aria-hidden': 'true' }, iconSearch(15)),
          h('input', {
            type: 'search',
            className: 'dsh-sticky-search',
            value: query,
            placeholder: t('search.placeholder'),
            'aria-label': t('search.placeholder'),
            'data-search': 'input',
            onChange: (event) => { setQuery(event.target.value) },
          }),
          query.length === 0
            ? null
            : h('button', {
              type: 'button',
              className: 'dsh-sticky-search-clear',
              title: t('search.clear'),
              'aria-label': t('search.clear'),
              'data-action': 'clear-search',
              onClick: () => { setQuery('') },
            }, iconClose())),
        h('div', { className: 'dsh-sticky-date-row' },
          h('div', { className: 'dsh-sticky-chips', role: 'group', 'aria-label': t('filter.dateLabel') },
            h('button', {
              type: 'button',
              className: `dsh-sticky-chip${dateKind === 'all' ? ' dsh-sticky-chip-active' : ''}`,
              'aria-pressed': dateKind === 'all',
              'data-date-filter': 'all',
              onClick: () => { setDateKind('all'); setCustomDate('') },
            }, t('filter.all')),
            h('button', {
              type: 'button',
              className: `dsh-sticky-chip${dateKind === 'today' ? ' dsh-sticky-chip-active' : ''}`,
              'aria-pressed': dateKind === 'today',
              'data-date-filter': 'today',
              onClick: () => { setDateKind('today'); setCustomDate('') },
            }, t('filter.today')),
            h('button', {
              type: 'button',
              className: `dsh-sticky-chip${dateKind === 'week' ? ' dsh-sticky-chip-active' : ''}`,
              'aria-pressed': dateKind === 'week',
              'data-date-filter': 'week',
              onClick: () => { setDateKind('week'); setCustomDate('') },
            }, t('filter.week'))),
          h('label', {
            className: `dsh-sticky-date-pick${dateKind === 'date' ? ' dsh-sticky-date-pick-active' : ''}`,
            title: t('filter.dateLabel'),
          },
          h('span', { className: 'dsh-sticky-date-pick-icon', 'aria-hidden': 'true' }, iconCalendar(14)),
          h('input', {
            type: 'date',
            value: customDate,
            'aria-label': t('filter.dateLabel'),
            'data-date-filter': 'date',
            onChange: (event) => {
              const value = event.target.value
              setCustomDate(value)
              setDateKind(value.length > 0 ? 'date' : 'all')
            },
          }))),
        filtering
          ? h('div', { className: 'dsh-sticky-filter-summary' },
            h('span', null, t('filter.results', { count: activeNotes.length + archivedNotes.length })),
            h('button', {
              type: 'button',
              className: 'dsh-sticky-filter-clear',
              'data-action': 'clear-filters',
              onClick: clearFilters,
            }, t('filter.clear')))
          : null)

      const panel = h('aside', {
        className: 'dsh-sticky-panel',
        style: { pointerEvents: 'auto' },
        'data-dsh-sticky': 'panel',
        'aria-label': t('panel.title'),
      },
      h('div', { className: 'dsh-sticky-panel-head' },
        h('div', { className: 'dsh-sticky-panel-title-wrap' },
          h('span', { className: 'dsh-sticky-panel-mark', 'aria-hidden': 'true' }, iconNote(18)),
          h('div', { className: 'dsh-sticky-panel-titles' },
            h('div', { className: 'dsh-sticky-panel-title' }, t('panel.title')),
            h('div', { className: 'dsh-sticky-panel-subtitle' }, t('panel.subtitle', { count: openCount })))),
        h('div', { className: 'dsh-sticky-panel-actions' },
          h('button', {
            type: 'button',
            className: `dsh-sticky-icon-btn dsh-sticky-wind${settings.sway ? ' dsh-sticky-wind-on' : ''}`,
            title: settings.sway ? t('settings.windDisable') : t('settings.windEnable'),
            'aria-label': settings.sway ? t('settings.windDisable') : t('settings.windEnable'),
            'aria-pressed': settings.sway,
            'data-action': 'toggle-sway',
            onClick: () => { updateSettings({ sway: !settings.sway }) },
          }, iconWind()),
          h('button', {
            type: 'button',
            className: 'dsh-sticky-icon-btn',
            title: t('action.settings'),
            'aria-label': t('action.settings'),
            'aria-expanded': settingsOpen,
            'data-action': 'settings',
            onClick: (event) => { event.stopPropagation(); setSettingsOpen(value => !value) },
          }, iconGear()),
          h('button', {
            type: 'button',
            className: 'dsh-sticky-icon-btn',
            title: t('action.add'),
            'aria-label': t('action.add'),
            'data-action': 'add',
            onClick: openNewEditor,
          }, iconPlus()),
          h('button', {
            type: 'button',
            className: 'dsh-sticky-icon-btn',
            title: t('action.hide'),
            'aria-label': t('action.hide'),
            'data-action': 'hide',
            onClick: () => { setOpen(false) },
          }, iconChevronRight()))),
      toolbar,
      settingsOpen
        ? h(BoardSettingsPopover, { t, settings, onChange: updateSettings })
        : null,
      h('div', { className: 'dsh-sticky-scroll', 'data-dsh-sticky': 'list' }, content))

      const launcher = h('button', {
        type: 'button',
        className: 'dsh-sticky-launcher',
        style: { pointerEvents: 'auto' },
        title: t('action.show'),
        'aria-label': t('action.show'),
        'data-dsh-sticky': 'launcher',
        onClick: () => { setOpen(true) },
      },
      h('span', { className: 'dsh-sticky-launcher-tape', 'aria-hidden': 'true' }),
      h('span', { className: 'dsh-sticky-launcher-glyph', 'aria-hidden': 'true' }, iconNote(18)),
      h('span', { className: 'dsh-sticky-launcher-text' }, t('panel.title')),
      openCount > 0
        ? h('span', { className: 'dsh-sticky-launcher-count' }, String(openCount))
        : null)

      return h('div', {
        ref: rootRef,
        className: 'dsh-sticky-root',
        style: {
          pointerEvents: 'none',
          '--sticky-wind-angle': wind.angle,
          '--sticky-wind-duration': wind.duration,
        },
        'data-dsh-sticky': 'root',
        'data-sway': settings.sway ? 'on' : 'off',
        'data-intensity': settings.intensity,
      }, open ? panel : launcher)
    }

    /* ------------------------------------------------------------------ *
     * Settings page
     * ------------------------------------------------------------------ */

    /**
     * One settings row: copy on the left, control on the right.
     * @param {{label: string, description?: string, children?: object}} props - row content.
     * @returns {object} the row.
     */
    function SettingsRow({ label, description, children }) {
      return h('div', { className: 'dsh-sticky-row' },
        h('div', { className: 'dsh-sticky-row-copy' },
          h('div', { className: 'dsh-sticky-row-label' }, label),
          description === undefined ? null : h('div', { className: 'dsh-sticky-row-desc' }, description)),
        h('div', { className: 'dsh-sticky-row-control' }, children))
    }

    /**
     * The "Sticky notes" page in Settings.
     * @param {{t: Function}} props - localized copy.
     * @returns {object} the settings section.
     */
    function StickyNotesSettingsSection({ t }) {
      const board = React.useSyncExternalStore(boardStore.subscribe, boardStore.getSnapshot, boardStore.getSnapshot)
      const { settings, notes } = board
      const openCount = notes.filter(note => !note.done).length
      const [armedClear, setArmedClear] = React.useState(false)
      const [cleared, setCleared] = React.useState(false)

      React.useEffect(() => {
        if (!armedClear) return undefined
        const timer = setTimeout(() => { setArmedClear(false) }, 3200)
        return () => { clearTimeout(timer) }
      }, [armedClear])

      const updateSettings = (patch) => {
        updateBoard(current => ({ ...current, settings: { ...current.settings, ...patch } }))
      }

      const clearAll = () => {
        if (!armedClear) {
          setArmedClear(true)
          return
        }
        updateBoard(current => ({ ...current, notes: [] }))
        setArmedClear(false)
        setCleared(true)
        setTimeout(() => { setCleared(false) }, 2600)
      }

      return h('div', { className: 'dsh-sticky-settings', 'data-dsh-sticky': 'settings' },
        h('div', { className: 'dsh-sticky-settings-head' },
          h('h2', { className: 'dsh-sticky-settings-title' }, t('section.title')),
          h('p', { className: 'dsh-sticky-settings-desc' }, t('section.description')),
          h('div', { className: 'dsh-sticky-settings-stats' }, t('section.stats', { total: notes.length, open: openCount }))),
        h('section', { className: 'dsh-sticky-card' },
          h('h3', { className: 'dsh-sticky-card-title' }, t('section.appearance')),
          h(SettingsRow, { label: t('settings.sway'), description: t('settings.swayDescription') },
            h(Switch, {
              checked: settings.sway,
              label: settings.sway ? t('settings.windDisable') : t('settings.windEnable'),
              onChange: (sway) => { updateSettings({ sway }) },
            })),
          h(SettingsRow, { label: t('settings.intensity') },
            h(IntensityControl, {
              t,
              value: settings.intensity,
              disabled: !settings.sway,
              onChange: (intensity) => { updateSettings({ intensity }) },
            })),
          h(SettingsRow, { label: t('settings.defaultColor') },
            h(DefaultColorControl, {
              t,
              value: settings.defaultColor,
              onChange: (defaultColor) => { updateSettings({ defaultColor }) },
            }))),
        h('section', { className: 'dsh-sticky-card' },
          h('h3', { className: 'dsh-sticky-card-title' }, t('section.data')),
          h('div', { className: 'dsh-sticky-data-row' },
            h('span', { className: 'dsh-sticky-data-copy' }, t('section.storage')),
            h('button', {
              type: 'button',
              className: `dsh-sticky-btn dsh-sticky-btn-danger${armedClear ? ' dsh-sticky-btn-armed' : ''}`,
              'data-action': 'clear-all',
              onClick: clearAll,
            }, armedClear ? t('section.clearConfirm') : t('section.clear'))),
          cleared
            ? h('div', { className: 'dsh-sticky-notice' }, t('section.cleared'))
            : null))
    }

    /* ------------------------------------------------------------------ *
     * Styles
     * ------------------------------------------------------------------ */

    const STYLES = `
.dsh-sticky-root { position: absolute; inset: 0; z-index: 6; pointer-events: none; }
.dsh-sticky-panel { position: absolute; top: 56px; right: 10px; bottom: 10px; display: flex; flex-direction: column; width: min(352px, calc(100vw - 20px)); overflow: hidden; border: 0.5px solid color-mix(in srgb, var(--dsw-alias-border-l2) 70%, rgba(255, 255, 255, 0.9)); border-radius: var(--dsw-radius-panel, 16px); background: transparent; background-image: none; -webkit-backdrop-filter: blur(24px) saturate(1.45); backdrop-filter: blur(24px) saturate(1.45); box-shadow: 0 26px 64px -30px rgba(25, 20, 4, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.5); }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .dsh-sticky-panel { background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 88%, transparent); }
}
.dsh-sticky-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 11px 10px 10px 14px; border-bottom: 0.5px solid color-mix(in srgb, var(--dsw-alias-border-l2) 65%, transparent); }
.dsh-sticky-panel-title-wrap { display: flex; align-items: center; gap: 9px; min-width: 0; }
.dsh-sticky-panel-mark { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; color: #6b5410; background: linear-gradient(150deg, #f8e79b, #eed468); box-shadow: 0 2px 6px -2px rgba(90, 70, 10, 0.5); transform: rotate(-4deg); }
.dsh-sticky-panel-titles { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.dsh-sticky-panel-title { font-size: 13px; font-weight: 600; line-height: 18px; color: var(--dsw-alias-label-primary); }
.dsh-sticky-panel-subtitle { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-tertiary); }
.dsh-sticky-panel-actions { display: flex; align-items: center; gap: 1px; flex: none; }
.dsh-sticky-icon-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: none; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; cursor: pointer; }
.dsh-sticky-icon-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
@media (hover: hover) { .dsh-sticky-icon-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); } }
.dsh-sticky-wind-on { color: #a4760a; background: rgba(238, 212, 104, 0.28); }
.dsh-sticky-icon-danger { color: var(--dsw-alias-label-tertiary); }
.dsh-sticky-icon-danger.dsh-sticky-armed { color: var(--dsw-alias-state-error-primary); background: rgba(220, 80, 70, 0.12); }
@media (hover: hover) { .dsh-sticky-icon-btn.dsh-sticky-armed:hover { color: var(--dsw-alias-state-error-primary); background: rgba(220, 80, 70, 0.16); } }
.dsh-sticky-toolbar { display: flex; flex-direction: column; gap: 7px; padding: 9px 10px 9px 12px; border-bottom: 0.5px solid color-mix(in srgb, var(--dsw-alias-border-l2) 65%, transparent); }
.dsh-sticky-search-wrap { display: flex; align-items: center; gap: 6px; box-sizing: border-box; height: 28px; padding: 0 8px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 62%, transparent); }
.dsh-sticky-search-wrap:focus-within { border-color: var(--dsw-alias-state-business-primary); }
.dsh-sticky-search-icon { display: inline-flex; flex: none; color: var(--dsw-alias-label-caption); }
.dsh-sticky-search { flex: 1 1 auto; min-width: 0; padding: 0; border: none; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; outline: none; }
.dsh-sticky-search::placeholder { color: var(--dsw-alias-label-caption); }
.dsh-sticky-search::-webkit-search-cancel-button { display: none; }
.dsh-sticky-search-clear { display: inline-flex; align-items: center; justify-content: center; flex: none; width: 20px; height: 20px; padding: 0; border: none; border-radius: 999px; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.dsh-sticky-search-clear svg { width: 12px; height: 12px; }
@media (hover: hover) { .dsh-sticky-search-clear:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); } }
.dsh-sticky-date-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-sticky-chips { display: flex; align-items: center; gap: 3px; flex: 1 1 auto; min-width: 0; }
.dsh-sticky-chip { box-sizing: border-box; height: 22px; padding: 0 8px; border: 0.5px solid transparent; border-radius: 999px; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; line-height: 16px; cursor: pointer; white-space: nowrap; }
@media (hover: hover) { .dsh-sticky-chip:hover { background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 55%, transparent); color: var(--dsw-alias-label-primary); } }
.dsh-sticky-chip-active { background: color-mix(in srgb, var(--dsw-alias-bg-layer-3) 78%, transparent); border-color: var(--dsw-alias-border-l3); color: var(--dsw-alias-label-primary); font-weight: 600; }
.dsh-sticky-chip:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.dsh-sticky-date-pick { box-sizing: border-box; display: inline-flex; align-items: center; gap: 3px; flex: none; height: 24px; padding: 0 6px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm, 6px); background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 50%, transparent); color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dsh-sticky-date-pick input { box-sizing: border-box; width: 106px; padding: 0; border: none; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 10px; line-height: 16px; outline: none; }
.dsh-sticky-date-pick input::-webkit-calendar-picker-indicator { opacity: 0.55; cursor: pointer; }
.dsh-sticky-date-pick-active { border-color: var(--dsw-alias-state-business-primary); background: color-mix(in srgb, var(--dsw-alias-bg-layer-3) 75%, transparent); }
.dsh-sticky-date-pick-icon { display: inline-flex; color: var(--dsw-alias-label-caption); }
.dsh-sticky-filter-summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 10px; line-height: 15px; color: var(--dsw-alias-label-caption); }
.dsh-sticky-filter-clear { padding: 0; border: none; background: transparent; color: var(--dsw-alias-link, var(--dsw-alias-state-business-primary)); font: inherit; font-size: 10px; line-height: 15px; cursor: pointer; }
.dsh-sticky-filter-clear:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); border-radius: 4px; }
.dsh-sticky-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 2px 10px 18px; scrollbar-width: thin; }
/* Coloured sticky-note paper: height follows the text, capped at a quarter of the viewport. */
/* Width follows the content: short notes stay narrow, long ones grow to 25vw and then wrap. Height follows the wrapped text, capped at a quarter of the viewport, five lines shown. */
.dsh-sticky-note { position: relative; box-sizing: border-box; width: fit-content; min-width: 176px; max-width: min(calc(100% - 6px), 25vw); margin: 16px 3px 10px auto; padding: 9px 11px 8px; max-height: 25vh; overflow: hidden; border: 0.5px solid rgba(120, 96, 30, 0.2); border-radius: 4px 4px 5px 5px; background-color: color-mix(in srgb, var(--note-color, #f6e27a) 86%, white); background-image: repeating-linear-gradient(to bottom, transparent 0 26px, rgba(94, 72, 12, 0.09) 26px 27px); color: #453a1f; box-shadow: 0 9px 16px -12px rgba(60, 44, 8, 0.6), 0 1px 1px rgba(60, 44, 8, 0.1); transform: rotate(var(--note-tilt, 0deg)); transform-origin: 50% -8px; will-change: transform; }
.dsh-sticky-note-done { opacity: 0.62; }
.dsh-sticky-note-done .dsh-sticky-note-text { text-decoration: line-through; text-decoration-thickness: 1px; text-decoration-color: rgba(70, 58, 30, 0.55); }
.dsh-sticky-tape { position: absolute; top: -7px; left: 50%; width: 54px; height: 15px; background: rgba(255, 255, 255, 0.5); border: 0.5px solid rgba(255, 255, 255, 0.6); box-shadow: 0 1px 2px rgba(70, 55, 10, 0.12); transform: translateX(-50%) rotate(-2deg); pointer-events: none; }
.dsh-sticky-note-top { display: flex; align-items: center; gap: 7px; }
.dsh-sticky-check { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; flex: none; width: 19px; height: 19px; padding: 0; border: 1.5px solid rgba(70, 56, 20, 0.42); border-radius: 50%; background: rgba(255, 255, 255, 0.4); color: #3f371c; font: inherit; cursor: pointer; }
.dsh-sticky-check svg { width: 12px; height: 12px; }
.dsh-sticky-check[aria-checked='true'] { background: rgba(70, 56, 20, 0.82); color: #fffdf2; border-color: transparent; }
.dsh-sticky-check:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(120, 96, 30, 0.45); }
.dsh-sticky-badges { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; min-width: 0; }
.dsh-sticky-badge { display: inline-flex; align-items: center; gap: 3px; padding: 0 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.46); font-size: 10px; line-height: 16px; font-weight: 600; white-space: nowrap; }
.dsh-sticky-badge svg { width: 9px; height: 9px; stroke-width: 2.2; }
.dsh-sticky-priority-high { color: #a52a20; }
.dsh-sticky-priority-medium { color: #8a5c0a; }
.dsh-sticky-priority-low { color: #3c6b48; }
.dsh-sticky-importance-critical { color: #6b3fa0; }
.dsh-sticky-importance-normal { color: #3a5f86; }
.dsh-sticky-importance-minor { color: #6a6d72; }
.dsh-sticky-note-actions { display: flex; align-items: center; gap: 0; margin-left: auto; flex: none; }
.dsh-sticky-note-actions .dsh-sticky-icon-btn { width: 24px; height: 24px; color: rgba(70, 56, 20, 0.6); }
.dsh-sticky-note-actions .dsh-sticky-icon-btn svg { width: 13px; height: 13px; }
@media (hover: hover) { .dsh-sticky-note-actions .dsh-sticky-icon-btn:hover { background: rgba(255, 255, 255, 0.55); color: #3f371c; } }
.dsh-sticky-note-actions .dsh-sticky-icon-btn.dsh-sticky-armed { color: #a52a20; background: rgba(255, 255, 255, 0.6); }
.dsh-sticky-note-text { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 5; line-clamp: 5; max-width: 100%; margin: 2px 0 0; padding-left: 26px; overflow: hidden; font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', 'Segoe Print', 'Comic Sans MS', var(--dsw-font-family, sans-serif); font-size: 14px; line-height: 27px; white-space: pre-wrap; overflow-wrap: anywhere; }
.dsh-sticky-note-foot { display: flex; justify-content: flex-end; margin-top: 3px; padding-left: 26px; }
.dsh-sticky-note-date { font-size: 10px; line-height: 14px; color: rgba(69, 58, 31, 0.55); letter-spacing: 0.2px; }
/* One shared wind cycle: every card uses the same duration and phase, so a full board sways together. */
.dsh-sticky-root[data-sway='on'] .dsh-sticky-note { animation: dsh-sticky-sway var(--sticky-wind-duration, 5.8s) ease-in-out 0s infinite alternate; }
.dsh-sticky-root[data-sway='on'] .dsh-sticky-note:hover { animation-play-state: paused; }
@keyframes dsh-sticky-sway {
  from { transform: rotate(var(--note-tilt, 0deg)) translate3d(0, 0, 0); }
  to { transform: rotate(calc(var(--note-tilt, 0deg) + var(--sticky-wind-angle, 1.35deg))) translate3d(2.5px, -3.5px, 0); }
}
.dsh-sticky-all-done { padding: 18px 10px 6px; text-align: center; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); }
.dsh-sticky-archive { margin: 8px 3px 4px; }
.dsh-sticky-archive-head { box-sizing: border-box; display: flex; align-items: center; gap: 6px; width: 100%; padding: 7px 9px; border: 0.5px dashed color-mix(in srgb, var(--dsw-alias-border-l3) 75%, transparent); border-radius: var(--dsw-radius-md); background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 42%, transparent); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; line-height: 16px; text-align: left; cursor: pointer; }
.dsh-sticky-archive-head:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
@media (hover: hover) { .dsh-sticky-archive-head:hover { background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 62%, transparent); color: var(--dsw-alias-label-primary); } }
.dsh-sticky-archive-icon { display: inline-flex; flex: none; color: var(--dsw-alias-label-caption); }
.dsh-sticky-archive-icon svg { width: 13px; height: 13px; }
.dsh-sticky-archive-label { flex: none; font-weight: 600; }
.dsh-sticky-archive-hint { margin-left: auto; font-size: 10px; line-height: 14px; color: var(--dsw-alias-label-caption); }
.dsh-sticky-archive-list { display: flex; flex-direction: column; padding-top: 2px; }
.dsh-sticky-archive-list .dsh-sticky-note { margin: 12px 0 6px auto; }
.dsh-sticky-archive-empty { padding: 10px 6px; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); text-align: center; }
.dsh-sticky-launcher { position: absolute; top: 50%; right: 0; display: flex; flex-direction: column; align-items: center; gap: 7px; width: 46px; padding: 12px 7px 11px; border: none; border-radius: 16px 0 0 16px; background: linear-gradient(170deg, #fbeeb0, #f0d966); color: #4a3b0f; font: inherit; cursor: pointer; box-shadow: -8px 10px 26px -14px rgba(60, 45, 8, 0.7), inset 0 0 0 0.5px rgba(120, 96, 30, 0.25); transform: translateY(-50%); }
.dsh-sticky-launcher:focus-visible { outline: none; box-shadow: -8px 10px 26px -14px rgba(60, 45, 8, 0.7), 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
@media (hover: hover) { .dsh-sticky-launcher:hover { transform: translate(-2px, -50%); } }
.dsh-sticky-launcher-tape { position: absolute; top: -5px; left: 50%; width: 30px; height: 11px; background: rgba(255, 255, 255, 0.55); transform: translateX(-50%) rotate(-3deg); }
.dsh-sticky-launcher-glyph { display: inline-flex; color: #6b5410; }
.dsh-sticky-launcher-text { writing-mode: vertical-rl; letter-spacing: 2px; font-size: 12px; font-weight: 600; line-height: 1; }
.dsh-sticky-launcher-count { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 999px; background: #c65b3c; color: #fffaf0; font-size: 10px; font-weight: 700; }
.dsh-sticky-popover { position: absolute; top: 52px; right: 8px; z-index: 4; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; width: 268px; padding: 12px; border-radius: var(--dsw-radius-lg); background: var(--dsw-menu-surface-fill, var(--dsw-alias-bg-layer-3)); box-shadow: var(--dsw-elevation-panel, 0 16px 40px -14px rgba(0, 0, 0, 0.35)); }
.dsh-sticky-popover-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dsh-sticky-popover-col { display: flex; flex-direction: column; gap: 7px; }
.dsh-sticky-popover-copy { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.dsh-sticky-popover-title { font-size: 12px; font-weight: 600; line-height: 18px; color: var(--dsw-alias-label-primary); }
.dsh-sticky-popover-desc { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-tertiary); }
.dsh-sticky-popover .dsh-sticky-segmented, .dsh-sticky-popover .dsh-sticky-swatches { flex-wrap: wrap; }
.dsh-sticky-popover-hint { font-size: 10px; line-height: 14px; color: var(--dsw-alias-label-caption); }
.dsh-sticky-switch { position: relative; box-sizing: border-box; flex: none; width: 38px; height: 22px; padding: 0; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: 999px; background: var(--dsw-alias-bg-module-platform); cursor: pointer; transition: background 140ms ease; }
.dsh-sticky-switch-thumb { position: absolute; top: 2px; left: 2px; width: 17px; height: 17px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25); transition: transform 140ms ease; }
.dsh-sticky-switch-on { background: var(--dsw-alias-state-business-primary); border-color: transparent; }
.dsh-sticky-switch-on .dsh-sticky-switch-thumb { transform: translateX(16px); }
.dsh-sticky-switch:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.dsh-sticky-segmented { display: flex; align-items: center; gap: 2px; padding: 2px; border-radius: calc(var(--dsw-radius-md) + 2px); background: var(--dsw-alias-bg-module-platform); }
.dsh-sticky-seg { box-sizing: border-box; display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 8px; border: 0.5px solid transparent; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; line-height: 17px; cursor: pointer; white-space: nowrap; }
.dsh-sticky-seg:disabled { opacity: 0.4; cursor: not-allowed; }
.dsh-sticky-seg-active { background: var(--dsw-alias-bg-layer-3); border-color: var(--dsw-alias-border-l3); color: var(--dsw-alias-label-primary); font-weight: 600; }
.dsh-sticky-seg:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.dsh-sticky-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; }
.dsh-sticky-dot-high { background: #c0392b; }
.dsh-sticky-dot-medium { background: #c58a1c; }
.dsh-sticky-dot-low { background: #4b8b5a; }
.dsh-sticky-swatches { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dsh-sticky-swatch { position: relative; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; flex: none; width: 22px; height: 22px; padding: 0; border: 1px solid rgba(90, 74, 30, 0.22); border-radius: 6px; background: var(--swatch-color); cursor: pointer; color: #4a3b0f; }
.dsh-sticky-swatch-sm { width: 20px; height: 20px; }
.dsh-sticky-swatch-active { box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1), 0 0 0 3.5px rgba(90, 74, 30, 0.55); }
.dsh-sticky-swatch svg { width: 13px; height: 13px; stroke-width: 2.4; }
.dsh-sticky-swatch:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.dsh-sticky-custom-color { position: relative; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: 1px dashed var(--dsw-alias-border-l3); border-radius: 6px; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.dsh-sticky-custom-color input { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: none; opacity: 0; cursor: pointer; }
.dsh-sticky-custom-color svg { width: 11px; height: 11px; }
.dsh-sticky-editor { position: relative; margin: 12px 3px 12px; padding: 12px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 88%, var(--note-color, #f6e27a)); box-shadow: 0 10px 24px -18px rgba(40, 30, 5, 0.45); }
.dsh-sticky-editor::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; border-radius: var(--dsw-radius-md) var(--dsw-radius-md) 0 0; background: var(--note-color, #f6e27a); }
.dsh-sticky-editor-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.dsh-sticky-editor-title { font-size: 12px; font-weight: 600; line-height: 18px; color: var(--dsw-alias-label-primary); }
.dsh-sticky-textarea { box-sizing: border-box; display: block; width: 100%; min-height: 64px; max-height: 220px; padding: 8px 9px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; resize: vertical; }
.dsh-sticky-textarea::placeholder { color: var(--dsw-alias-label-caption); }
.dsh-sticky-textarea:focus { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.dsh-sticky-field { display: flex; align-items: center; gap: 10px; margin-top: 9px; }
.dsh-sticky-field-label { flex: 0 0 52px; font-size: 11px; line-height: 16px; font-weight: 500; color: var(--dsw-alias-label-tertiary); }
.dsh-sticky-field > .dsh-sticky-segmented, .dsh-sticky-field > .dsh-sticky-swatches { flex-wrap: wrap; }
.dsh-sticky-editor-actions { display: flex; align-items: center; gap: 6px; margin-top: 11px; }
.dsh-sticky-editor-hint { margin: 8px 0 0; font-size: 10px; line-height: 14px; color: var(--dsw-alias-label-caption); }
.dsh-sticky-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 28px; padding: 0 11px; border: 0.5px solid transparent; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; white-space: nowrap; box-shadow: inset 0 0 0 0.5px var(--dsw-alias-border-l3); }
.dsh-sticky-btn:disabled { opacity: 0.4; cursor: not-allowed; }
@media (hover: hover) { .dsh-sticky-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); } }
.dsh-sticky-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.dsh-sticky-btn-primary { border: none; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); box-shadow: none; }
@media (hover: hover) { .dsh-sticky-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); } }
.dsh-sticky-btn-danger { color: var(--dsw-alias-state-error-primary); }
.dsh-sticky-btn-armed { border: none; background: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-label-primary-foreground); box-shadow: none; }
.dsh-sticky-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 18px 6px; padding: 24px 12px; text-align: center; }
.dsh-sticky-empty-note { display: inline-flex; align-items: center; justify-content: center; width: 54px; height: 54px; border-radius: 10px; color: #7a6215; background: linear-gradient(150deg, #f8e79b, #eed468); box-shadow: 0 10px 18px -12px rgba(90, 70, 10, 0.6); transform: rotate(-3deg); }
.dsh-sticky-empty-title { margin-top: 4px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dsh-sticky-empty-desc { max-width: 220px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-caption); }
.dsh-sticky-empty .dsh-sticky-btn { margin-top: 6px; }
.dsh-sticky-settings { display: flex; flex-direction: column; gap: 16px; padding: 16px 0 24px; max-width: 760px; }
.dsh-sticky-settings-head { display: flex; flex-direction: column; gap: 4px; }
.dsh-sticky-settings-title { margin: 0; font-size: 15px; font-weight: 600; line-height: 22px; color: var(--dsw-alias-label-primary); }
.dsh-sticky-settings-desc { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dsh-sticky-settings-stats { margin-top: 2px; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); }
.dsh-sticky-card { display: flex; flex-direction: column; gap: 14px; padding: 16px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg); }
.dsh-sticky-card-title { margin: 0; font-size: 13px; font-weight: 600; line-height: 20px; color: var(--dsw-alias-label-primary); }
.dsh-sticky-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.dsh-sticky-row-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dsh-sticky-row-label { font-size: 12px; line-height: 18px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dsh-sticky-row-desc { max-width: 460px; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); }
.dsh-sticky-row-control { flex: none; }
.dsh-sticky-data-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.dsh-sticky-data-copy { font-size: 11px; line-height: 17px; color: var(--dsw-alias-label-caption); }
.dsh-sticky-notice { padding: 7px 10px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
@media (prefers-reduced-motion: reduce) {
  .dsh-sticky-root[data-sway='on'] .dsh-sticky-note { animation: none; }
  .dsh-sticky-switch-thumb, .dsh-sticky-launcher { transition: none; }
}
`

    /* ------------------------------------------------------------------ *
     * Plugin body
     * ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        // One stylesheet for every surface this bundle renders.
        ctx.effect(() => {
          if (typeof document === 'undefined') return () => {}
          const tag = document.createElement('style')
          tag.dataset.plugin = PLUGIN_ID
          tag.dataset.pluginCss = `${PLUGIN_ID}/sticky-notes.css`
          tag.textContent = STYLES
          document.head.appendChild(tag)
          return () => { tag.remove() }
        }, `${PLUGIN_ID}: styles`)

        ctx.effect(() => ctx.locale.register(NAMESPACE, { en: DICTIONARIES.en, zh: DICTIONARIES.zh }),
          `${PLUGIN_ID}: dictionaries`)

        const t = ctx.locale.bind(NAMESPACE)

        // Keep this page in step with edits made by another tab.
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          ctx.effect(() => {
            const onStorage = (event) => {
              if (event.key !== STORAGE_KEY) return
              if (event.newValue === null) return
              try {
                const normalized = normalizeBoard(JSON.parse(event.newValue))
                boardStore.set(normalized)
              } catch (error) {
                console.debug(`${PLUGIN_ID}: reading a cross-tab board update failed`, error)
              }
            }
            window.addEventListener('storage', onStorage)
            return () => { window.removeEventListener('storage', onStorage) }
          }, `${PLUGIN_ID}: cross-tab board updates`)
        }

        ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register({
          name: OVERLAY_SLOT,
          id: 'sticky-notes',
          order: 20,
          label: () => t('panel.title'),
          locale: NAMESPACE,
        }, StickyNotesDock))

        ctx.slots.inject(SETTINGS_SLOT, () => ctx.slots.register({
          name: SETTINGS_SLOT,
          id: 'sticky-notes',
          order: 36,
          label: () => t('nav'),
          locale: NAMESPACE,
        }, StickyNotesSettingsSection))
      },
    }
  },
})
