import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-end justify-between pb-4 pt-2">
      <View className="flex-1">
        <Text variant="title">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" className="pt-1">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
