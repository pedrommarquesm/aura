import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AuraGradient } from './aura-gradient';
import { Text } from './text';
import { cn } from '@/lib/cn';

const sizes = {
  sm: { box: 'h-8 w-8', ring: 'h-[38px] w-[38px]', initial: 'caption' },
  md: { box: 'h-10 w-10', ring: 'h-[46px] w-[46px]', initial: 'label' },
  lg: { box: 'h-16 w-16', ring: 'h-[70px] w-[70px]', initial: 'heading' },
  xl: { box: 'h-24 w-24', ring: 'h-[102px] w-[102px]', initial: 'title' },
} as const;

export type AvatarSize = keyof typeof sizes;

export type AvatarProps = {
  uri?: string | null;
  username: string;
  size?: AvatarSize;
  /** Gradient ring. Earned status only — top ranks, live challenge entrants. */
  ring?: boolean;
  className?: string;
};

export function Avatar({ uri, username, size = 'md', ring = false, className }: AvatarProps) {
  const { t } = useTranslation();
  const sizing = sizes[size];

  const face = (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-full bg-surface-elevated',
        sizing.box,
        !ring && className,
      )}
    >
      {uri ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          transition={120}
          style={{ width: '100%', height: '100%' }}
          accessibilityLabel={t('common.a11y.avatar', { username })}
        />
      ) : (
        <Text variant={sizing.initial} tone="secondary">
          {username.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );

  if (!ring) return face;

  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-full',
        sizing.ring,
        className,
      )}
    >
      <AuraGradient />
      {face}
    </View>
  );
}
