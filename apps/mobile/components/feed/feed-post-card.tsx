import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { LikeButton, type LikeButtonHandle } from './like-button';
import { PostOptions } from './post-options';
import { PostVideo, VideoMuteBadge, videoPlaybackUrl } from './post-video';
import { AuraValue, Avatar, Text } from '@/components/ui';
import type { FeedCard } from '@/lib/api';
import { likePost, unlikePost } from '@/lib/api/likes';
import { useFormat } from '@/lib/i18n';
import { userProfileHref } from '@/lib/navigation/user-profile';
import { applyLikeResult } from '@/lib/query/feed-cache';
import { useAuthGateStore } from '@/store/auth-gate';
import { useIsAuthenticated, useSessionStore } from '@/store/session';
import { burstTiming, instant } from '@/theme/motion';
import { colors } from '@/theme/tokens';

/** Portrait 4:5 through landscape 1.91:1, matching what the media pipeline produces. */
const MIN_ASPECT = 0.8;
const MAX_ASPECT = 1.91;

function clampAspect(width: number | null, height: number | null): number {
  if (!width || !height) return MIN_ASPECT;
  return Math.min(Math.max(width / height, MIN_ASPECT), MAX_ASPECT);
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

const HEART = 64;
const WAVE_MS = 560;

function DoubleTapHeart({
  burst,
  origin,
}: {
  burst: number;
  origin: { x: number; y: number };
}) {
  const scale = useSharedValue(0.35);
  const opacity = useSharedValue(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    if (burst === 0) return;
    scale.set(0.35);
    opacity.set(0);
    x.set(0);
    y.set(0);
    scale.set(
      withSequence(withTiming(1.12, instant), withTiming(0.85, { duration: WAVE_MS - 100 })),
    );
    opacity.set(
      withSequence(withTiming(1, instant), withTiming(0, burstTiming)),
    );
    x.set(
      withSequence(
        withTiming(10, { duration: 140 }),
        withTiming(-12, { duration: 160 }),
        withTiming(9, { duration: 140 }),
        withTiming(-6, { duration: 120 }),
      ),
    );
    y.set(withTiming(-56, { duration: WAVE_MS }));
  }, [burst, opacity, scale, x, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: scale.get() },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: 'absolute',
          left: origin.x - HEART / 2,
          top: origin.y - HEART / 2,
          width: HEART,
          height: HEART,
        },
      ]}
    >
      <Ionicons name="heart" size={HEART} color={colors.like} />
    </Animated.View>
  );
}

/**
 * Memoised because a like must repaint one card, never the list (§6.3). Everything the
 * card needs arrives as a single prop so the comparison stays a reference check.
 */
