import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib/cn';

/** Size, line height and weight all come from the `fontSize` tokens in Tailwind. */
const variants = {
  display: 'text-display',
  title: 'text-title',
  heading: 'text-heading',
  body: 'text-body',
  label: 'text-label',
  caption: 'text-caption',
} as const;

const tones = {
  default: 'text-text',
  secondary: 'text-text-secondary',
  muted: 'text-text-muted',
  aura: 'text-aura-bright',
  like: 'text-like',
  success: 'text-success',
  danger: 'text-danger',
} as const;

export type TextVariant = keyof typeof variants;
export type TextTone = keyof typeof tones;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
};

export function Text({ variant = 'body', tone = 'default', className, ...props }: TextProps) {
  return <RNText className={cn(variants[variant], tones[tone], className)} {...props} />;
}
