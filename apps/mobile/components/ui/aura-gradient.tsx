import { LinearGradient } from 'expo-linear-gradient';

import { gradients } from '@/theme/tokens';

/** The signature gradient as a fill. Diagonal, bright top-left to deep bottom-right. */
export function AuraGradient({ className }: { className?: string }) {
  return (
    <LinearGradient
      colors={[gradients.aura.from, gradients.aura.to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={className ?? 'absolute inset-0'}
    />
  );
}
