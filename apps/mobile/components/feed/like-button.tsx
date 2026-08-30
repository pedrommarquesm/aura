import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { useFormat } from '@/lib/i18n';
import { tapFeedback } from '@/lib/haptics';
import { celebrate, instant, riseTiming, smooth } from '@/theme/motion';
import { colors } from '@/theme/tokens';

/** V0 awards a flat 10 Aura per like (roadmap `AURA-02`). */
const AURA_PER_LIKE = 10;

const PEAK_SCALE = 1.35;
const RISE_DISTANCE = 34;

export type LikeButtonHandle = {
  /** Like only. Already liked replays the celebration and does not unlike. */
  like: () => void;
  /** Toggle. The dedicated aura control unlikes; double-tap does not. */
  toggle: () => void;
};

export type LikeButtonProps = {
  likeCount: number;
  initiallyLiked?: boolean;
  /** Guest likes open the auth gate instead of toggling. */
  requireAuth?: boolean;
  onRequireAuth?: () => void;
  onChange?: (liked: boolean) => void | Promise<void>;
  size?: number;
};

/**
 * The product's signature interaction. Animation and haptics run immediately;
 * `onChange` is the API write and must never gate the visual. A rejected promise
 * rolls the heart back. Guests hit `onRequireAuth` instead of toggling.
 */
export const LikeButton = forwardRef<LikeButtonHandle, LikeButtonProps>(function LikeButton(
  {
    likeCount,
    initiallyLiked = false,
    requireAuth = false,
    onRequireAuth,
    onChange,
    size = 26,
  },
  ref,
) {
  const { t } = useTranslation();
  const format = useFormat();
  const [liked, setLiked] = useState(initiallyLiked);

  const scale = useSharedValue(1);
  const rise = useSharedValue(0);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const auraStyle = useAnimatedStyle(() => {
    const progress = rise.get();

    return {
      opacity: interpolate(progress, [0, 0.08, 0.7, 1], [0, 1, 1, 0]),
      transform: [
        { translateY: interpolate(progress, [0, 1], [0, -RISE_DISTANCE]) },
        { scale: interpolate(progress, [0, 1], [0.8, 1.1]) },
      ],
    };
  });

  const celebrateLike = useCallback(() => {
    // The rise to the peak is a fixed 100ms curve rather than a spring so the haptic can
    // be scheduled for the exact moment the heart is largest. Firing on touch-down feels
    // detached from the visual and firing on settle reads as lag. The spring is the
    // bounce back down, which is where the bounce is actually wanted.
    scale.set(
      withSequence(
        withTiming(PEAK_SCALE, instant, (finished) => {
          if (finished) runOnJS(tapFeedback)();
        }),
        withSpring(1, celebrate),
      ),
    );

    // Reset first so a rapid re-tap restarts the label instead of resuming it mid-flight.
    rise.set(0);
    rise.set(withTiming(1, riseTiming));
  }, [rise, scale]);

  const likeOnly = useCallback(() => {
    if (requireAuth) {
      onRequireAuth?.();
      return;
    }

    if (liked) {
      celebrateLike();
      return;
    }

    setLiked(true);
    void Promise.resolve(onChange?.(true)).catch(() => setLiked(false));
    celebrateLike();
  }, [celebrateLike, liked, onChange, onRequireAuth, requireAuth]);

  const toggle = useCallback(() => {
    if (requireAuth) {
      onRequireAuth?.();
      return;
    }

    const next = !liked;
    setLiked(next);
    void Promise.resolve(onChange?.(next)).catch(() => setLiked(!next));

    if (!next) {
      // Unliking is a correction, not a celebration. Acknowledge it and get out of the way.
      scale.set(withSequence(withTiming(0.88, instant), withSpring(1, smooth)));
      rise.set(0);
      return;
    }

    celebrateLike();
  }, [celebrateLike, liked, onChange, onRequireAuth, requireAuth, rise, scale]);

  useImperativeHandle(ref, () => ({ like: likeOnly, toggle }), [likeOnly, toggle]);

  const displayCount = likeCount + (liked === initiallyLiked ? 0 : liked ? 1 : -1);

  return (
    <Pressable
      accessibilityRole="button"
      // The count is the label because it is the information; the verb is the action.
      accessibilityLabel={t('feed.post.likes', { count: displayCount })}
      accessibilityHint={liked ? t('feed.post.a11y.unlike') : t('feed.post.a11y.like')}
      accessibilityState={{ selected: liked }}
      hitSlop={12}
      onPress={toggle}
      className="flex-row items-center gap-2"
    >
      <View className="items-center justify-center">
        {/* Absolute and un-clipped so the rising label can leave the button's bounds. */}
        <Animated.View
          pointerEvents="none"
          style={auraStyle}
          className="absolute -top-1 w-24 items-center"
        >
          <Text variant="caption" tone="aura" className="font-extrabold tracking-aura">
            {t('feed.post.auraGain', { amount: AURA_PER_LIKE })}
          </Text>
        </Animated.View>

        <Animated.View style={heartStyle}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={size}
            color={liked ? colors.like : colors.text.secondary}
          />
        </Animated.View>
      </View>

      <Text
        variant="label"
        tone={liked ? 'like' : 'secondary'}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {format.count(displayCount)}
      </Text>
    </Pressable>
  );
});
