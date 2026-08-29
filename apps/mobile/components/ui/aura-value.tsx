import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text, type TextTone } from './text';
import { cn } from '@/lib/cn';
import { useFormat } from '@/lib/i18n';
import { celebrate, instant, smooth } from '@/theme/motion';

/** The moai is Aura's mark. It reads as the unit, so it is part of the component. */
const AURA_GLYPH = '🗿';

const sizes = {
  sm: 'text-caption',
  md: 'text-label',
  lg: 'text-heading',
  xl: 'text-display',
} as const;

export type AuraValueSize = keyof typeof sizes;

export type AuraValueProps = {
  value: number;
  size?: AuraValueSize;
  tone?: TextTone;
  /** Appends the word "Aura" — for profiles and cards, not for tight rows. */
  showUnit?: boolean;
  className?: string;
};

/**
 * Aura numbers are the loudest thing on screen after the media. Tabular figures keep
 * the digits from shifting sideways while the counter animates up. A like that pays
 * +10 ticks the number instead of snapping it (MOB-41).
 */
export function AuraValue({
  value,
  size = 'md',
  tone = 'default',
  showUnit = false,
  className,
}: AuraValueProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const target = Math.trunc(value);
  const [shown, setShown] = useState(target);

  const displayed = useSharedValue(target);
  const scale = useSharedValue(1);

  useEffect(() => {
    const previous = displayed.get();
    if (previous === target) return;

    displayed.set(withTiming(target, { duration: 320 }));

    if (target > previous) {
      scale.set(withSequence(withTiming(1.12, instant), withSpring(1, celebrate)));
    } else {
      scale.set(withSequence(withTiming(0.94, instant), withSpring(1, smooth)));
    }
  }, [displayed, scale, target]);

  useAnimatedReaction(
    () => Math.round(displayed.get()),
    (current, previous) => {
      if (current !== previous) runOnJS(setShown)(current);
    },
  );

  const pulse = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const amount = format.aura(shown);

  return (
    <Animated.View
      className={cn('flex-row items-center gap-1', className)}
      style={pulse}
    >
      <Text className={sizes[size]} tone={tone}>
        {AURA_GLYPH}
      </Text>
      <Text
        tone={tone}
        className={cn(sizes[size], 'font-extrabold tracking-aura')}
        style={{ fontVariant: ['tabular-nums'] }}
        accessibilityLabel={t('common.auraAmount', { amount: target })}
      >
        {amount}
      </Text>
      {showUnit ? (
        <Text variant="label" tone="muted">
          {t('common.aura')}
        </Text>
      ) : null}
    </Animated.View>
  );
}
