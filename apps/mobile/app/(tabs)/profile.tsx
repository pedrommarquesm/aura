import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout';
import { AuraValue, Avatar, Button, Card, Skeleton, Text } from '@/components/ui';
import { formatRank } from '@/lib/format';
import { mockViewer } from '@/mocks/feed';
import { colors } from '@/theme/tokens';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text variant="heading" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
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
            {`${formatRank(mockViewer.rank)} global`}
          </Text>
        </View>

        <Card surface="elevated" className="mt-6 flex-row">
          <Stat label="Posts" value="18" />
          <View className="w-px bg-border" />
          <Stat label="Followers" value="204" />
          <View className="w-px bg-border" />
          <Stat label="Streak" value="6" />
        </Card>

        <View className="flex-row gap-3 pt-4">
          <Button label="Edit profile" variant="secondary" className="flex-1" />
          <Button
            label="Share"
            variant="secondary"
            icon={<Ionicons name="arrow-redo-outline" size={16} color={colors.text.DEFAULT} />}
            className="flex-1"
          />
        </View>

        <Text variant="heading" className="pb-3 pt-8">
          Posts
        </Text>

        <View className="flex-row flex-wrap gap-1">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="aspect-square flex-1 basis-[31%]" />
          ))}
        </View>

        <Text variant="caption" tone="muted" className="pt-4">
          Aura Sense and Vote Power join this card in V1 (roadmap AURA-11, AURA-10).
        </Text>
      </ScrollView>
    </Screen>
  );
}
