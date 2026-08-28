import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AuraGradient, Text } from '@/components/ui';
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
  const press = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.get() * 0.06 }],
  }));

  return (
    <View className="flex-1 items-center justify-start">
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Create a post"
        onPress={onPress}
        onPressIn={() => press.set(withTiming(1, instant))}
        onPressOut={() => press.set(withTiming(0, instant))}
        className="-mt-6 h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-bg"
        style={[animatedStyle, auraGlow('strong')]}
      >
        <AuraGradient />
        <Ionicons name="add" size={30} color={colors.text.DEFAULT} />
      </AnimatedPressable>

      <Text variant="caption" tone="muted" className="-mt-1">
        Create
      </Text>
    </View>
  );
}
