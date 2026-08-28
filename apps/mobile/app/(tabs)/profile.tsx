import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout';
import { LanguageSwitcher } from '@/components/settings';
import { AuraValue, Avatar, Button, Card, Skeleton, Text } from '@/components/ui';
import { useFormat } from '@/lib/i18n';
import { mockViewer } from '@/mocks/feed';
import { colors } from '@/theme/tokens';

/** Stand-in profile counters until the API exists (roadmap `MOB-43`). */
const STATS = { posts: 18, followers: 204, streak: 6 };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text variant="heading" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const format = useFormat();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <View className="items-center pt-4">
          <Avatar uri={mockViewer.avatarUrl} username={mockViewer.username} size="xl" ring />

          <Text variant="heading" className="pt-3">
            @{mockViewer.username}
          </Text>
          <Text variant="caption" tone="aura">
            {mockViewer.title}
          </Text>

          <AuraValue value={mockViewer.aura} size="xl" className="pt-4" />
          <Text variant="label" tone="muted" className="pt-1">
            {t('profile.globalRank', { rank: mockViewer.rank })}
          </Text>
        </View>

        <Card surface="elevated" className="mt-6 flex-row">
          <Stat label={t('profile.stats.posts')} value={format.number(STATS.posts)} />
          <View className="w-px bg-border" />
          <Stat label={t('profile.stats.followers')} value={format.number(STATS.followers)} />
          <View className="w-px bg-border" />
          <Stat label={t('profile.stats.streak')} value={format.number(STATS.streak)} />
        </Card>

        <View className="flex-row gap-3 pt-4">
          <Button label={t('profile.actions.edit')} variant="secondary" className="flex-1" />
          <Button
            label={t('common.actions.share')}
            variant="secondary"
            icon={<Ionicons name="arrow-redo-outline" size={16} color={colors.text.DEFAULT} />}
            className="flex-1"
          />
        </View>

        <Text variant="heading" className="pb-3 pt-8">
          {t('profile.posts.title')}
        </Text>

        <View className="flex-row flex-wrap gap-1">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="aspect-square flex-1 basis-[31%]" />
          ))}
        </View>

        <LanguageSwitcher className="mt-8" />

        <Text variant="caption" tone="muted" className="pt-4">
          {t('profile.comingSoon')}
        </Text>
      </ScrollView>
    </Screen>
  );
}