export const FeedPostCard = memo(function FeedPostCard({
  post,
  isActiveVideo = false,
  onDeleted,
  commentNavigates = true,
}: {
  post: FeedCard;
  /** Home feed only: the viewport video plays; others show the poster. */
  isActiveVideo?: boolean;
  onDeleted?: () => void;
  /** False on the post screen — the thread is already underneath. */
  commentNavigates?: boolean;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const router = useRouter();
  const { author, media } = post;
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const viewerUsername = useSessionStore((state) => state.user?.username);
  const requestAuth = useAuthGateStore((state) => state.requestAuth);

  const openAuthor = useCallback(() => {
    router.push(userProfileHref(author.username, viewerUsername));
  }, [author.username, router, viewerUsername]);
  const likeRef = useRef<LikeButtonHandle>(null);
  const [burst, setBurst] = useState(0);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const [muted, setMuted] = useState(true);

  const requireAuth = !isAuthenticated;
  const playbackUrl = videoPlaybackUrl(media);
  const isVideo = media.type === 'video';
  const posterUri = media.posterUrl ?? media.thumbUrl ?? media.feedUrl;
  const playing = isVideo && isActiveVideo && Boolean(playbackUrl);

  const onDoubleTap = useCallback((x: number, y: number) => {
    setOrigin({ x, y });
    setBurst((count) => count + 1);
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((current) => !current);
  }, []);

  useEffect(() => {
    if (burst === 0) return;
    likeRef.current?.like();
  }, [burst]);

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(280)
        .maxDelay(220)
        .onEnd((event) => {
          runOnJS(onDoubleTap)(event.x, event.y);
        }),
    [onDoubleTap],
  );

  const singleTap = useMemo(
    () =>
      Gesture.Tap()
        // Do not cap maxDuration here. Exclusive waits for the double-tap
        // window to fail (~220ms). A 220ms cap on the single tap dies first,
        // so unmute never ran.
        .maxDelay(220)
        .onEnd((_event, success) => {
          if (success) {
            runOnJS(toggleMuted)();
          }
        }),
    [toggleMuted],
  );

  const mediaGesture = useMemo(
    () => (isVideo ? Gesture.Exclusive(doubleTap, singleTap) : doubleTap),
    [doubleTap, isVideo, singleTap],
  );

  return (
    <View className="pb-6">
      <View className="flex-row items-center gap-3 px-gutter py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('feed.post.a11y.profile', { username: author.username })}
          onPress={openAuthor}
          className="min-w-0 flex-1 flex-row items-center gap-3"
        >
          <Avatar uri={author.avatarUrl} username={author.username} accessible={false} />

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
        </Pressable>

        <PostOptions post={post} onDeleted={onDeleted} />
      </View>

      <GestureDetector gesture={mediaGesture}>
        <View
          className="relative overflow-hidden bg-surface"
          style={{ aspectRatio: clampAspect(media.width, media.height) }}
          collapsable={false}
          accessible
          accessibilityRole="image"
          accessibilityLabel={post.caption ?? `@${author.username}`}
          accessibilityHint={
            isVideo ? t('feed.post.a11y.doubleTapSound') : t('feed.post.a11y.doubleTap')
          }
        >
          <Image
            source={posterUri ? { uri: posterUri } : undefined}
            placeholder={media.thumbUrl ? { uri: media.thumbUrl } : undefined}
            contentFit="cover"
            transition={160}
            recyclingKey={post.id}
            style={{ width: '100%', height: '100%' }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />

          {playing && playbackUrl ? (
            <PostVideo source={playbackUrl} playing muted={muted} />
          ) : null}

          {/* Native VideoView surfaces ignore pointerEvents and swallow
              taps. This sibling sits on top so Exclusive(double, single)
              actually receives the press. */}
          <View style={StyleSheet.absoluteFill} collapsable={false} />

          {playing ? (
            <VideoMuteBadge
              muted={muted}
              label={muted ? t('feed.post.a11y.unmute') : t('feed.post.a11y.mute')}
            />
          ) : null}

          {isVideo && media.durationMs && !playing ? (
            <View className="absolute bottom-3 right-3 flex-row items-center gap-1 rounded-full bg-bg/70 px-2 py-1">
              <Ionicons name="play" size={10} color={colors.text.DEFAULT} />
              <Text variant="caption">{formatDuration(media.durationMs)}</Text>
            </View>
          ) : null}

          <DoubleTapHeart burst={burst} origin={origin} />
        </View>
      </GestureDetector>

      <View className="flex-row items-center gap-5 px-gutter pt-3">
        <LikeButton
          ref={likeRef}
          key={`${post.id}:${post.likedByMe}`}
          likeCount={post.likeCount}
          initiallyLiked={post.likedByMe}
          requireAuth={requireAuth}
          onRequireAuth={() =>
            requestAuth({
              reason: 'like',
              pending: { type: post.likedByMe ? 'unlike' : 'like', postId: post.id },
            })
          }
          onChange={async (liked) => {
            const result = liked ? await likePost(post.id) : await unlikePost(post.id);
            applyLikeResult(queryClient, post.id, result);
          }}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('feed.post.comments', { count: post.commentCount ?? 0 })}
          accessibilityHint={t('feed.post.a11y.comment')}
          hitSlop={12}
          onPress={() => {
            if (!commentNavigates) return;
            router.push(`/post/${post.id}`);
          }}
          className="flex-row items-center gap-2"
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.text.secondary} />
          <Text variant="label" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>
            {format.count(post.commentCount ?? 0)}
          </Text>
        </Pressable>

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
          <Text
            variant="label"
            onPress={openAuthor}
            accessibilityRole="link"
            accessibilityLabel={t('feed.post.a11y.profile', { username: author.username })}
          >
            @{author.username}{' '}
          </Text>
          <Text variant="body" tone="secondary">
            {post.caption}
          </Text>
        </Text>
      ) : null}
    </View>
  );
});
