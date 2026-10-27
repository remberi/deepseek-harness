/**
 * Browser half of the Prompt library bundle.
 *
 * Two surfaces share one browser-local library:
 *
 * - a "Prompt library" page in Settings for creating, editing, deleting, and
 *   filtering prompts by category and tag, managing categories, and importing
 *   or exporting the whole library as JSON;
 * - a composer toolbar button plus a picker overlay that inserts a chosen
 *   prompt into the draft as plain text.
 *
 * The library lives in this browser's `localStorage` (key
 * `@local/dsh-prompt-library:library.v1`), so JSON export is the way to back
 * it up or move it elsewhere. Categories are user-defined; tags are free-form
 * per prompt. First load seeds built-in templates for operations, business,
 * and frontend development. This module registers no Host behavior; the Host
 * half (`index.js`) is empty.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-prompt-library',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PLUGIN_ID = '@local/dsh-prompt-library'
    const NAMESPACE = 'dsh-prompt-library'
    const SETTINGS_SLOT = 'settings.section'
    const TRIGGER_SLOT = 'conversation.input.left'
    const OVERLAY_SLOT = 'conversation.input.overlay'
    const STORAGE_KEY = `${PLUGIN_ID}:library.v1`
    const FORMAT = 'dsh-prompt-library'
    const LIBRARY_VERSION = 1
    const ALL_CATEGORIES = 'all'
    const UNCATEGORIZED = 'uncategorized'

    /** Display copy; every other locale falls back to English per key. */
    const DICTIONARIES = {
      en: {
        nav: 'Prompt library',
        'section.title': 'Prompt library',
        'section.description': 'Save reusable prompts by category and tag, then insert one from the composer. Changes stay in this browser; use export for a backup.',
        'section.stats': '{prompts} prompts · {categories} categories',
        'action.new': 'New prompt',
        'action.import': 'Import JSON',
        'action.export': 'Export JSON',
        'action.reset': 'Restore built-in templates',
        'action.save': 'Save',
        'action.cancel': 'Cancel',
        'action.close': 'Close',
        'action.edit': 'Edit',
        'action.copy': 'Copy',
        'action.delete': 'Delete',
        'action.confirmDelete': 'Confirm delete',
        'action.addCategory': 'Add',
        'search.placeholder': 'Search title, content, tags, or category',
        'filter.allCategories': 'All categories',
        'filter.uncategorized': 'Uncategorized',
        'filter.tags': 'Tags',
        'filter.moreTags': 'More tags',
        'filter.lessTags': 'Fewer tags',
        'filter.clear': 'Clear',
        'filter.emptyTitle': 'No prompts match these filters',
        'filter.emptyDescription': 'Clear the search or filters, or create a new prompt.',
        'library.emptyTitle': 'The prompt library is empty',
        'library.emptyDescription': 'Create a prompt, import a JSON library, or restore the built-in templates.',
        'category.title': 'Categories',
        'category.summary': 'Categories ({count})',
        'category.placeholder': 'New category name',
        'category.empty': 'No categories yet. Add one below.',
        'category.renameLabel': 'Rename category',
        'category.deleteHint': 'Prompts in this category move to Uncategorized.',
        'category.error.empty': 'Enter a category name.',
        'category.error.duplicate': 'That category name already exists.',
        'editor.newTitle': 'New prompt',
        'editor.editTitle': 'Edit prompt',
        'editor.field.title': 'Title',
        'editor.field.titlePlaceholder': 'A short name, for example Weekly report outline',
        'editor.field.category': 'Category',
        'editor.field.tags': 'Tags',
        'editor.field.tagsPlaceholder': 'Separate tags with commas, for example ops, weekly',
        'editor.field.tagsHint': 'Click an existing tag to add it.',
        'editor.field.content': 'Prompt content',
        'editor.field.contentPlaceholder': 'The text inserted into the composer when this prompt is picked.',
        'editor.error.title': 'Enter a title.',
        'editor.error.content': 'Enter the prompt content.',
        'editor.builtinBadge': 'Built-in',
        'notice.imported': 'Imported {prompts} prompts and {categories} categories, skipped {skipped} duplicates.',
        'notice.importInvalid': 'This file is not a prompt library JSON document.',
        'notice.importFailed': 'Could not read the selected file.',
        'notice.exported': 'Exported the prompt library.',
        'notice.restored': 'Restored {count} built-in templates.',
        'notice.restoreNone': 'All built-in templates are already present.',
        'notice.copied': 'Copied "{title}" to the clipboard.',
        'notice.copyFailed': 'Could not copy to the clipboard.',
        'notice.saved': 'Prompt saved.',
        'notice.deleted': 'Prompt deleted.',
        'composer.action': 'Prompt library',
        'picker.title': 'Prompt library',
        'picker.count': '{count} prompts',
        'picker.categories': 'Categories',
        'picker.tags': 'Tags',
        'picker.searchPlaceholder': 'Search prompts',
        'picker.empty': 'No prompts match the search.',
        'picker.hint': 'Pick a prompt to insert it into the draft. Esc closes.',
      },
      zh: {
        nav: '提示词库',
        'section.title': '提示词库',
        'section.description': '按分类和标签保存常用提示词，在输入框中挑一条直接插入。数据保存在当前浏览器，可用导出备份。',
        'section.stats': '{prompts} 条提示词 · {categories} 个分类',
        'action.new': '新建提示词',
        'action.import': '导入 JSON',
        'action.export': '导出 JSON',
        'action.reset': '恢复内置模板',
        'action.save': '保存',
        'action.cancel': '取消',
        'action.close': '关闭',
        'action.edit': '编辑',
        'action.copy': '复制',
        'action.delete': '删除',
        'action.confirmDelete': '确认删除',
        'action.addCategory': '添加',
        'search.placeholder': '搜索标题、内容、标签或分类',
        'filter.allCategories': '全部分类',
        'filter.uncategorized': '未分类',
        'filter.tags': '标签',
        'filter.moreTags': '更多标签',
        'filter.lessTags': '收起标签',
        'filter.clear': '清除',
        'filter.emptyTitle': '没有符合筛选条件的提示词',
        'filter.emptyDescription': '清除搜索或筛选条件，或者新建一条提示词。',
        'library.emptyTitle': '提示词库还是空的',
        'library.emptyDescription': '新建提示词、导入 JSON 提示词库，或恢复内置模板。',
        'category.title': '分类',
        'category.summary': '分类（{count}）',
        'category.placeholder': '新分类名称',
        'category.empty': '还没有分类，在下方添加一个。',
        'category.renameLabel': '重命名分类',
        'category.deleteHint': '删除后该分类下的提示词会移到「未分类」。',
        'category.error.empty': '请输入分类名称。',
        'category.error.duplicate': '该分类名称已存在。',
        'editor.newTitle': '新建提示词',
        'editor.editTitle': '编辑提示词',
        'editor.field.title': '标题',
        'editor.field.titlePlaceholder': '简短名称，例如：周报提纲',
        'editor.field.category': '分类',
        'editor.field.tags': '标签',
        'editor.field.tagsPlaceholder': '用逗号分隔，例如：运营, 周报',
        'editor.field.tagsHint': '点击已有标签可直接添加。',
        'editor.field.content': '提示词内容',
        'editor.field.contentPlaceholder': '选中这条提示词后插入到输入框的文本。',
        'editor.error.title': '请输入标题。',
        'editor.error.content': '请输入提示词内容。',
        'editor.builtinBadge': '内置',
        'notice.imported': '已导入 {prompts} 条提示词、{categories} 个分类，跳过 {skipped} 条重复项。',
        'notice.importInvalid': '该文件不是提示词库 JSON 文档。',
        'notice.importFailed': '无法读取所选文件。',
        'notice.exported': '已导出提示词库。',
        'notice.restored': '已恢复 {count} 条内置模板。',
        'notice.restoreNone': '内置模板都已存在。',
        'notice.copied': '已将「{title}」复制到剪贴板。',
        'notice.copyFailed': '复制到剪贴板失败。',
        'notice.saved': '提示词已保存。',
        'notice.deleted': '提示词已删除。',
        'composer.action': '提示词库',
        'picker.title': '提示词库',
        'picker.count': '{count} 条',
        'picker.categories': '分类',
        'picker.tags': '标签',
        'picker.searchPlaceholder': '搜索提示词',
        'picker.empty': '没有匹配的提示词。',
        'picker.hint': '选择提示词后插入输入框，按 Esc 关闭。',
      },
    }

    /** Token-styled sheet; copied patterns follow the host primitives. */
    const STYLES = `
.dsh-prompt-section { display: flex; flex-direction: column; gap: 16px; padding: 16px 0; }
.dsh-prompt-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.dsh-prompt-heading { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dsh-prompt-title { margin: 0; font-size: 14px; font-weight: 400; line-height: 22px; color: var(--dsw-alias-label-primary); }
.dsh-prompt-description { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dsh-prompt-header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dsh-prompt-btn { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 28px; padding: 0 10px; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; white-space: nowrap; }
.dsh-prompt-btn:disabled { opacity: 0.4; cursor: not-allowed; }
@media (hover: hover) { .dsh-prompt-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); } }
.dsh-prompt-btn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.dsh-prompt-btn-primary { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }
@media (hover: hover) { .dsh-prompt-btn-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); } }
.dsh-prompt-btn-outline { border: 0.5px solid transparent; box-shadow: inset 0 0 0 0.5px var(--dsw-alias-border-l3); }
.dsh-prompt-btn-danger { color: var(--dsw-alias-state-error-primary); }
.dsh-prompt-notice { display: flex; align-items: flex-start; gap: 6px; padding: 8px 12px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-2); font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.dsh-prompt-notice-error { color: var(--dsw-alias-state-error-primary); }
.dsh-prompt-toolbar { display: flex; flex-direction: column; gap: 10px; }
.dsh-prompt-toolbar-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dsh-prompt-input, .dsh-prompt-select, .dsh-prompt-textarea { box-sizing: border-box; width: 100%; padding: 7px 10px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; }
.dsh-prompt-input::placeholder, .dsh-prompt-textarea::placeholder { color: var(--dsw-alias-label-caption); }
.dsh-prompt-input:focus, .dsh-prompt-select:focus, .dsh-prompt-textarea:focus { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.dsh-prompt-select { width: auto; min-width: 140px; }
.dsh-prompt-textarea { min-height: 180px; resize: vertical; font-size: 13px; line-height: 21px; }
.dsh-prompt-search { flex: 1 1 220px; min-width: 180px; }
.dsh-prompt-filter-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.dsh-prompt-filter-label { flex: 0 0 auto; font-size: 11px; line-height: 16px; font-weight: 500; color: var(--dsw-alias-label-tertiary); }
.dsh-prompt-filter-row > .dsh-prompt-segmented { flex: 1 1 auto; }
.dsh-prompt-tag { display: inline-flex; align-items: center; border-radius: 999px; padding: 1px 8px; border: 0.5px solid var(--dsw-alias-border-l4); color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 17px; font-weight: 500; white-space: nowrap; }
.dsh-prompt-pill { box-sizing: border-box; display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 8px; border: none; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; white-space: nowrap; flex: 0 0 auto; }
@media (hover: hover) { .dsh-prompt-pill:hover { background: var(--dsw-alias-interactive-bg-hover); } }
.dsh-prompt-pill-active { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-active); box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l3); }
.dsh-prompt-pill:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.dsh-prompt-pill-scroll { display: flex; flex: 1 1 auto; align-items: center; gap: 4px; min-width: 0; overflow-x: auto; scrollbar-width: none; mask-image: linear-gradient(to right, #000 calc(100% - 16px), transparent); }
.dsh-prompt-pill-scroll::-webkit-scrollbar { display: none; }
.dsh-prompt-segmented { display: flex; align-items: center; gap: 2px; min-width: 0; padding: 2px; border-radius: calc(var(--dsw-radius-md) + 2px); background: var(--dsw-alias-bg-module-platform); overflow-x: auto; scrollbar-width: none; }
.dsh-prompt-segmented::-webkit-scrollbar { display: none; }
.dsh-prompt-segmented-item { box-sizing: border-box; display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border: 0.5px solid transparent; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; white-space: nowrap; flex: 0 0 auto; }
@media (hover: hover) { .dsh-prompt-segmented-item:hover { color: var(--dsw-alias-label-primary); } }
.dsh-prompt-segmented-item-active { background: var(--dsw-alias-bg-layer-3); border-color: var(--dsw-alias-border-l3); color: var(--dsw-alias-label-primary); font-weight: 500; }
.dsh-prompt-segmented-item:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.dsh-prompt-category-panel { display: flex; flex-direction: column; gap: 8px; padding: 10px 12px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); }
.dsh-prompt-category-summary { display: flex; align-items: center; gap: 6px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); cursor: pointer; list-style: none; }
.dsh-prompt-category-summary::-webkit-details-marker { display: none; }
.dsh-prompt-category-summary::before { content: '▸'; font-size: 10px; color: var(--dsw-alias-label-caption); transition: transform 120ms ease; }
.dsh-prompt-category-panel[open] > .dsh-prompt-category-summary::before { transform: rotate(90deg); }
.dsh-prompt-category-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.dsh-prompt-category-row { display: flex; align-items: center; gap: 8px; }
.dsh-prompt-category-name { flex: 1 1 auto; min-width: 0; }
.dsh-prompt-category-count { flex: none; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); }
.dsh-prompt-category-hint { margin: 0; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); }
.dsh-prompt-category-add { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.dsh-prompt-list { display: flex; flex-direction: column; gap: 8px; }
.dsh-prompt-card { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border: 0.5px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); }
.dsh-prompt-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.dsh-prompt-card-heading { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dsh-prompt-card-title { display: flex; align-items: center; gap: 6px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dsh-prompt-badge { flex: none; padding: 0 6px; border-radius: 999px; background: var(--dsw-alias-bg-module-platform); font-size: 10px; line-height: 16px; font-weight: 400; color: var(--dsw-alias-label-tertiary); }
.dsh-prompt-card-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); }
.dsh-prompt-card-excerpt { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; margin: 0; overflow: hidden; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }
.dsh-prompt-card-actions { display: flex; align-items: center; gap: 4px; }
.dsh-prompt-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 28px 12px; text-align: center; }
.dsh-prompt-empty-title { font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-secondary); }
.dsh-prompt-empty-description { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-caption); }
.dsh-prompt-dialog-root { position: fixed; inset: 0; z-index: 1200; display: flex; align-items: center; justify-content: center; padding: 24px; }
.dsh-prompt-dialog-mask { position: absolute; inset: 0; background: var(--dsw-alias-bg-mask-1); backdrop-filter: var(--dsw-mask-blur); }
.dsh-prompt-dialog { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 14px; width: min(560px, 100%); max-height: 100%; overflow-y: auto; padding: 18px 20px 20px; border-radius: var(--dsw-radius-panel); background: var(--dsw-alias-bg-layer-2); box-shadow: var(--dsw-elevation-prominent); }
.dsh-prompt-dialog-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dsh-prompt-dialog-title { margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dsh-prompt-dialog-close { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; padding: 0; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
@media (hover: hover) { .dsh-prompt-dialog-close:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); } }
.dsh-prompt-dialog-body { display: flex; flex-direction: column; gap: 12px; }
.dsh-prompt-field { display: flex; flex-direction: column; gap: 5px; }
.dsh-prompt-label { font-size: 11px; line-height: 16px; font-weight: 500; color: var(--dsw-alias-label-tertiary); }
.dsh-prompt-hint { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); }
.dsh-prompt-error { font-size: 11px; line-height: 16px; color: var(--dsw-alias-state-error-primary); }
.dsh-prompt-dialog-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding-top: 4px; }
.dsh-prompt-trigger { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
@media (hover: hover) { .dsh-prompt-trigger:hover { background: var(--dsw-alias-interactive-bg-hover); } }
.dsh-prompt-trigger:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); }
.dsh-prompt-trigger-active { background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-primary); }
.dsh-prompt-trigger-icon { display: inline-flex; width: 18px; height: 18px; }
.dsh-prompt-picker { position: absolute; bottom: calc(100% + 8px); left: 0; right: 0; z-index: 100; box-sizing: border-box; display: flex; flex-direction: column; max-height: min(460px, 64vh); overflow: hidden; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-overlay); box-shadow: var(--dsw-elevation-prominent); }
.dsh-prompt-picker-head { display: flex; flex: 0 0 auto; flex-direction: column; gap: 8px; padding: 12px 12px 10px; border-bottom: 0.5px solid var(--dsw-alias-border-l1); }
.dsh-prompt-picker-title-row { display: flex; align-items: center; gap: 8px; }
.dsh-prompt-picker-title { font-size: 13px; line-height: 20px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dsh-prompt-picker-count { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); }
.dsh-prompt-picker-close { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; margin-left: auto; padding: 0; border: none; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
@media (hover: hover) { .dsh-prompt-picker-close:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); } }
.dsh-prompt-picker-search { box-sizing: border-box; width: 100%; height: 30px; padding: 0 10px; border: 0.5px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; line-height: 20px; }
.dsh-prompt-picker-search::placeholder { color: var(--dsw-alias-label-caption); }
.dsh-prompt-picker-search:focus { outline: none; border-color: var(--dsw-alias-state-business-primary); }
.dsh-prompt-picker-list { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; overflow-y: auto; padding: 4px; }
.dsh-prompt-picker-row { display: flex; flex-direction: column; gap: 3px; width: 100%; padding: 7px 8px; border: none; border-radius: var(--dsw-radius-md); background: transparent; color: var(--dsw-alias-label-primary); font: inherit; text-align: left; cursor: pointer; }
.dsh-prompt-picker-row-active { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-prompt-picker-row:focus-visible { outline: none; }
.dsh-prompt-picker-row-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.dsh-prompt-picker-row-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 20px; }
.dsh-prompt-picker-row-category { flex: none; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); }
.dsh-prompt-picker-row-meta { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.dsh-prompt-picker-row-excerpt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary); }
.dsh-prompt-picker-empty { padding: 18px 12px; text-align: center; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); }
.dsh-prompt-picker-foot { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; border-top: 0.5px solid var(--dsw-alias-border-l1); font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-caption); }
.dsh-prompt-link { flex: 0 0 auto; padding: 0; border: none; background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; line-height: 16px; cursor: pointer; text-decoration: underline; white-space: nowrap; }
`

    /** Built-in template categories, in display order. */
    const DEFAULT_CATEGORIES = [
      { id: 'operations', name: '运营' },
      { id: 'business', name: '商务' },
      { id: 'frontend', name: '前端开发' },
    ]

    /**
     * Built-in prompt templates, seeded on first load. `key` is a stable
     * identity used by "restore built-in templates" so restored prompts keep
     * the category/tag choices of the shipped template.
     */
    const DEFAULT_PROMPTS = [
      {
        key: 'operations.social-note',
        categoryId: 'operations',
        title: '小红书爆款笔记',
        tags: ['小红书', '文案', '种草'],
        content: '你是一名资深小红书内容运营。请围绕【产品或主题】写一篇小红书笔记，要求：\n1. 标题 20 字以内，带情绪或反差，给出 5 个备选；\n2. 正文 300-500 字，口语化，多用短句和 emoji，分段清晰；\n3. 结构包含：痛点开头 → 使用体验 → 具体效果 → 行动引导；\n4. 结尾给出 8 个相关话题标签；\n5. 避免夸大功效和绝对化用词。',
      },
      {
        key: 'operations.growth-review',
        categoryId: 'operations',
        title: '用户增长复盘',
        tags: ['增长', '复盘', '数据分析'],
        content: '你是一名用户增长负责人。请帮我复盘【时间段】的增长情况：\n1. 列出关键指标（新增、留存、活跃、转化、流失）及环比变化；\n2. 按渠道拆解新增来源，指出 ROI 最高和最低的渠道；\n3. 用假设-验证的方式解释数据波动，区分数据问题和业务问题；\n4. 给出 3 条下阶段可执行的增长动作，注明所需资源和预期效果；\n5. 输出一份可直接给管理层汇报的复盘大纲。',
      },
      {
        key: 'operations.community-plan',
        categoryId: 'operations',
        title: '社群运营周计划',
        tags: ['社群', '计划', '运营'],
        content: '你是一名社群运营。请为【社群名称/目标人群】设计一份一周社群运营计划：\n1. 周一到周日每天的主题与互动形式（话题讨论、打卡、直播、福利等）；\n2. 每天的开场话术和收尾话术各一条；\n3. 设计 2 个提升活跃度的激励机制；\n4. 列出需要提前准备的物料和人员分工；\n5. 给出本周可量化的目标（发言人数、活动参与率、转化数）。',
      },
      {
        key: 'operations.campaign',
        categoryId: 'operations',
        title: '活动策划方案',
        tags: ['活动', '策划', '方案'],
        content: '你是一名活动策划。请为【活动主题】输出一份完整活动方案：\n1. 活动背景、目标人群与核心目标（用可量化指标描述）；\n2. 创意主题与一句话传播主张；\n3. 活动流程与时间轴（预热、爆发、长尾）；\n4. 渠道投放组合与预算分配比例；\n5. 物料清单与设计需求；\n6. 风险预案（参与不足、舆情、技术故障）；\n7. 效果评估指标与复盘方式。',
      },
      {
        key: 'business.follow-up-email',
        categoryId: 'business',
        title: '客户跟进邮件',
        tags: ['邮件', '客户跟进', '商务'],
        content: '你是一名商务经理。请帮我写一封给【客户公司/联系人】的跟进邮件，背景是【上次沟通内容与时间】，目标是【推进下一步】。要求：\n1. 主题行简洁明确，不超过 20 字；\n2. 开头回顾上次沟通的关键共识，体现重视；\n3. 中间说明本次提供的价值或新的进展；\n4. 结尾给出具体的下一步建议和 2 个可选时间；\n5. 全文 200 字以内，语气专业、不过度推销；\n6. 另附一段更简短的微信版跟进话术。',
      },
      {
        key: 'business.quote',
        categoryId: 'business',
        title: '商务报价方案',
        tags: ['报价', '方案', '商务'],
        content: '你是一名商务负责人。请为【项目名称】设计一份报价方案：\n1. 需求理解与交付范围（明确包含项和不包含项）；\n2. 分档报价（基础版 / 标准版 / 尊享版），列出每档的功能、周期和价格；\n3. 报价依据与成本结构说明；\n4. 付款节点与交付里程碑；\n5. 可选增值服务及单价；\n6. 报价有效期与商务条款提示。',
      },
      {
        key: 'business.proposal',
        categoryId: 'business',
        title: '客户提案大纲',
        tags: ['提案', '客户', '方案'],
        content: '你是一名解决方案顾问。请针对【客户名称】的【业务问题】输出一份提案大纲：\n1. 我们对客户现状和痛点的理解（用客户视角描述）；\n2. 问题根因分析；\n3. 解决方案总体思路与架构；\n4. 分阶段实施计划与关键里程碑；\n5. 预期收益（量化指标 + 定性收益）；\n6. 我们的差异化优势与同类案例；\n7. 商务合作方式建议。',
      },
      {
        key: 'business.contract-risk',
        categoryId: 'business',
        title: '合同风险检查',
        tags: ['合同', '风控', '审查'],
        content: '你是一名商务法务顾问。请审阅以下合同内容并输出风险清单：\n1. 逐条指出对我方不利或表述模糊的条款；\n2. 按风险等级（高/中/低）排序，说明可能造成的损失；\n3. 给出具体的修改建议文本；\n4. 重点检查：付款条件、交付验收、违约责任、知识产权、保密、终止与争议解决；\n5. 最后给出「可签署 / 修改后签署 / 不建议签署」的结论。\n\n合同内容：【粘贴合同】',
      },
      {
        key: 'frontend.code-review',
        categoryId: 'frontend',
        title: '代码审查',
        tags: ['代码审查', '质量', '前端'],
        content: '你是一名资深前端工程师。请审查以下代码，按重要性输出问题清单：\n1. 正确性缺陷（边界条件、空值、竞态、内存泄漏）；\n2. 可维护性问题（命名、重复逻辑、过长函数、隐式耦合）；\n3. 性能问题（重复渲染、无效计算、过大依赖）；\n4. 可访问性与国际化问题；\n5. 安全问题（XSS、敏感信息、依赖风险）；\n6. 每条给出问题位置、原因和可直接采用的修改代码。\n\n代码：\n【粘贴代码】',
      },
      {
        key: 'frontend.component-design',
        categoryId: 'frontend',
        title: 'React 组件设计',
        tags: ['React', '组件', '设计'],
        content: '你是一名前端架构师。请为【组件名称】设计一个 React 组件：\n1. 明确职责边界，列出不负责的事项；\n2. 设计 props 接口（类型、默认值、必填/可选）与受控/非受控策略；\n3. 给出状态管理与数据流方案，说明状态应放在哪里；\n4. 处理加载、空、错误、禁用等状态；\n5. 给出可访问性要点（语义标签、键盘操作、aria）；\n6. 输出组件骨架代码与关键样式的 token 用法；\n7. 列出需要覆盖的测试用例。',
      },
      {
        key: 'frontend.bug-triage',
        categoryId: 'frontend',
        title: 'Bug 定位与修复',
        tags: ['调试', 'Bug', '排查'],
        content: '你是一名前端排查专家。请帮我定位以下 Bug：\n现象：【描述现象】\n复现步骤：【步骤】\n预期结果：【预期】\n1. 先给出可能原因的优先级列表，并说明每个假设的验证方法；\n2. 指出需要收集的信息（控制台错误、网络请求、状态快照、环境差异）；\n3. 给出最小复现思路；\n4. 定位后提供修复方案和回归验证清单；\n5. 说明如何防止同类问题再次出现。',
      },
      {
        key: 'frontend.tech-design',
        categoryId: 'frontend',
        title: '技术方案文档',
        tags: ['文档', '架构', '方案'],
        content: '你是一名前端技术负责人。请为【需求名称】输出技术方案文档：\n1. 背景、目标与非目标；\n2. 现状与约束（技术栈、历史包袱、时间与人力）；\n3. 备选方案对比（至少 2 个），从成本、风险、扩展性三方面打分；\n4. 推荐方案的整体设计与模块划分；\n5. 接口与数据结构定义；\n6. 兼容性、灰度与回滚策略；\n7. 排期拆解与验收标准；\n8. 遗留问题与后续演进方向。',
      },
    ]

    /* ------------------------------------------------------------------ *
     * Data model, validation, and persistence
     * ------------------------------------------------------------------ */

    /**
     * Generate a unique id.
     * @param {string} prefix - id namespace, such as `p` or `cat`.
     * @returns {string} a collision-resistant id.
     */
    function newId(prefix) {
      try {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return `${prefix}-${crypto.randomUUID()}`
        }
      } catch (error) {
        // crypto can be unavailable outside secure contexts; the timestamp fallback covers it.
        console.debug(`${PLUGIN_ID}: randomUUID unavailable`, error)
      }
      return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    }

    /** @returns {string} the current time as an ISO string. */
    function nowIso() {
      return new Date().toISOString()
    }

    /**
     * Normalize one tag list.
     * @param {unknown} value - candidate array.
     * @returns {string[]} trimmed, de-duplicated, non-empty tags.
     */
    function normalizeTags(value) {
      if (!Array.isArray(value)) return []
      const seen = new Set()
      const tags = []
      for (const entry of value) {
        if (typeof entry !== 'string') continue
        const tag = entry.trim()
        if (tag === '' || seen.has(tag)) continue
        seen.add(tag)
        tags.push(tag)
      }
      return tags
    }

    /**
     * Validate and normalize one stored library document.
     * @param {unknown} raw - parsed localStorage or imported document.
     * @returns {{version: number, categories: Array<object>, prompts: Array<object>} | null} the normalized library, or null when the document carries no usable content.
     */
    function normalizeLibrary(raw) {
      if (raw === null || typeof raw !== 'object') return null
      const source = /** @type {{categories?: unknown, prompts?: unknown}} */ (raw)
      const categories = []
      const categoryIds = new Set()
      const categoryNames = new Set()
      if (Array.isArray(source.categories)) {
        for (const entry of source.categories) {
          if (entry === null || typeof entry !== 'object') continue
          const id = typeof entry.id === 'string' && entry.id.trim() !== '' ? entry.id : newId('cat')
          const name = typeof entry.name === 'string' ? entry.name.trim() : ''
          if (name === '' || categoryIds.has(id) || categoryNames.has(name.toLowerCase())) continue
          categoryIds.add(id)
          categoryNames.add(name.toLowerCase())
          categories.push({
            id,
            name,
            order: Number.isFinite(entry.order) ? entry.order : categories.length,
          })
        }
      }
      const prompts = []
      if (Array.isArray(source.prompts)) {
        for (const entry of source.prompts) {
          if (entry === null || typeof entry !== 'object') continue
          const title = typeof entry.title === 'string' ? entry.title.trim() : ''
          const content = typeof entry.content === 'string' ? entry.content.trim() : ''
          if (title === '' || content === '') continue
          const categoryId = typeof entry.categoryId === 'string' && categoryIds.has(entry.categoryId)
            ? entry.categoryId
            : null
          prompts.push({
            id: typeof entry.id === 'string' && entry.id.trim() !== '' ? entry.id : newId('p'),
            title,
            content,
            categoryId,
            tags: normalizeTags(entry.tags),
            ...(typeof entry.builtinKey === 'string' && entry.builtinKey !== '' ? { builtinKey: entry.builtinKey } : {}),
            updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : nowIso(),
          })
        }
      }
      if (categories.length === 0 && prompts.length === 0) return null
      return { version: LIBRARY_VERSION, categories, prompts }
    }

    /**
     * Build the first-run library from the built-in templates.
     * @returns {{version: number, categories: Array<object>, prompts: Array<object>}} a fresh library.
     */
    function createDefaultLibrary() {
      const categories = DEFAULT_CATEGORIES.map((category, index) => ({
        id: category.id,
        name: category.name,
        order: index,
      }))
      const prompts = DEFAULT_PROMPTS.map(template => ({
        id: `builtin-${template.key}`,
        title: template.title,
        content: template.content,
        categoryId: template.categoryId,
        tags: [...template.tags],
        builtinKey: template.key,
        updatedAt: nowIso(),
      }))
      return { version: LIBRARY_VERSION, categories, prompts }
    }

    /**
     * Read the stored library, falling back to the seeded templates.
     * @returns {{version: number, categories: Array<object>, prompts: Array<object>}} the library for this page.
     */
    function loadLibrary() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw !== null) {
          const normalized = normalizeLibrary(JSON.parse(raw))
          if (normalized !== null) return normalized
          console.debug(`${PLUGIN_ID}: stored library was invalid; reseeding templates`)
        }
      } catch (error) {
        // Private modes can deny storage; the seeded library then lasts the page session.
        console.debug(`${PLUGIN_ID}: reading the stored library failed`, error)
      }
      const seeded = createDefaultLibrary()
      writeLibrary(seeded)
      return seeded
    }

    /**
     * Write the library to browser storage.
     * @param {object} library - the library to store.
     */
    function writeLibrary(library) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
      } catch (error) {
        // Storage denial must not break editing; the change stays in memory for this page session.
        console.debug(`${PLUGIN_ID}: storing the library failed`, error)
      }
    }

    /**
     * Build the exported JSON document.
     * @param {object} library - current library.
     * @returns {object} an importable document with category names beside ids.
     */
    function toExportDocument(library) {
      const categoryNames = new Map(library.categories.map(category => [category.id, category.name]))
      return {
        format: FORMAT,
        version: LIBRARY_VERSION,
        exportedAt: nowIso(),
        categories: library.categories.map(category => ({ id: category.id, name: category.name })),
        prompts: library.prompts.map(prompt => ({
          title: prompt.title,
          content: prompt.content,
          categoryId: prompt.categoryId,
          categoryName: prompt.categoryId === null ? null : categoryNames.get(prompt.categoryId) ?? null,
          tags: [...prompt.tags],
          ...(prompt.builtinKey === undefined ? {} : { builtinKey: prompt.builtinKey }),
        })),
      }
    }

    /**
     * Validate one imported JSON document.
     * @param {unknown} raw - parsed file content.
     * @returns {{categories: Array<{tempId: string, name: string}>, prompts: Array<object>} | null} importable content, or null when the document is not a prompt library.
     */
    function normalizeImportFile(raw) {
      if (raw === null || typeof raw !== 'object') return null
      const source = /** @type {{format?: unknown, categories?: unknown, prompts?: unknown}} */ (raw)
      if (source.format !== undefined && source.format !== FORMAT) return null
      if (!Array.isArray(source.prompts)) return null
      const categories = []
      const categoryTempIds = new Set()
      if (Array.isArray(source.categories)) {
        for (const entry of source.categories) {
          if (entry === null || typeof entry !== 'object') continue
          const name = typeof entry.name === 'string' ? entry.name.trim() : ''
          if (name === '') continue
          const tempId = typeof entry.id === 'string' && entry.id !== '' ? entry.id : newId('cat')
          if (categoryTempIds.has(tempId)) continue
          categoryTempIds.add(tempId)
          categories.push({ tempId, name })
        }
      }
      const prompts = []
      for (const entry of source.prompts) {
        if (entry === null || typeof entry !== 'object') continue
        const title = typeof entry.title === 'string' ? entry.title.trim() : ''
        const content = typeof entry.content === 'string' ? entry.content.trim() : ''
        if (title === '' || content === '') continue
        prompts.push({
          title,
          content,
          tags: normalizeTags(entry.tags),
          categoryId: typeof entry.categoryId === 'string' ? entry.categoryId : null,
          categoryName: typeof entry.categoryName === 'string' && entry.categoryName.trim() !== ''
            ? entry.categoryName.trim()
            : null,
          builtinKey: typeof entry.builtinKey === 'string' && entry.builtinKey !== '' ? entry.builtinKey : null,
        })
      }
      if (prompts.length === 0) return null
      return { categories, prompts }
    }

    /**
     * Merge one imported document into the current library.
     * @param {object} library - current library.
     * @param {{categories: Array<{tempId: string, name: string}>, prompts: Array<object>}} incoming - validated import.
     * @returns {{library: object, added: number, skipped: number, addedCategories: number}} merged result.
     */
    function mergeLibrary(library, incoming) {
      const categories = library.categories.map(category => ({ ...category }))
      const idMap = new Map()
      let addedCategories = 0
      for (const incomingCategory of incoming.categories) {
        const key = incomingCategory.name.toLowerCase()
        const existing = categories.find(category => category.name.toLowerCase() === key)
        if (existing !== undefined) {
          idMap.set(incomingCategory.tempId, existing.id)
          continue
        }
        const created = { id: newId('cat'), name: incomingCategory.name, order: categories.length }
        categories.push(created)
        idMap.set(incomingCategory.tempId, created.id)
        addedCategories += 1
      }
      const prompts = library.prompts.map(prompt => ({ ...prompt }))
      let added = 0
      let skipped = 0
      for (const incomingPrompt of incoming.prompts) {
        const duplicate = prompts.some(prompt => prompt.title.trim() === incomingPrompt.title
          && prompt.content.trim() === incomingPrompt.content)
        if (duplicate) {
          skipped += 1
          continue
        }
        const named = incomingPrompt.categoryName === null
          ? undefined
          : categories.find(category => category.name.toLowerCase() === incomingPrompt.categoryName.toLowerCase())
        const mapped = idMap.get(incomingPrompt.categoryId)
        const categoryId = named !== undefined
          ? named.id
          : mapped ?? (categories.some(category => category.id === incomingPrompt.categoryId) ? incomingPrompt.categoryId : null)
        prompts.push({
          id: newId('p'),
          title: incomingPrompt.title,
          content: incomingPrompt.content,
          categoryId,
          tags: [...incomingPrompt.tags],
          ...(incomingPrompt.builtinKey === null ? {} : { builtinKey: incomingPrompt.builtinKey }),
          updatedAt: nowIso(),
        })
        added += 1
      }
      return { library: { ...library, categories, prompts }, added, skipped, addedCategories }
    }

    /**
     * Add back built-in templates the current library no longer carries.
     * @param {object} library - current library.
     * @returns {{library: object, added: number}} restored result.
     */
    function restoreBuiltins(library) {
      const presentKeys = new Set(library.prompts.map(prompt => prompt.builtinKey).filter(key => key !== undefined))
      const categories = library.categories.map(category => ({ ...category }))
      const prompts = library.prompts.map(prompt => ({ ...prompt }))
      let added = 0
      for (const template of DEFAULT_PROMPTS) {
        if (presentKeys.has(template.key)) continue
        const defaultCategory = DEFAULT_CATEGORIES.find(category => category.id === template.categoryId)
        const defaultName = defaultCategory === undefined ? '' : defaultCategory.name
        const matched = defaultName === ''
          ? undefined
          : categories.find(category => category.name.toLowerCase() === defaultName.toLowerCase())
        let categoryId = matched === undefined ? null : matched.id
        if (matched === undefined && defaultName !== '') {
          const created = { id: newId('cat'), name: defaultName, order: categories.length }
          categories.push(created)
          categoryId = created.id
        }
        prompts.push({
          id: newId('p'),
          title: template.title,
          content: template.content,
          categoryId,
          tags: [...template.tags],
          builtinKey: template.key,
          updatedAt: nowIso(),
        })
        added += 1
      }
      return { library: { ...library, categories, prompts }, added }
    }

    /* ------------------------------------------------------------------ *
     * Stores
     * ------------------------------------------------------------------ */

    /**
     * Create a minimal external store for `useSyncExternalStore`.
     * @param {unknown} initial - initial snapshot.
     * @returns {{getSnapshot: () => unknown, subscribe: (listener: () => void) => () => void, set: (next: unknown) => void}} the store.
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

    /** The browser-local prompt library. */
    const libraryStore = createStore(loadLibrary())

    /** Picker state; `sessionId` scopes an open picker to one conversation. */
    const pickerStore = createStore({ sessionId: null, query: '', categoryId: ALL_CATEGORIES, tag: null })

    /**
     * Persist and publish one library replacement.
     * @param {object} library - next library.
     */
    function commitLibrary(library) {
      libraryStore.set(library)
      writeLibrary(library)
    }

    /**
     * Replace the library through a pure updater.
     * @param {(current: object) => object} updater - produces the next library.
     */
    function updateLibrary(updater) {
      commitLibrary(updater(libraryStore.getSnapshot()))
    }

    /** @returns {object} the current library snapshot. */
    function readLibrary() {
      return libraryStore.getSnapshot()
    }

    /**
     * Close the composer picker.
     */
    function closePicker() {
      const state = pickerStore.getSnapshot()
      if (state.sessionId === null) return
      pickerStore.set({ ...state, sessionId: null })
    }

    /**
     * Open the composer picker for one session, resetting the transient filters.
     * @param {string} sessionId - the session whose composer hosts the picker.
     */
    function openPicker(sessionId) {
      pickerStore.set({ sessionId, query: '', categoryId: ALL_CATEGORIES, tag: null })
    }

    /* ------------------------------------------------------------------ *
     * Derived reads and mutations used by the views
     * ------------------------------------------------------------------ */

    /**
     * @param {object} library - current library.
     * @returns {Map<string, object>} category by id.
     */
    function categoryMap(library) {
      return new Map(library.categories.map(category => [category.id, category]))
    }

    /**
     * @param {object} library - current library.
     * @returns {string[]} every tag in use, most frequent first.
     */
    function allTags(library) {
      const counts = new Map()
      for (const prompt of library.prompts) {
        for (const tag of prompt.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
      return [...counts.keys()].sort((left, right) => (counts.get(right) ?? 0) - (counts.get(left) ?? 0)
        || left.localeCompare(right, 'zh-Hans-CN'))
    }

    /**
     * Filter prompts for the management page and the picker.
     * @param {object} library - current library.
     * @param {{query?: string, categoryId?: string, tag?: (string|null)}} filters - text, category, and tag filters.
     * @returns {Array<object>} matching prompts in library order.
     */
    function filterPrompts(library, filters) {
      const query = (filters.query ?? '').trim().toLowerCase()
      const categoryFilter = filters.categoryId ?? ALL_CATEGORIES
      const tagFilter = filters.tag ?? null
      const categories = categoryMap(library)
      return library.prompts.filter((prompt) => {
        if (categoryFilter === UNCATEGORIZED) {
          if (prompt.categoryId !== null) return false
        } else if (categoryFilter !== ALL_CATEGORIES && prompt.categoryId !== categoryFilter) {
          return false
        }
        if (tagFilter !== null && !prompt.tags.includes(tagFilter)) return false
        if (query === '') return true
        const categoryName = prompt.categoryId === null ? '' : categories.get(prompt.categoryId)?.name ?? ''
        return `${prompt.title}\n${prompt.content}\n${prompt.tags.join(' ')}\n${categoryName}`
          .toLowerCase()
          .includes(query)
      })
    }

    /**
     * Insert or replace one prompt.
     * @param {object} library - current library.
     * @param {{id?: string, title: string, content: string, categoryId: string|null, tags: string[]}} input - editor result.
     * @returns {{library: object, prompt: object}} the saved library and prompt.
     */
    function savePrompt(library, input) {
      const title = input.title.trim()
      const content = input.content.trim()
      const tags = normalizeTags(input.tags)
      const categoryId = input.categoryId !== null && library.categories.some(category => category.id === input.categoryId)
        ? input.categoryId
        : null
      if (input.id !== undefined) {
        let saved
        const prompts = library.prompts.map((prompt) => {
          if (prompt.id !== input.id) return prompt
          saved = { ...prompt, title, content, categoryId, tags, updatedAt: nowIso() }
          return saved
        })
        return { library: { ...library, prompts }, prompt: saved }
      }
      const created = {
        id: newId('p'),
        title,
        content,
        categoryId,
        tags,
        updatedAt: nowIso(),
      }
      return { library: { ...library, prompts: [...library.prompts, created] }, prompt: created }
    }

    /**
     * Remove one prompt.
     * @param {object} library - current library.
     * @param {string} id - prompt id to remove.
     * @returns {object} the next library.
     */
    function removePrompt(library, id) {
      return { ...library, prompts: library.prompts.filter(prompt => prompt.id !== id) }
    }

    /**
     * Append one category.
     * @param {object} library - current library.
     * @param {string} name - requested name.
     * @returns {{library: object} | {error: 'empty'|'duplicate'}} the result.
     */
    function addCategory(library, name) {
      const trimmed = name.trim()
      if (trimmed === '') return { error: 'empty' }
      if (library.categories.some(category => category.name.toLowerCase() === trimmed.toLowerCase())) {
        return { error: 'duplicate' }
      }
      return {
        library: {
          ...library,
          categories: [...library.categories, { id: newId('cat'), name: trimmed, order: library.categories.length }],
        },
      }
    }

    /**
     * Rename one category.
     * @param {object} library - current library.
     * @param {string} id - category id.
     * @param {string} name - requested name.
     * @returns {{library: object} | {error: 'empty'|'duplicate'}} the result.
     */
    function renameCategory(library, id, name) {
      const trimmed = name.trim()
      if (trimmed === '') return { error: 'empty' }
      if (library.categories.some(category => category.id !== id && category.name.toLowerCase() === trimmed.toLowerCase())) {
        return { error: 'duplicate' }
      }
      return {
        library: {
          ...library,
          categories: library.categories.map(category => (category.id === id ? { ...category, name: trimmed } : category)),
        },
      }
    }

    /**
     * Delete one category; its prompts move to Uncategorized.
     * @param {object} library - current library.
     * @param {string} id - category id.
     * @returns {object} the next library.
     */
    function deleteCategory(library, id) {
      return {
        ...library,
        categories: library.categories.filter(category => category.id !== id),
        prompts: library.prompts.map(prompt => (prompt.categoryId === id ? { ...prompt, categoryId: null } : prompt)),
      }
    }

    /**
     * Download the current library as a JSON file.
     * @returns {boolean} whether the download was started.
     */
    function exportLibrary() {
      try {
        const text = JSON.stringify(toExportDocument(readLibrary()), null, 2)
        const blob = new Blob([text], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `prompt-library-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        setTimeout(() => { URL.revokeObjectURL(url) }, 1000)
        return true
      } catch (error) {
        console.debug(`${PLUGIN_ID}: exporting the library failed`, error)
        return false
      }
    }

    /* ------------------------------------------------------------------ *
     * Icons and small shared atoms
     * ------------------------------------------------------------------ */

    /**
     * Composer picker glyph.
     * @param {{className?: string}} props - optional class name.
     * @returns {object} the icon element.
     */
    function PromptGlyph({ className }) {
      return h('svg', {
        width: 16,
        height: 16,
        viewBox: '0 0 16 16',
        fill: 'none',
        'aria-hidden': 'true',
        className,
      },
      h('path', {
        d: 'M2.5 3.5h8.5a1 1 0 0 1 1 1V6M2.5 3.5v9a1 1 0 0 0 1 1h3',
        stroke: 'currentColor',
        strokeWidth: 1.2,
        strokeLinecap: 'round',
      }),
      h('rect', { x: 6.5, y: 6, width: 7, height: 6.5, rx: 1.2, stroke: 'currentColor', strokeWidth: 1.2 }),
      h('path', { d: 'M8.5 8.5h3M8.5 10.5h2', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }))
    }

    /**
     * Close glyph.
     * @returns {object} the icon element.
     */
    function CloseGlyph() {
      return h('svg', { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'm3.5 3.5 7 7m0-7-7 7', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }))
    }

    /**
     * One tag pill.
     * @param {{tag: string}} props - tag text.
     * @returns {object} the pill element.
     */
    function TagPill({ tag }) {
      return h('span', { className: 'dsh-prompt-tag' }, tag)
    }

    /* ------------------------------------------------------------------ *
     * Composer picker
     * ------------------------------------------------------------------ */

    /**
     * Toolbar button that toggles the picker for its own session.
     * @param {{t: Function, sessionId: string}} props - locale, and the hosting session.
     * @returns {object} the button element.
     */
    function PromptComposerButton({ t, sessionId }) {
      const picker = React.useSyncExternalStore(pickerStore.subscribe, pickerStore.getSnapshot)
      const active = picker.sessionId === sessionId
      const label = t('composer.action')
      const toggle = () => {
        if (active) closePicker()
        else openPicker(sessionId)
      }
      return h('button', {
        type: 'button',
        className: active ? 'dsh-prompt-trigger dsh-prompt-trigger-active' : 'dsh-prompt-trigger',
        title: label,
        'aria-label': label,
        'aria-haspopup': 'dialog',
        'aria-expanded': active ? 'true' : 'false',
        'data-dsh-prompt-trigger': '',
        onMouseDown: (event) => { event.preventDefault() },
        onClick: toggle,
      },
      h(PromptGlyph, { className: 'dsh-prompt-trigger-icon' }))
    }

    /**
     * Picker overlay: search, category and tag filters, and the insert action.
     * @param {object} props - composed session slot props plus the injected session face.
     * @returns {object|null} the panel element while open, otherwise null.
     */
    function PromptPickerOverlay({ t, useInput, inputActions, sessionId, focusComposer }) {
      const picker = React.useSyncExternalStore(pickerStore.subscribe, pickerStore.getSnapshot)
      const library = React.useSyncExternalStore(libraryStore.subscribe, libraryStore.getSnapshot)
      const inputState = useInput(value => value)
      const open = picker.sessionId === sessionId
      const [activeIndex, setActiveIndex] = React.useState(0)
      const panelRef = React.useRef(null)
      const searchRef = React.useRef(null)

      const visible = filterPrompts(library, {
        query: picker.query,
        categoryId: picker.categoryId,
        tag: picker.tag,
      })
      const tags = allTags(library)
      const categories = [...library.categories].sort((left, right) => left.order - right.order)
      const categoriesById = categoryMap(library)
      const hasUncategorized = library.prompts.some(prompt => prompt.categoryId === null)

      // The panel is bottom-anchored to the composer card, inside the
      // conversation scroll area: its usable height is the space between that
      // anchor and the nearest clipping ancestor, not a viewport fraction.
      React.useLayoutEffect(() => {
        if (!open) return undefined
        const applyMaxHeight = () => {
          const node = panelRef.current
          if (node === null) return
          const bottom = node.getBoundingClientRect().bottom
          let clipTop = 0
          for (let ancestor = node.parentElement; ancestor !== null; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor)
            if (style.overflowX === 'visible' && style.overflowY === 'visible') continue
            clipTop = Math.max(clipTop, ancestor.getBoundingClientRect().top)
          }
          const available = bottom - clipTop - 8
          node.style.maxHeight = `${Math.max(160, Math.min(460, available))}px`
        }
        applyMaxHeight()
        window.addEventListener('resize', applyMaxHeight)
        return () => { window.removeEventListener('resize', applyMaxHeight) }
      }, [open])

      React.useEffect(() => {
        if (!open) return undefined
        const focusTimer = window.setTimeout(() => {
          if (searchRef.current !== null) searchRef.current.focus()
        }, 0)
        setActiveIndex(0)
        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            closePicker()
            if (focusComposer !== undefined) focusComposer()
          }
        }
        const onPointerDown = (event) => {
          const target = event.target
          if (!(target instanceof Element)) return
          if (target.closest('[data-dsh-prompt-picker]') !== null) return
          if (target.closest('[data-dsh-prompt-trigger]') !== null) return
          closePicker()
        }
        document.addEventListener('keydown', onKeyDown, true)
        document.addEventListener('pointerdown', onPointerDown, true)
        return () => {
          window.clearTimeout(focusTimer)
          document.removeEventListener('keydown', onKeyDown, true)
          document.removeEventListener('pointerdown', onPointerDown, true)
        }
      }, [open, focusComposer])

      if (!open) return null

      const setFilters = (patch) => {
        pickerStore.set({ ...pickerStore.getSnapshot(), ...patch })
        setActiveIndex(0)
      }

      const pick = (prompt) => {
        const span = inputActions.captureInsertion()
        const draft = inputState.draft
        const separator = draft.trim() === '' ? '' : '\n\n'
        const inserted = inputActions.insertText(`${separator}${prompt.content}`, span)
        if (!inserted) {
          inputActions.setDraft(draft.trim() === '' ? prompt.content : `${draft.replace(/\s+$/u, '')}\n\n${prompt.content}`)
        }
        closePicker()
        if (focusComposer !== undefined) focusComposer()
      }

      const onSearchKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          if (visible.length === 0) return
          setActiveIndex(index => (index + 1) % visible.length)
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          if (visible.length === 0) return
          setActiveIndex(index => (index - 1 + visible.length) % visible.length)
        } else if (event.key === 'Enter') {
          event.preventDefault()
          const prompt = visible[Math.min(activeIndex, visible.length - 1)]
          if (prompt !== undefined) pick(prompt)
        }
      }

      const categoryTabs = [
        { id: ALL_CATEGORIES, label: t('filter.allCategories') },
        ...categories.map(category => ({ id: category.id, label: category.name })),
        ...(hasUncategorized ? [{ id: UNCATEGORIZED, label: t('filter.uncategorized') }] : []),
      ]

      return h('div', {
        className: 'dsh-prompt-picker',
        role: 'dialog',
        'aria-label': t('composer.action'),
        'data-dsh-prompt-picker': '',
        ref: panelRef,
      },
      h('div', { className: 'dsh-prompt-picker-head' },
        h('div', { className: 'dsh-prompt-picker-title-row' },
          h('span', { className: 'dsh-prompt-picker-title' }, t('picker.title')),
          h('span', { className: 'dsh-prompt-picker-count' }, t('picker.count', { count: visible.length })),
          h('button', {
            type: 'button',
            className: 'dsh-prompt-picker-close',
            'aria-label': t('action.close'),
            onClick: () => {
              closePicker()
              if (focusComposer !== undefined) focusComposer()
            },
          }, h(CloseGlyph, null))),
        h('input', {
          ref: searchRef,
          className: 'dsh-prompt-picker-search',
          type: 'search',
          value: picker.query,
          placeholder: t('picker.searchPlaceholder'),
          'aria-label': t('picker.searchPlaceholder'),
          onChange: (event) => { setFilters({ query: event.target.value }) },
          onKeyDown: onSearchKeyDown,
        }),
        h('div', { className: 'dsh-prompt-filter-row' },
          h('span', { className: 'dsh-prompt-filter-label' }, t('picker.categories')),
          h('div', { className: 'dsh-prompt-segmented', role: 'tablist', 'aria-label': t('picker.categories') },
            categoryTabs.map(tab => h('button', {
              key: tab.id,
              type: 'button',
              role: 'tab',
              'aria-selected': picker.categoryId === tab.id ? 'true' : 'false',
              className: picker.categoryId === tab.id
                ? 'dsh-prompt-segmented-item dsh-prompt-segmented-item-active'
                : 'dsh-prompt-segmented-item',
              onClick: () => { setFilters({ categoryId: tab.id }) },
            }, tab.label)))),
        tags.length === 0
          ? null
          : h('div', { className: 'dsh-prompt-filter-row' },
            h('span', { className: 'dsh-prompt-filter-label' }, t('picker.tags')),
            h('div', { className: 'dsh-prompt-pill-scroll' },
              tags.map(tag => h('button', {
                key: tag,
                type: 'button',
                'aria-pressed': picker.tag === tag ? 'true' : 'false',
                className: picker.tag === tag ? 'dsh-prompt-pill dsh-prompt-pill-active' : 'dsh-prompt-pill',
                onClick: () => { setFilters({ tag: picker.tag === tag ? null : tag }) },
              }, tag))))),
      h('div', { className: 'dsh-prompt-picker-list', role: 'listbox', 'aria-label': t('picker.searchPlaceholder') },
        visible.length === 0
          ? h('div', { className: 'dsh-prompt-picker-empty' }, t('picker.empty'))
          : visible.map((prompt, index) => {
            const categoryName = prompt.categoryId === null ? t('filter.uncategorized') : categoriesById.get(prompt.categoryId)?.name ?? ''
            return h('button', {
              key: prompt.id,
              type: 'button',
              role: 'option',
              'aria-selected': index === activeIndex ? 'true' : 'false',
              className: index === activeIndex ? 'dsh-prompt-picker-row dsh-prompt-picker-row-active' : 'dsh-prompt-picker-row',
              onMouseDown: (event) => { event.preventDefault() },
              onMouseEnter: () => { setActiveIndex(index) },
              onClick: () => { pick(prompt) },
            },
            h('span', { className: 'dsh-prompt-picker-row-head' },
              h('span', { className: 'dsh-prompt-picker-row-title' }, prompt.title),
              h('span', { className: 'dsh-prompt-picker-row-category' }, categoryName)),
            prompt.tags.length === 0
              ? null
              : h('span', { className: 'dsh-prompt-picker-row-meta' }, prompt.tags.map(tag => h(TagPill, { key: tag, tag }))),
            h('span', { className: 'dsh-prompt-picker-row-excerpt' }, prompt.content.replace(/\s+/gu, ' ')))
          })),
      h('div', { className: 'dsh-prompt-picker-foot' },
        h('span', null, t('picker.hint')),
        h('button', {
          type: 'button',
          className: 'dsh-prompt-link',
          onClick: () => {
            closePicker()
            if (focusComposer !== undefined) focusComposer()
          },
        }, t('action.close'))))
    }

    /* ------------------------------------------------------------------ *
     * Settings page
     * ------------------------------------------------------------------ */

    /**
     * Two-step delete control shared by the prompt cards.
     * @param {{t: Function, onDelete: Function}} props - locale and the delete action.
     * @returns {object} the button element.
     */
    function DeleteButton({ t, onDelete }) {
      const [pending, setPending] = React.useState(false)
      const timer = React.useRef(0)
      React.useEffect(() => () => { window.clearTimeout(timer.current) }, [])
      const click = () => {
        if (!pending) {
          setPending(true)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => { setPending(false) }, 4000)
          return
        }
        window.clearTimeout(timer.current)
        setPending(false)
        onDelete()
      }
      return h('button', {
        type: 'button',
        className: 'dsh-prompt-btn dsh-prompt-btn-danger',
        onClick: click,
      }, pending ? t('action.confirmDelete') : t('action.delete'))
    }

    /**
     * One category row with an inline rename field and a two-step delete.
     * @param {object} props - locale, category, prompt count, and actions.
     * @returns {object} the row element.
     */
    function CategoryRow({ t, category, count, onRename, onDelete }) {
      const [name, setName] = React.useState(category.name)
      const [pending, setPending] = React.useState(false)
      const timer = React.useRef(0)
      React.useEffect(() => { setName(category.name) }, [category.name])
      React.useEffect(() => () => { window.clearTimeout(timer.current) }, [])
      const commit = () => {
        const trimmed = name.trim()
        if (trimmed === '' || trimmed === category.name) {
          setName(category.name)
          return
        }
        if (!onRename(category.id, trimmed)) setName(category.name)
      }
      const clickDelete = () => {
        if (!pending) {
          setPending(true)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => { setPending(false) }, 4000)
          return
        }
        window.clearTimeout(timer.current)
        setPending(false)
        onDelete(category.id)
      }
      return h('div', { className: 'dsh-prompt-category-row' },
        h('input', {
          className: 'dsh-prompt-input dsh-prompt-category-name',
          value: name,
          'aria-label': t('category.renameLabel'),
          onChange: (event) => { setName(event.target.value) },
          onBlur: commit,
          onKeyDown: (event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
          },
        }),
        h('span', { className: 'dsh-prompt-category-count' }, `${count}`),
        h('button', {
          type: 'button',
          className: 'dsh-prompt-btn dsh-prompt-btn-danger',
          title: t('category.deleteHint'),
          onClick: clickDelete,
        }, pending ? t('action.confirmDelete') : t('action.delete')))
    }

    /**
     * Prompt editor dialog; validates locally and hands the result to the page.
     * @param {object} props - locale, initial values, categories, tag glossary, and callbacks.
     * @returns {object} the dialog element.
     */
    function PromptEditor({ t, initial, categories, tags, onCancel, onSave }) {
      const [title, setTitle] = React.useState(initial.title)
      const [content, setContent] = React.useState(initial.content)
      const [categoryId, setCategoryId] = React.useState(initial.categoryId === null ? UNCATEGORIZED : initial.categoryId)
      const [tagsText, setTagsText] = React.useState(initial.tags.join(', '))
      const [error, setError] = React.useState(null)
      const titleRef = React.useRef(null)
      React.useEffect(() => {
        if (titleRef.current !== null) titleRef.current.focus()
      }, [])
      React.useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            onCancel()
          }
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => { document.removeEventListener('keydown', onKeyDown, true) }
      }, [onCancel])
      const addTag = (tag) => {
        const current = tagsText.split(/[,，]/u).map(part => part.trim()).filter(part => part !== '')
        if (current.includes(tag)) return
        setTagsText([...current, tag].join(', '))
      }
      const submit = () => {
        if (title.trim() === '') {
          setError(t('editor.error.title'))
          return
        }
        if (content.trim() === '') {
          setError(t('editor.error.content'))
          return
        }
        onSave({
          id: initial.id,
          title,
          content,
          categoryId: categoryId === UNCATEGORIZED ? null : categoryId,
          tags: tagsText.split(/[,，]/u).map(part => part.trim()).filter(part => part !== ''),
        })
      }
      return h('div', { className: 'dsh-prompt-dialog-root' },
        h('div', {
          className: 'dsh-prompt-dialog-mask',
          onMouseDown: (event) => { event.preventDefault(); onCancel() },
        }),
        h('div', {
          className: 'dsh-prompt-dialog',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': initial.id === undefined ? t('editor.newTitle') : t('editor.editTitle'),
        },
        h('div', { className: 'dsh-prompt-dialog-header' },
          h('h3', { className: 'dsh-prompt-dialog-title' }, initial.id === undefined ? t('editor.newTitle') : t('editor.editTitle')),
          h('button', {
            type: 'button',
            className: 'dsh-prompt-dialog-close',
            'aria-label': t('action.close'),
            onClick: onCancel,
          }, h(CloseGlyph, null))),
        h('div', { className: 'dsh-prompt-dialog-body' },
          h('div', { className: 'dsh-prompt-field' },
            h('span', { className: 'dsh-prompt-label' }, t('editor.field.title')),
            h('input', {
              ref: titleRef,
              className: 'dsh-prompt-input',
              value: title,
              placeholder: t('editor.field.titlePlaceholder'),
              onChange: (event) => { setTitle(event.target.value); setError(null) },
            })),
          h('div', { className: 'dsh-prompt-field' },
            h('span', { className: 'dsh-prompt-label' }, t('editor.field.category')),
            h('select', {
              className: 'dsh-prompt-select',
              value: categoryId,
              onChange: (event) => { setCategoryId(event.target.value) },
            },
            categories.map(category => h('option', { key: category.id, value: category.id }, category.name)),
            h('option', { value: UNCATEGORIZED }, t('filter.uncategorized')))),
          h('div', { className: 'dsh-prompt-field' },
            h('span', { className: 'dsh-prompt-label' }, t('editor.field.tags')),
            h('input', {
              className: 'dsh-prompt-input',
              value: tagsText,
              placeholder: t('editor.field.tagsPlaceholder'),
              onChange: (event) => { setTagsText(event.target.value) },
            }),
            tags.length === 0
              ? null
              : h('div', { className: 'dsh-prompt-filter-row' },
                h('span', { className: 'dsh-prompt-hint' }, t('editor.field.tagsHint')),
                h('div', { className: 'dsh-prompt-pill-scroll' },
                  tags.slice(0, 16).map(tag => h('button', {
                    key: tag,
                    type: 'button',
                    className: 'dsh-prompt-pill',
                    onClick: () => { addTag(tag) },
                  }, tag))))),
          h('div', { className: 'dsh-prompt-field' },
            h('span', { className: 'dsh-prompt-label' }, t('editor.field.content')),
            h('textarea', {
              className: 'dsh-prompt-textarea',
              value: content,
              placeholder: t('editor.field.contentPlaceholder'),
              onChange: (event) => { setContent(event.target.value); setError(null) },
            })),
          error === null ? null : h('div', { className: 'dsh-prompt-error', role: 'alert' }, error)),
        h('div', { className: 'dsh-prompt-dialog-footer' },
          h('button', { type: 'button', className: 'dsh-prompt-btn dsh-prompt-btn-outline', onClick: onCancel }, t('action.cancel')),
          h('button', { type: 'button', className: 'dsh-prompt-btn dsh-prompt-btn-primary', onClick: submit }, t('action.save')))))
    }

    /**
     * The Settings management page.
     * @param {{t: Function}} props - locale seat.
     * @returns {object} the page element.
     */
    function PromptLibrarySection({ t }) {
      const library = React.useSyncExternalStore(libraryStore.subscribe, libraryStore.getSnapshot)
      const [query, setQuery] = React.useState('')
      const [categoryFilter, setCategoryFilter] = React.useState(ALL_CATEGORIES)
      const [tagFilter, setTagFilter] = React.useState(null)
      const [editor, setEditor] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [newCategoryName, setNewCategoryName] = React.useState('')
      const [categoryError, setCategoryError] = React.useState(null)
      const [tagsExpanded, setTagsExpanded] = React.useState(false)
      const importInput = React.useRef(null)

      const categories = [...library.categories].sort((left, right) => left.order - right.order)
      const categoriesById = categoryMap(library)
      const tags = allTags(library)
      const visible = filterPrompts(library, { query, categoryId: categoryFilter, tag: tagFilter })
      const hasUncategorized = library.prompts.some(prompt => prompt.categoryId === null)
      const tagLimit = 12
      const shownTags = tagsExpanded || tagFilter !== null ? tags : tags.slice(0, tagLimit)

      const notify = (kind, text) => { setNotice({ kind, text }) }

      const onSave = (value) => {
        const result = savePrompt(readLibrary(), value)
        commitLibrary(result.library)
        setEditor(null)
        notify('info', t('notice.saved'))
      }

      const onDeletePrompt = (prompt) => {
        updateLibrary(current => removePrompt(current, prompt.id))
        notify('info', t('notice.deleted'))
      }

      const onRenameCategory = (id, name) => {
        const result = renameCategory(readLibrary(), id, name)
        if (result.error !== undefined) {
          notify('error', t(`category.error.${result.error}`))
          return false
        }
        commitLibrary(result.library)
        return true
      }

      const onDeleteCategory = (id) => {
        updateLibrary(current => deleteCategory(current, id))
      }

      const onAddCategory = () => {
        const result = addCategory(readLibrary(), newCategoryName)
        if (result.error !== undefined) {
          setCategoryError(t(`category.error.${result.error}`))
          return
        }
        commitLibrary(result.library)
        setNewCategoryName('')
        setCategoryError(null)
      }

      const onCopy = async (prompt) => {
        try {
          await navigator.clipboard.writeText(prompt.content)
          notify('info', t('notice.copied', { title: prompt.title }))
        } catch (error) {
          console.debug(`${PLUGIN_ID}: clipboard write failed`, error)
          notify('error', t('notice.copyFailed'))
        }
      }

      const onExport = () => {
        if (exportLibrary()) notify('info', t('notice.exported'))
      }

      const onImportChosen = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file === undefined) return
        try {
          const raw = JSON.parse(await file.text())
          const incoming = normalizeImportFile(raw)
          if (incoming === null) {
            notify('error', t('notice.importInvalid'))
            return
          }
          const result = mergeLibrary(readLibrary(), incoming)
          commitLibrary(result.library)
          notify('info', t('notice.imported', {
            prompts: result.added,
            categories: result.addedCategories,
            skipped: result.skipped,
          }))
        } catch (error) {
          console.debug(`${PLUGIN_ID}: import failed`, error)
          notify('error', t('notice.importFailed'))
        }
      }

      const onRestore = () => {
        const result = restoreBuiltins(readLibrary())
        commitLibrary(result.library)
        notify('info', result.added === 0 ? t('notice.restoreNone') : t('notice.restored', { count: result.added }))
      }

      const clearFilters = () => {
        setQuery('')
        setCategoryFilter(ALL_CATEGORIES)
        setTagFilter(null)
      }

      const categoryTabs = [
        { id: ALL_CATEGORIES, label: t('filter.allCategories') },
        ...categories.map(category => ({ id: category.id, label: category.name })),
        ...(hasUncategorized ? [{ id: UNCATEGORIZED, label: t('filter.uncategorized') }] : []),
      ]

      return h('div', { className: 'dsh-prompt-section' },
        h('div', { className: 'dsh-prompt-header' },
          h('div', { className: 'dsh-prompt-heading' },
            h('h2', { className: 'dsh-prompt-title' }, t('section.title')),
            h('div', { className: 'dsh-prompt-description' }, t('section.description')),
            h('div', { className: 'dsh-prompt-hint' }, t('section.stats', {
              prompts: library.prompts.length,
              categories: library.categories.length,
            }))),
          h('div', { className: 'dsh-prompt-header-actions' },
            h('input', {
              ref: importInput,
              type: 'file',
              accept: 'application/json,.json',
              style: { display: 'none' },
              onChange: onImportChosen,
            }),
            h('button', {
              type: 'button',
              className: 'dsh-prompt-btn dsh-prompt-btn-outline',
              onClick: () => { importInput.current?.click() },
            }, t('action.import')),
            h('button', {
              type: 'button',
              className: 'dsh-prompt-btn dsh-prompt-btn-outline',
              onClick: onExport,
            }, t('action.export')),
            h('button', {
              type: 'button',
              className: 'dsh-prompt-btn dsh-prompt-btn-outline',
              onClick: onRestore,
            }, t('action.reset')),
            h('button', {
              type: 'button',
              className: 'dsh-prompt-btn dsh-prompt-btn-primary',
              onClick: () => { setEditor({ mode: 'new' }) },
            }, t('action.new')))),
        notice === null
          ? null
          : h('div', {
            className: notice.kind === 'error' ? 'dsh-prompt-notice dsh-prompt-notice-error' : 'dsh-prompt-notice',
            role: notice.kind === 'error' ? 'alert' : 'status',
          }, notice.text),
        h('div', { className: 'dsh-prompt-toolbar' },
          h('div', { className: 'dsh-prompt-toolbar-row' },
            h('input', {
              className: 'dsh-prompt-input dsh-prompt-search',
              type: 'search',
              value: query,
              placeholder: t('search.placeholder'),
              'aria-label': t('search.placeholder'),
              onChange: (event) => { setQuery(event.target.value) },
            })),
          h('div', { className: 'dsh-prompt-filter-row' },
            h('span', { className: 'dsh-prompt-filter-label' }, t('category.title')),
            h('div', { className: 'dsh-prompt-segmented', role: 'tablist', 'aria-label': t('category.title') },
              categoryTabs.map(tab => h('button', {
                key: tab.id,
                type: 'button',
                role: 'tab',
                'aria-selected': categoryFilter === tab.id ? 'true' : 'false',
                className: categoryFilter === tab.id
                  ? 'dsh-prompt-segmented-item dsh-prompt-segmented-item-active'
                  : 'dsh-prompt-segmented-item',
                onClick: () => { setCategoryFilter(tab.id) },
              }, tab.label)))),
          tags.length === 0
            ? null
            : h('div', { className: 'dsh-prompt-filter-row', role: 'group', 'aria-label': t('filter.tags') },
              h('span', { className: 'dsh-prompt-filter-label' }, t('filter.tags')),
              h('div', { className: 'dsh-prompt-pill-scroll' },
                shownTags.map(tag => h('button', {
                  key: tag,
                  type: 'button',
                  'aria-pressed': tagFilter === tag ? 'true' : 'false',
                  className: tagFilter === tag ? 'dsh-prompt-pill dsh-prompt-pill-active' : 'dsh-prompt-pill',
                  onClick: () => { setTagFilter(tagFilter === tag ? null : tag) },
                }, tag))),
              tags.length > tagLimit && tagFilter === null
                ? h('button', {
                  type: 'button',
                  className: 'dsh-prompt-link',
                  onClick: () => { setTagsExpanded(value => !value) },
                }, tagsExpanded ? t('filter.lessTags') : t('filter.moreTags'))
                : null,
              tagFilter === null ? null : h('button', {
                type: 'button',
                className: 'dsh-prompt-link',
                onClick: clearFilters,
              }, t('filter.clear'))),
          h('details', { className: 'dsh-prompt-category-panel' },
            h('summary', { className: 'dsh-prompt-category-summary' },
              t('category.summary', { count: categories.length })),
            h('div', { className: 'dsh-prompt-category-list' },
              categories.length === 0
                ? h('p', { className: 'dsh-prompt-hint' }, t('category.empty'))
                : categories.map(category => h(CategoryRow, {
                  key: category.id,
                  t,
                  category,
                  count: library.prompts.filter(prompt => prompt.categoryId === category.id).length,
                  onRename: onRenameCategory,
                  onDelete: onDeleteCategory,
                })),
              h('div', { className: 'dsh-prompt-category-add' },
                h('input', {
                  className: 'dsh-prompt-input',
                  value: newCategoryName,
                  placeholder: t('category.placeholder'),
                  'aria-label': t('category.placeholder'),
                  onChange: (event) => { setNewCategoryName(event.target.value); setCategoryError(null) },
                  onKeyDown: (event) => { if (event.key === 'Enter') { event.preventDefault(); onAddCategory() } },
                }),
                h('button', {
                  type: 'button',
                  className: 'dsh-prompt-btn dsh-prompt-btn-outline',
                  onClick: onAddCategory,
                }, t('action.addCategory'))),
              categoryError === null ? null : h('div', { className: 'dsh-prompt-error' }, categoryError)))),
        visible.length === 0
          ? h('div', { className: 'dsh-prompt-empty' },
            h('div', { className: 'dsh-prompt-empty-title' }, library.prompts.length === 0 ? t('library.emptyTitle') : t('filter.emptyTitle')),
            h('div', { className: 'dsh-prompt-empty-description' }, library.prompts.length === 0 ? t('library.emptyDescription') : t('filter.emptyDescription')))
          : h('div', { className: 'dsh-prompt-list' },
            visible.map(prompt => {
              const categoryName = prompt.categoryId === null
                ? t('filter.uncategorized')
                : categoriesById.get(prompt.categoryId)?.name ?? ''
              return h('article', { key: prompt.id, className: 'dsh-prompt-card' },
                h('div', { className: 'dsh-prompt-card-head' },
                  h('div', { className: 'dsh-prompt-card-heading' },
                    h('div', { className: 'dsh-prompt-card-title' },
                      prompt.title,
                      prompt.builtinKey === undefined ? null : h('span', { className: 'dsh-prompt-badge' }, t('editor.builtinBadge'))),
                    h('div', { className: 'dsh-prompt-card-meta' },
                      h('span', null, categoryName),
                      prompt.tags.map(tag => h(TagPill, { key: tag, tag })))),
                  h('div', { className: 'dsh-prompt-card-actions' },
                    h('button', {
                      type: 'button',
                      className: 'dsh-prompt-btn',
                      onClick: () => { setEditor({ mode: 'edit', prompt }) },
                    }, t('action.edit')),
                    h('button', {
                      type: 'button',
                      className: 'dsh-prompt-btn',
                      onClick: () => { void onCopy(prompt) },
                    }, t('action.copy')),
                    h(DeleteButton, { t, onDelete: () => { onDeletePrompt(prompt) } }))),
                h('p', { className: 'dsh-prompt-card-excerpt' }, prompt.content))
            })),
        editor === null
          ? null
          : h(PromptEditor, {
            t,
            initial: editor.mode === 'edit'
              ? {
                id: editor.prompt.id,
                title: editor.prompt.title,
                content: editor.prompt.content,
                categoryId: editor.prompt.categoryId,
                tags: editor.prompt.tags,
              }
              : { id: undefined, title: '', content: '', categoryId: null, tags: [] },
            categories,
            tags,
            onCancel: () => { setEditor(null) },
            onSave,
          }))
    }

    return {
      inject: ['slots', 'locale', 'sessions', 'conversation'],
      apply(ctx) {
        // One stylesheet for every surface this bundle renders.
        ctx.effect(() => {
          if (typeof document === 'undefined') return () => {}
          const tag = document.createElement('style')
          tag.dataset.plugin = PLUGIN_ID
          tag.dataset.pluginCss = `${PLUGIN_ID}/prompt-library.css`
          tag.textContent = STYLES
          document.head.appendChild(tag)
          return () => { tag.remove() }
        }, `${PLUGIN_ID}: styles`)

        ctx.effect(() => ctx.locale.register(NAMESPACE, { en: DICTIONARIES.en, zh: DICTIONARIES.zh }),
          `${PLUGIN_ID}: dictionaries`)

        // Keep this tab in step with edits made by another tab.
        if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
          ctx.effect(() => {
            const onStorage = (event) => {
              if (event.key !== STORAGE_KEY) return
              if (event.newValue === null) return
              try {
                const normalized = normalizeLibrary(JSON.parse(event.newValue))
                if (normalized !== null) libraryStore.set(normalized)
              } catch (error) {
                console.debug(`${PLUGIN_ID}: reading a cross-tab library update failed`, error)
              }
            }
            window.addEventListener('storage', onStorage)
            return () => { window.removeEventListener('storage', onStorage) }
          }, `${PLUGIN_ID}: cross-tab library updates`)
        }

        const t = ctx.locale.bind(NAMESPACE)

        ctx.slots.inject(SETTINGS_SLOT, () => ctx.slots.register({
          name: SETTINGS_SLOT,
          id: 'prompt-library',
          order: 30,
          label: () => t('nav'),
          locale: NAMESPACE,
        }, PromptLibrarySection))

        ctx.slots.inject(TRIGGER_SLOT, () => ctx.slots.register({
          name: TRIGGER_SLOT,
          id: 'prompt-library',
          order: 20,
          label: () => t('composer.action'),
          locale: NAMESPACE,
        }, PromptComposerButton))

        ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register({
          name: OVERLAY_SLOT,
          id: 'prompt-library-picker',
          order: 900,
          label: () => t('composer.action'),
          locale: NAMESPACE,
          inject: (sessionId) => {
            const actx = ctx.sessions.scope(sessionId)
            let focusComposer
            if (actx !== undefined) {
              try {
                const input = ctx.conversation.input.for(actx)
                focusComposer = () => { input.focus() }
              } catch (error) {
                console.debug(`${PLUGIN_ID}: composer focus is unavailable for this session`, error)
              }
            }
            return { focusComposer }
          },
        }, PromptPickerOverlay))
      },
    }
  },
})
