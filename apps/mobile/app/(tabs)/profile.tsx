import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/layout';
import { UserProfile } from '@/components/profile';
import { SettingsButton } from '@/components/settings';
import { AuraGradient, Button, Text } from '@/components/ui';
import { useAuthGateStore } from '@/store/auth-gate';
import { useSessionStore } from '@/store/session';
import { colors } from '@/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const signOut = useSessionStore((state) => state.signOut);
  const requestAuth = useAuthGateStore((state) => state.requestAuth);

  if (status !== 'authenticated' || !user) {
    return (
      <Screen>
        <View className="flex-row justify-end pt-2">
          <SettingsButton />
        </View>
        <View className="flex-1 items-center justify-center">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-xl">
            <AuraGradient />
            <Ionicons name="person" size={36} color={colors.text.DEFAULT} />
          </View>
          <Text variant="title" className="pt-6 text-center">
            {t('auth.reasons.profile.title')}
          </Text>
          <Text variant="body" tone="secondary" className="pt-2 text-center">
            {t('auth.reasons.profile.body')}
          </Text>
          <Button
            label={t('auth.signIn')}
            className="mt-8"
            glow
            fullWidth
            onPress={() => requestAuth({ reason: 'profile' })}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-row justify-end pt-2">
        <SettingsButton />
      </View>
      <UserProfile
        username={user.username}
        userId={user.id}
        emptyPosts={t('profile.posts.empty')}
        fallback={user}
        showComingSoon
        footer={
          <Button label={t('auth.signOut')} variant="ghost" className="mt-6" onPress={() => void signOut()} />
        }
      />
    </Screen>
  );
}
