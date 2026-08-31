import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { SUPPORTED_LOCALES, type AppLocale } from '@/lib/i18n';
import { usePreferencesStore } from '@/store/preferences';
import { colors } from '@/theme/tokens';

/** `null` is "follow the device", which is where every install starts. */
type Choice = AppLocale | null;

const OPTIONS: {
  value: Choice;
  labelKey: 'settings.language.options.system' | `settings.language.options.${AppLocale}`;
}[] = [
  { value: null, labelKey: 'settings.language.options.system' },
  ...SUPPORTED_LOCALES.map((locale) => ({
    value: locale,
    labelKey: `settings.language.options.${locale}` as const,
  })),
];

export type LanguageSwitcherProps = {
  className?: string;
};

/**
 * The in-app language override (docs/i18n.md). It wins over the device locale, which is
 * what the "Device" option hands control back to.
 *
 * The choice is not persisted yet — that needs the storage decision in `FND-06`, so a
 * relaunch currently returns to the device language.
 */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const override = usePreferencesStore((state) => state.languageOverride);
  const setOverride = usePreferencesStore((state) => state.setLanguageOverride);

  return (
    <View className={className}>
      <Text variant="heading" className="pb-1">
        {t('settings.language.title')}
      </Text>
      <Text variant="caption" tone="muted" className="pb-3">
        {t('settings.language.subtitle')}
      </Text>

      <Card surface="elevated" padded={false} className="flex-row flex-wrap gap-1 p-1">
        {OPTIONS.map((option) => {
          const selected = option.value === override;

          return (
            <Pressable
              key={option.value ?? 'system'}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setOverride(option.value)}
              className="min-w-[30%] flex-1 items-center rounded-md px-2 py-2"
              style={selected ? { backgroundColor: colors.aura.deep } : undefined}
            >
              <Text
                variant="label"
                tone={selected ? 'default' : 'muted'}
                numberOfLines={1}
                // "Dispositivo" is nearly twice the length of "Device" and three equal
                // columns leave it ~100pt, so it shrinks instead of wrapping.
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}
