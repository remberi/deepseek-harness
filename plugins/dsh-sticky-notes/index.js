/**
 * Host half of the Sticky notes bundle.
 *
 * Every capability — the note board, its editing UI, the Settings page that
 * controls the paper colour and the wind-sway effect, and the browser-local
 * persistence — lives in the browser half (`client.js`). This package needs no
 * Host behavior; the bundle layer only requires a loadable Host entry.
 */

/** Cordis plugin name for the Host row. */
export const name = 'dsh-sticky-notes'

/** No Host-side behavior. */
export function apply() {}
