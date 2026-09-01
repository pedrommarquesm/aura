import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Haptics are fire-and-forget: a rejected promise here must never interrupt the
 * animation that triggered it, and the web build has no hardware to buzz.
 */
function fire(run: () => Promise<void>) {
  if (!supported) return;
  run().catch(() => {});
}

/** Ordinary confirmation — a toggle, a menu action. */
export function tapFeedback() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** An earned moment — a vote committed, rank up. */
export function celebrateFeedback() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function errorFeedback() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/**
 * Vote slider haptics (docs/redesign-tracker.md Q20).
 *
 * Charging **up** (positive): light, fast pulses — escalating enthusiasm.
 * Charging **down** (negative): heavy, sluggish impacts — deliberately
 * effortful, so pushing a post toward Aura Debt feels weightier than
 * rewarding it. Both are throttled by the caller (every few units of drag),
 * never fired on every pixel of movement.
 */
export function voteChargeUpFeedback() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function voteChargeDownFeedback() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

/** Release at 0 — a cancel, not a vote (Q2). Distinct from a committed vote. */
export function voteCancelFeedback() {
  fire(() => Haptics.selectionAsync());
}
