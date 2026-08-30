import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/layout';
import { UserProfile } from '@/components/profile';
import { Text } from '@/components/ui';
import { colors } from '@/theme/tokens';

export default function UserProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const raw = useLocalSearchParams<{ username?: string | string[] }>().username;
  const username = stripHandle(Array.isArray(raw) ? raw[0] : raw);

  return (
    <Screen>
      <View className="flex-row items-center gap-3 pb-3 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.back')}
          hitSlop={12}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.DEFAULT} />
        </Pressable>
        <Text variant="title">{username ? `@${username}` : t('nav.profile')}</Text>
      </View>

      {username ? (
        <UserProfile
          username={username}
          emptyPosts={t('profile.posts.emptyOther', { username })}
        />
      ) : (
        <View className="flex-1 items-start justify-center gap-3 pb-24">
          <Text variant="title">{t('profile.error.title')}</Text>
          <Text variant="body" tone="secondary">
            {t('errors.not_found')}
          </Text>
        </View>
      )}
    </Screen>
  );
}

function stripHandle(value: string | undefined) {
  if (!value) return undefined;
  return value.startsWith('@') ? value.slice(1) : value;
}
