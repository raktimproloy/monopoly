/** Single source of truth for roll → move → balance → history sequencing. */

export const DICE_RESULT_MS = 800;
export const TOKEN_TRANSITION_MS = 700;
export const JAIL_TRANSFER_MS = 900;
export const BALANCE_GAP_MS = 150;
export const HISTORY_GAP_MS = 200;

/** Pause after landing before auto end-turn (jail / free parking). */
export const AUTO_END_TURN_AFTER_LAND_MS = 800;

/** Brief pause after token lands before card overlay appears. */
export const CARD_SHOW_DELAY_MS = 200;

export function rollLandCompleteMs(jailViaGoToJail: boolean): number {
  return (
    DICE_RESULT_MS +
    (jailViaGoToJail ? JAIL_TRANSFER_MS + TOKEN_TRANSITION_MS : TOKEN_TRANSITION_MS)
  );
}

export function rollBalanceRevealMs(jailViaGoToJail: boolean): number {
  return rollLandCompleteMs(jailViaGoToJail) + BALANCE_GAP_MS;
}

export function rollHistoryRevealMs(jailViaGoToJail: boolean): number {
  return rollBalanceRevealMs(jailViaGoToJail) + HISTORY_GAP_MS;
}

/** Server auto end-turn should wait until Go-To-Jail animation finishes on clients. */
export const GO_TO_JAIL_AUTO_END_DELAY_MS = rollLandCompleteMs(true) + 200;
