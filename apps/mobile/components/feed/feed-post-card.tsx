import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LikeButton, type LikeButtonHandle } from './like-button';
import { PostOptions } from './post-options';
import { PostVideo, VideoMuteBadge, videoPlaybackUrl } from './post-video';
import { Avatar, Text } from '@/components/ui';
import type { FeedCard } from '@/lib/api';
import { likePost, unlikePost } from '@/lib/api/likes';
import { useFormat } from '@/lib/i18n';
import { userProfileHref } from '@/lib/navigation/user-profile';
import { applyLikeResult } from '@/lib/query/feed-cache';
import { useAuthGateStore } from '@/store/auth-gate';
import { useIsAuthenticated, useSessionStore } from '@/store/session';
import { burstTiming, instant } from '@/theme/motion';
import { colors } from '@/theme/tokens';

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
 * TikTok-style full-screen post card. Memoised because a like must repaint one card,
 * never the list (§6.3). Everything the card needs arrives as a single prop so the
 * comparison stays a reference check.
 */
export const FeedPostCard = memo(function FeedPostCard({
  post,
  isActiveVideo = false,
  onDeleted,
}: {
  post: FeedCard;
  /** Home feed only: the viewport video plays; others show the poster. */
  isActiveVideo?: boolean;
  onDeleted?: () => void;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { author, media } = post;
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const viewerUsername = useSessionStore((state) => state.user?.username);
  const requestAuth = useAuthGateStore((state) => state.requestAuth);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
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

  // Full screen height minus tab bar (approximately 80px)
  const screenHeight = height - insets.top - 80;

  // Caption truncation - show 2 lines
  const captionLines = 2;
  const shouldTruncateCaption = post.caption && post.caption.length > 80;

  const openDrawer = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

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

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  return (
    <View style={{ height: screenHeight }}>
      <GestureDetector gesture={mediaGesture}>
        <View
          className="relative flex-1 bg-bg"
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

          <View style={StyleSheet.absoluteFill} collapsable={false} />

          {playing ? (
            <VideoMuteBadge
              muted={muted}
              label={muted ? t('feed.post.a11y.unmute') : t('feed.post.a11y.mute')}
            />
          ) : null}

          {isVideo && media.durationMs && !playing ? (
            <View className="absolute bottom-3 left-3 flex-row items-center gap-1 rounded-full bg-bg/70 px-2 py-1">
              <Ionicons name="play" size={10} color={colors.text.DEFAULT} />
              <Text variant="caption">{formatDuration(media.durationMs)}</Text>
            </View>
          ) : null}

          <DoubleTapHeart burst={burst} origin={origin} />

          {/* Top Right: Aura Count */}
          <View className="absolute top-4 right-4">
            <View className="rounded-full bg-bg/70 px-3 py-1.5 backdrop-blur">
              <Text variant="label" tone="aura" className="font-extrabold tracking-aura">
                {format.count(post.aura)} 🗿
              </Text>
            </View>
          </View>

          {/* Bottom: Full-Width Overlay with Author + Caption */}
          <View className="absolute bottom-0 left-0 right-0">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('feed.post.a11y.profile', { username: author.username })}
              onPress={shouldTruncateCaption ? openDrawer : openAuthor}
              className="rounded-t-2xl bg-bg/70 px-4 py-3 backdrop-blur"
              style={{ paddingRight: 72 }} // Space for action buttons
            >
              <View className="flex-row items-center gap-2 pb-2">
                <Avatar
                  uri={author.avatarUrl}
                  username={author.username}
                  accessible={false}
                  size="sm"
                />
                <View className="flex-1">
                  <Text variant="label" className="font-semibold">
                    @{author.username}
                  </Text>
                  {author.title ? (
                    <Text variant="caption" tone="aura">
                      {author.title}
                    </Text>
                  ) : null}
                </View>
              </View>
              {post.caption ? (
                <View>
                  <Text 
                    variant="body" 
                    tone="secondary" 
                    numberOfLines={captionLines}
                  >
                    {post.caption}
                  </Text>
                  {shouldTruncateCaption ? (
                    <Text variant="caption" tone="aura" className="pt-1">
                      See more
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          </View>

          {/* Bottom Right: Action Buttons (Vertical Stack) - Positioned above bottom overlay */}
          <View className="absolute right-4 gap-3" style={{ bottom: 110 }}>
            {/* Aura Button */}
            <View className="items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('feed.post.likes', { count: post.likeCount })}
                accessibilityHint={post.likedByMe ? t('feed.post.a11y.unlike') : t('feed.post.a11y.like')}
                onPress={() => {
                  if (requireAuth) {
                    requestAuth({
                      reason: 'like',
                      pending: { type: post.likedByMe ? 'unlike' : 'like', postId: post.id },
                    });
                    return;
                  }
                  likeRef.current?.like();
                }}
                className="h-12 w-12 items-center justify-center rounded-full bg-bg/70 backdrop-blur"
              >
                <Text style={{ fontSize: 26, opacity: post.likedByMe ? 1 : 0.7 }}>🗿</Text>
              </Pressable>
              {/* Hidden LikeButton for state management and animation */}
              <View style={{ height: 0, overflow: 'hidden' }}>
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
              </View>
              <Text
                variant="caption"
                tone={post.likedByMe ? 'aura' : 'secondary'}
                className="pt-1 font-semibold"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {format.count(post.likeCount)}
              </Text>
            </View>

            {/* Comment Button */}
            <View className="items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('feed.post.comments', { count: post.commentCount ?? 0 })}
                accessibilityHint={t('feed.post.a11y.comment')}
                onPress={openDrawer}
                className="h-12 w-12 items-center justify-center rounded-full bg-bg/70 backdrop-blur"
              >
                <Ionicons name="chatbubble-outline" size={24} color={colors.text.DEFAULT} />
              </Pressable>
              <Text
                variant="caption"
                tone="secondary"
                className="pt-1 font-semibold"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {format.count(post.commentCount ?? 0)}
              </Text>
            </View>

            {/* Share Button */}
            <View className="items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.actions.share')}
                className="h-12 w-12 items-center justify-center rounded-full bg-bg/70 backdrop-blur"
              >
                <Ionicons name="arrow-redo-outline" size={24} color={colors.text.DEFAULT} />
              </Pressable>
            </View>

            {/* Post Options */}
            <View className="items-center pt-1">
              <PostOptions post={post} onDeleted={onDeleted} />
            </View>
          </View>
        </View>
      </GestureDetector>

      {/* Bottom Sheet for Caption + Comments */}
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={['50%', '90%']}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface.DEFAULT }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView className="flex-1 px-4">
          {/* Author */}
          <Pressable
            onPress={openAuthor}
            className="flex-row items-center gap-3 py-3 border-b border-border"
          >
            <Avatar uri={author.avatarUrl} username={author.username} size="sm" />
            <View>
              <Text variant="label">@{author.username}</Text>
              {author.title ? (
                <Text variant="caption" tone="aura">
                  {author.title}
                </Text>
              ) : null}
            </View>
          </Pressable>

          {/* Full Caption */}
          {post.caption ? (
            <View className="py-4 border-b border-border">
              <Text variant="body" tone="secondary">
                {post.caption}
              </Text>
            </View>
          ) : null}

          {/* Comments Section */}
          <View className="flex-1 pt-4">
            <Text variant="heading" className="pb-3">
              {t('post.comments.title')}
            </Text>
            <Text variant="body" tone="secondary">
              {t('post.comments.empty')}
            </Text>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
});
