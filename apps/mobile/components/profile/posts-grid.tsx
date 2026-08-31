import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { Skeleton } from '@/components/ui';
import type { FeedCard } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';
import { colors, withAlpha } from '@/theme/tokens';

const GRID_GAP = 4;
const GRID_COLUMNS = 3;

export function PostsGrid({ items }: { items: FeedCard[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - 32 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

  return (
    <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
      {items.map((post) => {
        const uri = post.media.thumbUrl ?? post.media.feedUrl;
        return (
          <Pressable
            key={post.id}
            accessibilityRole="button"
            accessibilityLabel={post.caption ?? `@${post.author.username}`}
            accessibilityHint={t('profile.posts.open')}
            onPress={() => {
              queryClient.setQueryData(queryKeys.post(post.id), { ...post, status: 'published' });
              router.push(`/post/${post.id}`);
            }}
            style={{ width: tile, height: tile }}
            className="relative overflow-hidden rounded-sm bg-surface"
          >
            {uri ? (
              <Image
                source={{ uri }}
                contentFit="cover"
                recyclingKey={post.id}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <View className="flex-1 bg-surface-elevated" />
            )}
            {post.media.type === 'video' ? (
              <View
                className="absolute bottom-1.5 right-1.5 rounded-full p-1"
                style={{ backgroundColor: withAlpha(colors.bg, 0.7) }}
              >
                <Ionicons name="play" size={10} color={colors.text.DEFAULT} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function PostsSkeleton() {
  return (
    <View className="flex-row flex-wrap gap-1">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="aspect-square flex-1 basis-[31%]" />
      ))}
    </View>
  );
}
