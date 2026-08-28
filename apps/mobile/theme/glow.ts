import type { ViewStyle } from 'react-native';

import { colors } from './tokens';

/**
 * Depth on this dark UI comes from surface lightness, not drop shadows — so the
 * only shadow we use is an Aura-coloured glow, and only on things the user earned
 * or is about to act on (Create, Aura gained, rank up).
 */
export function auraGlow(strength: 'soft' | 'strong' = 'soft'): ViewStyle {
  const strong = strength === 'strong';

  return {
    shadowColor: colors.aura.DEFAULT,
    shadowOffset: { width: 0, height: strong ? 6 : 4 },
    shadowOpacity: strong ? 0.55 : 0.35,
    shadowRadius: strong ? 20 : 12,
    elevation: strong ? 12 : 6,
  };
}
