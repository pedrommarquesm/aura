import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './text';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

export type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
};

export function TextField({
  label,
  error,
  className,
  style,
  multiline,
  ...props
}: TextFieldProps) {
  return (
    <View className="w-full gap-1.5">
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
      <TextInput
        accessibilityLabel={label ?? props.placeholder}
        placeholderTextColor={colors.text.muted}
        selectionColor={colors.aura.DEFAULT}
        cursorColor={colors.text.DEFAULT}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          {
            color: colors.text.DEFAULT,
            ...(multiline
              ? { minHeight: 96, paddingTop: 12, paddingBottom: 12 }
              : { height: 48 }),
          },
          style,
        ]}
        className={cn(
          'w-full rounded-md border bg-surface-elevated px-3 text-base',
          !multiline && 'h-12',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...props}
      />
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
