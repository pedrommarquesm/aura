import type { ComponentType } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { Text as UiText } from './text';
import { parseCaptionSegments } from '@/lib/hashtags';
import { colors, radius, typography } from '@/theme/tokens';

export type CaptionFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
  /** Bottom sheets need gorhom's input so the keyboard does not cover the field. */
  InputComponent?: ComponentType<TextInputProps>;
};

const fieldBox = {
  width: '100%' as const,
  borderWidth: 1,
  borderRadius: radius.md,
  backgroundColor: colors.surface.elevated,
  minHeight: 96,
};

const textMetrics = {
  paddingHorizontal: 12,
  paddingTop: 12,
  paddingBottom: 12,
  fontSize: typography.body.fontSize,
  lineHeight: typography.body.lineHeight,
  fontWeight: typography.body.fontWeight,
};

/**
 * Caption compose field. Hashtags render in aura-bright. They are not tappable
 * while writing — tapping a tag on a published post is what opens the tag page.
 */
export function CaptionField({
  label,
  error,
  style,
  value,
  InputComponent = TextInput,
  ...props
}: CaptionFieldProps) {
  const text = typeof value === 'string' ? value : '';

  return (
    <View className="w-full gap-1.5">
      {label ? (
        <UiText variant="caption" tone="muted">
          {label}
        </UiText>
      ) : null}
      <View style={[fieldBox, { borderColor: error ? colors.danger : colors.border }]}>
        <Text
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no"
          style={[
            textMetrics,
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              color: colors.text.DEFAULT,
            },
          ]}
        >
          {parseCaptionSegments(text).map((segment, index) => (
            <Text
              key={`${segment.tag ?? 't'}-${index}`}
              style={{ color: segment.tag ? colors.aura.bright : colors.text.DEFAULT }}
            >
              {segment.text}
            </Text>
          ))}
        </Text>
        <InputComponent
          {...props}
          value={value}
          accessibilityLabel={label ?? props.placeholder}
          placeholderTextColor={colors.text.muted}
          selectionColor={colors.aura.DEFAULT}
          cursorColor={colors.text.DEFAULT}
          autoCapitalize={props.autoCapitalize ?? 'sentences'}
          autoCorrect={props.autoCorrect ?? true}
          autoComplete={props.autoComplete ?? 'off'}
          multiline
          textAlignVertical="top"
          style={[
            textMetrics,
            {
              width: '100%',
              minHeight: 96,
              color: 'transparent',
            },
            style,
          ]}
        />
      </View>
      {error ? (
        <UiText variant="caption" tone="danger">
          {error}
        </UiText>
      ) : null}
    </View>
  );
}
