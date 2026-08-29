import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout';
import { LanguageSwitcher } from '@/components/settings';
import { Text } from '@/components/ui';
import { colors } from '@/theme/tokens';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-row items-center gap-3 pb-8 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.back')}
          hitSlop={12}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.DEFAULT} />
        </Pressable>
        <Text variant="title">{t('settings.title')}</Text>
      </View>

      <LanguageSwitcher />
    </Screen>
  );
}
