import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { castVote, type CastVoteResult } from '@/lib/api';
import {
  celebrateFeedback,
  errorFeedback,
  voteCancelFeedback,
  voteChargeDownFeedback,
  voteChargeUpFeedback,
} from '@/lib/haptics';
import { useFormat } from '@/lib/i18n';
import { smooth } from '@/theme/motion';
import { colors } from '@/theme/tokens';

/** Track geometry. Matches the reference screens in docs/redesign-screens/. */
const TRACK_HEIGHT = 220;
const HALF = TRACK_HEIGHT / 2;
const THUMB_WIDTH = 14;
const THUMB_HEIGHT = 30;
/** Wider than the thumb so the whole column near the edge is grabbable. */
const HIT_WIDTH = 56;
/** Haptic pulses fire every this many Aura, not on every pixel of drag. */
const HAPTIC_STEP = 8;

export type AuraVoteSliderProps = {
  postId: string;
  /** The server-confirmed vote amount, or null if the viewer has not voted. There is no unvote. */
  committedAmount: number | null;
  /** Guests can drag and see the number; only release asks them to sign in. */
  requireAuth: boolean;
  onRequireAuth: (amount: number) => void;
  onCommitted: (result: CastVoteResult) => void;
};

function amountFromOffset(offset: number): number {
  'worklet';
  const raw = (-offset / HALF) * 100;
  const clamped = Math.max(-100, Math.min(100, raw));
  return Math.round(clamped);
}

function offsetFromAmount(amount: number): number {
  return -(amount / 100) * HALF;
}

/**
 * The vote slider. One shot per post: dragging up charges positive Aura,
 * down charges negative Aura (Aura Debt), release commits whatever integer
 * the thumb landed on (Q1). Releasing at exactly 0 is a cancel — nothing is
 * sent (Q2). Once a vote lands, the amount is frozen and the gesture is
 * disabled; the thumb just shows where it landed.
 */
export function AuraVoteSlider({
  postId,
  committedAmount,
  requireAuth,
  onRequireAuth,
  onCommitted,
}: AuraVoteSliderProps) {
  const { t } = useTranslation();
  const format = useFormat();

  // "Adjusting state when a prop changes" (react.dev), not an effect: this
  // keeps a local optimistic lock in sync with the server-confirmed amount
  // (e.g. the auth-gate replaying a guest's vote) without ever clobbering an
  // optimistic value this component just set itself in an event handler.
  const [committedSnapshot, setCommittedSnapshot] = useState(committedAmount);
  const [locked, setLocked] = useState(committedAmount);
  if (committedAmount !== committedSnapshot) {
    setCommittedSnapshot(committedAmount);
    setLocked(committedAmount);
  }

  const [dragging, setDragging] = useState(false);
  const [liveAmount, setLiveAmount] = useState(0);

  const translateY = useSharedValue(
    committedAmount !== null ? offsetFromAmount(committedAmount) : 0,
  );
  const lastHapticStep = useSharedValue(0);

  // Rollback (failed commit -> null) and a freshly-locked amount both need
  // the thumb to spring to match — a genuine side effect on the Reanimated
  // shared value, not a React state update.
  useEffect(() => {
    translateY.set(withSpring(locked !== null ? offsetFromAmount(locked) : 0, smooth));
  }, [locked, translateY]);

  const commit = useCallback(
    async (amount: number) => {
      if (amount === 0) {
        voteCancelFeedback();
        return;
      }

      if (requireAuth) {
        onRequireAuth(amount);
        return;
      }

      setLocked(amount);
      try {
        const result = await castVote(postId, amount);
        celebrateFeedback();
        onCommitted(result);
      } catch {
        errorFeedback();
        setLocked(null);
      }
    },
    [onCommitted, onRequireAuth, postId, requireAuth],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(locked === null)
        .maxPointers(1)
        .onStart(() => {
          lastHapticStep.set(0);
          runOnJS(setDragging)(true);
        })
        .onUpdate((event) => {
          const clampedOffset = Math.max(-HALF, Math.min(HALF, event.translationY));
          translateY.set(clampedOffset);

          const amount = amountFromOffset(clampedOffset);
          runOnJS(setLiveAmount)(amount);

          const step = Math.floor(Math.abs(amount) / HAPTIC_STEP);
          if (step !== lastHapticStep.get()) {
            lastHapticStep.set(step);
            if (amount > 0) runOnJS(voteChargeUpFeedback)();
            else if (amount < 0) runOnJS(voteChargeDownFeedback)();
          }
        })
        .onEnd(() => {
          const amount = amountFromOffset(translateY.get());
          const willLock = amount !== 0 && !requireAuth;
          if (!willLock) {
            translateY.set(withSpring(0, smooth));
          }
          runOnJS(setDragging)(false);
          runOnJS(setLiveAmount)(0);
          runOnJS(commit)(amount);
        }),
    [commit, lastHapticStep, locked, requireAuth, translateY],
  );

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));

  const displayAmount = locked ?? (dragging ? liveAmount : null);
  const showNumber = displayAmount !== null && displayAmount !== 0;
  const positive = (displayAmount ?? 0) > 0;
  const thumbColor =
    locked !== null ? (locked > 0 ? colors.aura.DEFAULT : colors.danger) : colors.text.DEFAULT;

  return (
    <View
      style={{
        width: HIT_WIDTH,
        height: TRACK_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {showNumber ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', right: HIT_WIDTH + 4, alignItems: 'flex-end' }}
        >
          <Text
            variant="display"
            style={{ color: positive ? colors.aura.DEFAULT : colors.danger }}
            allowFontScaling={false}
          >
            {format.signed(displayAmount ?? 0)}
          </Text>
        </View>
      ) : null}

      <View
        pointerEvents="none"
        style={{ width: 2, height: TRACK_HEIGHT, backgroundColor: colors.border }}
      />

      <GestureDetector gesture={pan}>
        <View
          collapsable={false}
          style={{
            position: 'absolute',
            width: HIT_WIDTH,
            height: TRACK_HEIGHT,
            alignItems: 'center',
          }}
          accessibilityRole={locked === null ? 'adjustable' : undefined}
          accessibilityLabel={
            locked !== null
              ? t('feed.post.a11y.voteLocked', { amount: format.signed(locked) })
              : t('feed.post.a11y.voteSlider')
          }
        >
          <Animated.View
            style={[
              thumbStyle,
              {
                width: THUMB_WIDTH,
                height: THUMB_HEIGHT,
                backgroundColor: thumbColor,
              },
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}
