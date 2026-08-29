import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { colors } from '@/theme/tokens';

export function SettingsButton() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('settings.open')}
      hitSlop={12}
      onPress={() => router.push('/settings')}
    >
      <Ionicons name="settings-outline" size={22} color={colors.text.secondary} />
    </Pressable>
  );
}
