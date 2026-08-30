import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AuraGradient, Text } from '@/components/ui';
import { useAuthGateStore } from '@/store/auth-gate';
import { useSessionStore } from '@/store/session';
import { auraGlow } from '@/theme/glow';
import { instant } from '@/theme/motion';
import { colors } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type CreateTabButtonProps = {
  onPress?: PressableProps['onPress'];
};

/**
 * Create is the product's primary action, so it does not look like a tab: it is an
 * elevated gradient pill that breaks the tab bar's top edge. The glow is one of the few
 * places we spend it — this is the thing we want the thumb to find without looking.
 */
export function CreateTabButton({ onPress }: CreateTabButtonProps) {
  const { t } = useTranslation();
  const press = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.get() * 0.06 }],
  }));

  return (
    <View style={styles.slot}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={t('nav.a11y.create')}
        onPress={onPress}
        onPressIn={() => press.set(withTiming(1, instant))}
        onPressOut={() => press.set(withTiming(0, instant))}
        style={[styles.button, animatedStyle, auraGlow('strong')]}
      >
        <AuraGradient />
        <Ionicons name="add" size={30} color={colors.text.DEFAULT} />
      </AnimatedPressable>

      <Text variant="caption" tone="muted" style={styles.label} numberOfLines={1}>
        {t('nav.create')}
      </Text>
    </View>
  );
}

/** Guests never reach compose. The tab itself opens “Sign in to post”. */
export function GuardedCreateTab({ onPress }: { onPress?: PressableProps['onPress'] }) {
  const status = useSessionStore((state) => state.status);
  const requestAuth = useAuthGateStore((state) => state.requestAuth);

  return (
    <CreateTabButton
      onPress={(event) => {
        if (status === 'restoring') return;
        if (status !== 'authenticated') {
          requestAuth({ reason: 'create', pending: { type: 'create' } });
          return;
        }
        onPress?.(event);
      }}
    />
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  button: {
    marginTop: -24,
    height: 56,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  label: {
    marginTop: -4,
  },
});
