import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { ScrollView, View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { AuraValue, Card, Skeleton, Text } from '@/components/ui';
import { formatCount } from '@/lib/format';
import { mockChallenges, mockTrendingTiles } from '@/mocks/discover';
import { colors } from '@/theme/tokens';

export default function DiscoverScreen() {
  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View className="bg-bg px-gutter">
          <ScreenHeader title="Discover" subtitle="Find Aura before everyone else" />
        </View>

        <View className="px-gutter">
          <Text variant="heading" className="pb-3">
            Today&apos;s challenges
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3 px-gutter"
        >
          {mockChallenges.map((challenge) => (
            <Card key={challenge.id} surface="elevated" className="w-56">
              <View className="flex-row items-center gap-2">
                <Ionicons name="flame" size={16} color={colors.super} />
                <Text variant="caption" tone="muted">
                  {`${challenge.endsInHours}h left`}
                </Text>
              </View>
              <Text variant="heading" className="pt-2">
                {challenge.title}
              </Text>
              <Text variant="caption" tone="secondary" className="pt-1">
                {`${formatCount(challenge.entries)} entries`}
              </Text>
            </Card>
          ))}
        </ScrollView>

        <View className="px-gutter pt-8">
          <Text variant="heading" className="pb-3">
            Trending now
          </Text>

          <View className="flex-row flex-wrap gap-1">
            {mockTrendingTiles.map((tile) => (
              <View
                key={tile.id}
                className="aspect-[4/5] flex-1 basis-[31%] overflow-hidden rounded-md bg-surface"
              >
                <Image
                  source={{ uri: `https://picsum.photos/seed/${tile.seed}/480/600` }}
                  contentFit="cover"
                  transition={160}
                  style={{ width: '100%', height: '100%' }}
                />
                <View className="absolute bottom-1 left-1 rounded-full bg-bg/70 px-1.5 py-0.5">
                  <AuraValue value={tile.aura} size="sm" tone="aura" />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="px-gutter pt-8">
          <Text variant="heading" className="pb-1">
            Aura Battles
          </Text>
          <Text variant="caption" tone="muted" className="pb-3">
            Head-to-head voting. Arrives with V1 (roadmap API-32).
          </Text>

          <View className="flex-row gap-3">
            <Skeleton className="aspect-[4/5] flex-1" />
            <Skeleton className="aspect-[4/5] flex-1" />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
