import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/cn';

const PULSE_MS = 900;

export type SkeletonProps = {
  className?: string;
};

/**
 * A breathing placeholder. Opacity only — a moving shimmer gradient costs a full-width
 * overdraw per row, which is exactly what the feed cannot afford.
 */
export function Skeleton({ className }: SkeletonProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.set(
      withRepeat(
        withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.get() * 0.35,
  }));

  return (
    <Animated.View
      className={cn('rounded-md bg-surface-elevated', className)}
      style={animatedStyle}
    />
  );
}
