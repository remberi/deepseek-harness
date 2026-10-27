/**
 * Host half of the Prompt library bundle. Every capability — the prompt
 * library data, its management page, and the composer picker — lives in the
 * browser half (`client.js`), which keeps the library in this browser's
 * `localStorage` and offers JSON import/export. This package needs no Host
 * behavior; the bundle layer only requires a loadable Host entry.
 */

/** Cordis plugin name for the Host row. */
export const name = 'dsh-prompt-library'

/** No Host-side behavior. */
export function apply() {}
