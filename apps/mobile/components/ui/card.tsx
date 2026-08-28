import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

const surfaces = {
  /** Sits on the background. The default for feed cards and list rows. */
  base: 'bg-surface border border-border',
  /** One step closer to the user — sheets, selected rows, empty states. */
  elevated: 'bg-surface-elevated border border-border',
  /** No fill, just the outline. For anything that must not compete with media. */
  outline: 'border border-border',
} as const;

export type CardSurface = keyof typeof surfaces;

export type CardProps = ViewProps & {
  surface?: CardSurface;
  padded?: boolean;
};

export function Card({ surface = 'base', padded = true, className, ...props }: CardProps) {
  return (
    <View
      className={cn('overflow-hidden rounded-lg', surfaces[surface], padded && 'p-4', className)}
      {...props}
    />
  );
}
