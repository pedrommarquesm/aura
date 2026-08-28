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

/** Ordinary confirmation — a like, a toggle. */
export function tapFeedback() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** An earned moment — Aura gained, rank up, a Super Like. */
export function celebrateFeedback() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function errorFeedback() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
