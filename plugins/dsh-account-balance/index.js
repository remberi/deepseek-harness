/**
 * Host half of the Account balance bundle. The balance row and its styles all
 * live in the browser half (`client.js`); this plugin has nothing to contribute
 * to the Host composition, so the bundle layer only needs a loadable package
 * here.
 */

/** Cordis plugin name for the Host row. */
export const name = 'dsh-account-balance'

/** No Host-side behavior. */
export function apply() {}
