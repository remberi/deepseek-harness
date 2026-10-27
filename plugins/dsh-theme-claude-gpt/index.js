/**
 * Host half of the Brand themes bundle. The themes, their persistence, and the
 * Brand themes settings row all live in the browser half (`client.js`); this
 * plugin has nothing to contribute to the Host composition, so the bundle
 * layer only needs a loadable package here.
 */

/** Cordis plugin name for the Host row. */
export const name = 'dsh-theme-claude-gpt'

/** No Host-side behavior. */
export function apply() {}
