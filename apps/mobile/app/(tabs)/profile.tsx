import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout';
import { LanguageSwitcher } from '@/components/settings';
import { AuraGradient, AuraValue, Avatar, Button, Card, Skeleton, Text } from '@/components/ui';
import { useFormat } from '@/lib/i18n';
import { useAuthGateStore } from '@/store/auth-gate';
import { useSessionStore } from '@/store/session';
import { colors } from '@/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const format = useFormat();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const signOut = useSessionStore((state) => state.signOut);
  const requestAuth = useAuthGateStore((state) => state.requestAuth);

  if (status !== 'authenticated' || !user) {
    return (
      <Screen className="justify-center">
        <View className="items-center">
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
        <LanguageSwitcher className="mt-10" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <View className="items-center pt-4">
          <Avatar uri={user.avatarUrl} username={user.username} size="xl" ring />

          <Text variant="heading" className="pt-3">
            @{user.username}
          </Text>
          {user.title ? (
            <Text variant="caption" tone="aura">
              {user.title}
            </Text>
          ) : null}

          <AuraValue value={user.aura} size="xl" className="pt-4" />
        </View>

        <Card surface="elevated" className="mt-6 flex-row">
          <View className="flex-1 items-center">
            <Text variant="heading" style={{ fontVariant: ['tabular-nums'] }}>
              {format.number(user.aura)}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {t('common.aura')}
            </Text>
          </View>
        </Card>

        <Text variant="heading" className="pb-3 pt-8">
          {t('profile.posts.title')}
        </Text>

        <View className="flex-row flex-wrap gap-1">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="aspect-square flex-1 basis-[31%]" />
          ))}
        </View>

        <LanguageSwitcher className="mt-8" />

        <Button
          label={t('auth.signOut')}
          variant="ghost"
          className="mt-6"
          onPress={() => void signOut()}
        />
      </ScrollView>
    </Screen>
  );
}
