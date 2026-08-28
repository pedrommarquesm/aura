import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AuraGradient } from './aura-gradient';
import { Text, type TextVariant } from './text';
import { cn } from '@/lib/cn';
import { auraGlow } from '@/theme/glow';
import { instant } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const variants = {
  primary: { container: 'bg-aura', label: 'text-text' },
  secondary: { container: 'bg-surface-elevated border border-border', label: 'text-text' },
  ghost: { container: 'bg-transparent', label: 'text-text-secondary' },
  danger: { container: 'bg-danger', label: 'text-text' },
} as const;

const sizes = {
  sm: { container: 'h-9 px-3 rounded-sm gap-1.5', text: 'caption' satisfies TextVariant },
  md: { container: 'h-12 px-4 rounded-md gap-2', text: 'label' satisfies TextVariant },
  lg: { container: 'h-14 px-5 rounded-lg gap-2', text: 'label' satisfies TextVariant },
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  /** Aura glow. Reserved for the one action on screen the user is meant to take. */
  glow?: boolean;
  fullWidth?: boolean;
  className?: string;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  glow = false,
  fullWidth = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled ?? false;
  const press = useSharedValue(0);

  // Touch feedback has to be immediate to feel right (§2.2), so it is driven on the UI
  // thread rather than through a React state round-trip.
  const animatedStyle = useAnimatedStyle(() => {
    const progress = press.get();

    return {
      transform: [{ scale: 1 - progress * 0.03 }],
      opacity: 1 - progress * 0.15,
    };
  });

  const { container, label: labelClass } = variants[variant];
  const sizing = sizes[size];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPressIn={() => press.set(withTiming(1, instant))}
      onPressOut={() => press.set(withTiming(0, instant))}
      className={cn(
        'flex-row items-center justify-center overflow-hidden',
        container,
        sizing.container,
        fullWidth && 'w-full',
        isDisabled && 'opacity-40',
        className,
      )}
      style={[animatedStyle, glow ? auraGlow() : null]}
      {...props}
    >
      {variant === 'primary' ? <AuraGradient /> : null}
      {icon}
      {/*
        The button height is fixed, so a label that wraps gets clipped rather than
        pushing the button taller. Portuguese labels run 15-25% longer than the English
        ones they were sized against ("Editar perfil" against "Edit profile"), so the
        label shrinks a little before it truncates.
      */}
      <Text
        variant={sizing.text}
        className={cn('shrink', labelClass)}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
