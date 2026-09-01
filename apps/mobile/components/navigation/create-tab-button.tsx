import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AuraGradient, Text } from '@/components/ui';
import { useAuthGateStore } from '@/store/auth-gate';
import { useSessionStore } from '@/store/session';
import { instant } from '@/theme/motion';
import { colors } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type CreateTabButtonProps = {
  onPress?: PressableProps['onPress'];
};

/**
 * Create is the product's primary action, so it keeps the aura gradient. It
 * still sits in the same icon + label row as the other tabs.
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
        style={[styles.button, animatedStyle]}
      >
        <AuraGradient />
        <Ionicons name="add" size={22} color={colors.text.DEFAULT} />
      </AnimatedPressable>

      <Text
        variant="caption"
        tone="muted"
        style={styles.label}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
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

const ICON = 28;

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  button: {
    height: ICON,
    width: ICON,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: ICON / 2,
  },
  label: {
    marginTop: 2,
  },
});
