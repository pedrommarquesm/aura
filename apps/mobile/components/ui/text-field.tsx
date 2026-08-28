import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './text';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/tokens';

export type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
};

export function TextField({ label, error, className, ...props }: TextFieldProps) {
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
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        className={cn(
          'h-12 rounded-md border bg-surface-elevated px-3 text-body text-text',
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
