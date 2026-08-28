import { View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/cn';

export type ScreenProps = ViewProps & {
  /** Apply the 16pt screen gutter. Off for full-bleed surfaces like the feed. */
  padded?: boolean;
};

/**
 * Every screen's root. Owns the background and the top inset; the bottom inset belongs
 * to the tab bar, which draws over it.
 */
export function Screen({ padded = true, className, style, ...props }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn('flex-1 bg-bg', padded && 'px-gutter', className)}
      style={[{ paddingTop: insets.top }, style]}
      {...props}
    />
  );
}
