import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { LikeButton } from './like-button';
import { AuraValue, Avatar, Text } from '@/components/ui';
import type { FeedCard } from '@/lib/api';
import { colors } from '@/theme/tokens';

/** Portrait 4:5 through landscape 1.91:1, matching what the media pipeline produces. */
const MIN_ASPECT = 0.8;
const MAX_ASPECT = 1.91;

function clampAspect(width: number, height: number): number {
  return Math.min(Math.max(width / height, MIN_ASPECT), MAX_ASPECT);
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

/**
 * Memoised because a like must repaint one card, never the list (§6.3). Everything the
 * card needs arrives as a single prop so the comparison stays a reference check.
 */
export const FeedPostCard = memo(function FeedPostCard({ post }: { post: FeedCard }) {
  const { t } = useTranslation();
  const { author, media } = post;

  return (
    <View className="pb-6">
      <View className="flex-row items-center gap-3 px-gutter py-3">
        <Avatar uri={author.avatarUrl} username={author.username} />

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text variant="label">@{author.username}</Text>
            {author.title ? (
              <Text variant="caption" tone="aura">
                {author.title}
              </Text>
            ) : null}
          </View>
          <AuraValue value={author.aura} size="sm" tone="secondary" />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('feed.post.a11y.options')}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.text.muted} />
        </Pressable>
      </View>

      <View
        className="relative bg-surface"
        style={{ aspectRatio: clampAspect(media.width, media.height) }}
      >
        <Image
          source={{ uri: media.feedUrl }}
          placeholder={{ uri: media.thumbUrl }}
          contentFit="cover"
          transition={160}
          recyclingKey={post.id}
          style={{ width: '100%', height: '100%' }}
          accessibilityLabel={post.caption}
        />

        {media.type === 'video' && media.durationMs ? (
          <View className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded-full bg-bg/70 px-2 py-1">
            <Ionicons name="play" size={10} color={colors.text.DEFAULT} />
            <Text variant="caption">{formatDuration(media.durationMs)}</Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center gap-5 px-gutter pt-3">
        <LikeButton likeCount={post.likeCount} initiallyLiked={post.likedByMe} />

        {/* Comments are V1 (roadmap `API-31`), so the V0 card carries like + share only. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.actions.share')}
          hitSlop={12}
        >
          <Ionicons name="arrow-redo-outline" size={22} color={colors.text.secondary} />
        </Pressable>

        <View className="flex-1 items-end">
          <AuraValue value={post.aura} size="sm" tone="aura" />
        </View>
      </View>

      {post.caption ? (
        <Text variant="body" className="px-gutter pt-2">
          <Text variant="label">@{author.username} </Text>
          <Text variant="body" tone="secondary">
            {post.caption}
          </Text>
        </Text>
      ) : null}
    </View>
  );
});
