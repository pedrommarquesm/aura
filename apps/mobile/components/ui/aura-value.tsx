import { View } from 'react-native';

import { Text, type TextTone } from './text';
import { cn } from '@/lib/cn';
import { formatAura } from '@/lib/format';

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
 * the digits from shifting sideways while a counter animates up.
 */
export function AuraValue({
  value,
  size = 'md',
  tone = 'default',
  showUnit = false,
  className,
}: AuraValueProps) {
  return (
    <View className={cn('flex-row items-center gap-1', className)}>
      <Text className={sizes[size]} tone={tone}>
        {AURA_GLYPH}
      </Text>
      <Text
        tone={tone}
        className={cn(sizes[size], 'font-extrabold tracking-aura')}
        style={{ fontVariant: ['tabular-nums'] }}
        accessibilityLabel={`${formatAura(value)} Aura`}
      >
        {formatAura(value)}
      </Text>
      {showUnit ? (
        <Text variant="label" tone="muted">
          Aura
        </Text>
      ) : null}
    </View>
  );
}
