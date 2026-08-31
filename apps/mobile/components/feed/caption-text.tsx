import { useTranslation } from 'react-i18next';

import { Text, type TextTone, type TextVariant } from '@/components/ui';
import { parseCaptionSegments } from '@/lib/hashtags';

export function CaptionText({
  caption,
  variant = 'label',
  tone = 'secondary',
  numberOfLines,
  onHashtagPress,
}: {
  caption: string;
  variant?: TextVariant;
  tone?: TextTone;
  numberOfLines?: number;
  /** Omit on compose. Viewing a post passes navigation. */
  onHashtagPress?: (tag: string) => void;
}) {
  const { t } = useTranslation();
  const segments = parseCaptionSegments(caption);

  return (
    <Text variant={variant} tone={tone} numberOfLines={numberOfLines}>
      {segments.map((segment, index) =>
        segment.tag ? (
          <Text
            key={`${segment.tag}-${index}`}
            variant={variant}
            tone="aura"
            accessibilityRole={onHashtagPress ? 'link' : 'text'}
            accessibilityLabel={
              onHashtagPress ? t('hashtag.a11y.open', { tag: segment.tag }) : undefined
            }
            onPress={onHashtagPress ? () => onHashtagPress(segment.tag!) : undefined}
            suppressHighlighting
          >
            {segment.text}
          </Text>
        ) : (
          <Text key={`t-${index}`} variant={variant} tone={tone}>
            {segment.text}
          </Text>
        ),
      )}
    </Text>
  );
}
