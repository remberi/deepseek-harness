/** Account-menu extension contract: feature rows the account menu hosts between its own rows. */
import type {} from '@deepseek-ai/dsh-client-ui-slots'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * One row of the sidebar account menu, rendered between the Settings and
     * Feedback rows in ascending `order`. The registrant owns the row's
     * presentation and destination; the menu supplies the account facts and
     * its own dismissal, and the row acts outside the menu (a link, a dialog)
     * after closing it.
     */
    'settings.launcher.menu.item': { kind: 'list'; scope: 'root'; owner: AccountMenuRowOwnerProps }
  }
}

/** Account facts and menu dismissal handed to one account-menu row. */
export interface AccountMenuRowOwnerProps {
  /** Whether an account credential is stored; a signed-out menu has no balance to show. */
  readonly signedIn: boolean
  /**
   * Topped-up balance formatted with the Platform Web currency rules, joined
   * across wallets. Absent while the read is pending, after a failed read, or
   * when the account holds no wallet.
   */
  readonly balanceText: string | undefined
  /** Platform top-up destination from the latest account state; absent before the first account frame. */
  readonly topUpUrl: string | undefined
  /** Dismiss the account menu before acting elsewhere. */
  readonly close: () => void
}
