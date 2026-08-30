import type { ComponentType } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './text';
import { colors, radius, typography } from '@/theme/tokens';

export type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
  /** Bottom sheets need gorhom's input so the keyboard does not cover the field. */
  InputComponent?: ComponentType<TextInputProps>;
};

/**
 * NativeWind `className` on `TextInput` often does not apply `color`. A dark
 * field with the platform default (black / transparent) looks like the input
 * is missing. Colour, height, and border stay in `style`.
 */
export function TextField({
  label,
  error,
  style,
  multiline,
  InputComponent = TextInput,
  ...props
}: TextFieldProps) {
  return (
    <View className="w-full gap-1.5">
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
      <InputComponent
        {...props}
        accessibilityLabel={label ?? props.placeholder}
        placeholderTextColor={colors.text.muted}
        selectionColor={colors.aura.DEFAULT}
        cursorColor={colors.text.DEFAULT}
        autoCapitalize={props.autoCapitalize ?? 'none'}
        autoCorrect={props.autoCorrect ?? false}
        autoComplete={props.autoComplete ?? 'username'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          {
            width: '100%',
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            backgroundColor: colors.surface.elevated,
            paddingHorizontal: 12,
            color: colors.text.DEFAULT,
            fontSize: typography.body.fontSize,
            lineHeight: typography.body.lineHeight,
            ...(multiline
              ? { minHeight: 96, paddingTop: 12, paddingBottom: 12 }
              : { height: 48 }),
          },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
