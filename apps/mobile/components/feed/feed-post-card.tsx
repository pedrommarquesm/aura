import Ionicons from '@expo/vector-icons/Ionicons';
import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text as RNText, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaptionText } from './caption-text';
import { FeedCommentsSheet } from './feed-comments-sheet';
import { LikeButton, type LikeButtonHandle } from './like-button';
import { PostOptions } from './post-options';
import { PostVideo, VideoMuteBadge, videoPlaybackUrl } from './post-video';
import { Avatar, Text } from '@/components/ui';
import type { FeedCard } from '@/lib/api';
import { likePost, unlikePost } from '@/lib/api/likes';
import { celebrateFeedback } from '@/lib/haptics';
import { useFormat } from '@/lib/i18n';
import { hashtagPath } from '@/lib/hashtags';
import { userProfileHref } from '@/lib/navigation/user-profile';
import { applyLikeResult } from '@/lib/query/feed-cache';
import { useAuthGateStore } from '@/store/auth-gate';
import { usePreferencesStore } from '@/store/preferences';
import { useIsAuthenticated, useSessionStore } from '@/store/session';
import { burstTiming, celebrate, instant } from '@/theme/motion';
import { colors, withAlpha } from '@/theme/tokens';

/** Semi-transparent chrome on media. Slash-opacity class names crash Expo Router. */
const onMedia = { backgroundColor: withAlpha(colors.bg, 0.7) };

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

const ACTION = 44;
const MOAI = 80;
const LIFT = 28;
const zoomIn = { duration: 90, easing: Easing.out(Easing.cubic) };
const zoomOut = { duration: 80, easing: Easing.in(Easing.quad) };

function DoubleTapMoai({
  burst,
  origin,
}: {
  burst: number;
  origin: { x: number; y: number };
}) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(0.35);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (burst === 0) return;

    opacity.set(1);
    y.set(-18);
    scale.set(0.35);
    glow.set(0.2);

    // Uniform zoom-in / zoom-out bounce — not a squash. Hits above the tap, then pounds.
    y.set(
      withSequence(
        withTiming(6, zoomIn),
        withSpring(-16, celebrate),
        withTiming(2, zoomIn),
        withSpring(-10, celebrate),
      ),
    );
    scale.set(
      withSequence(
        withTiming(1.42, zoomIn, (finished) => {
          if (finished) runOnJS(celebrateFeedback)();
        }),
        withSpring(0.9, celebrate),
        withTiming(1.22, zoomIn),
        withSpring(1, celebrate),
      ),
    );
    glow.set(
      withSequence(
        withTiming(1, zoomIn),
        withTiming(0.45, zoomOut),
        withTiming(0.85, zoomIn),
        withTiming(0, burstTiming),
      ),
    );
    opacity.set(
      withSequence(
        withTiming(1, instant),
        withTiming(1, { duration: 420 }),
        withTiming(0, burstTiming),
      ),
    );
  }, [burst, glow, opacity, scale, y]);

  const moaiStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: y.get() }, { scale: scale.get() }],
    shadowOpacity: 0.3 + glow.get() * 0.55,
    shadowRadius: 10 + glow.get() * 18,
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: glow.get() * 0.5,
    transform: [{ scale: 0.65 + glow.get() * 0.55 }],
  }));

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: origin.x - MOAI / 2,
        top: origin.y - MOAI / 2 - LIFT,
        width: MOAI,
        height: MOAI,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          haloStyle,
          {
            position: 'absolute',
            width: MOAI + 28,
            height: MOAI + 28,
            borderRadius: 999,
            backgroundColor: withAlpha(colors.aura.DEFAULT, 0.5),
          },
        ]}
      />
      <Animated.View
        style={[
          moaiStyle,
          {
            shadowColor: colors.aura.DEFAULT,
            shadowOffset: { width: 0, height: 0 },
            elevation: 14,
          },
        ]}
      >
        <RNText allowFontScaling={false} style={styles.smashMoai}>
          🗿
        </RNText>
      </Animated.View>
    </View>
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
  height: heightProp,
  overlayInsetTop = 0,
}: {
  post: FeedCard;
  /** Home feed only: the viewport video plays; others show the poster. */
  isActiveVideo?: boolean;
  onDeleted?: () => void;
  /** Exact page height. Home feed passes the list viewport so posts snap 1:1. */
  height?: number;
  /** Keep top chrome (aura pill) below a floating header. */
  overlayInsetTop?: number;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
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
  const [captionHeight, setCaptionHeight] = useState(96);
  const muted = usePreferencesStore((state) => state.feedMuted);
  const toggleFeedMuted = usePreferencesStore((state) => state.toggleFeedMuted);

  const requireAuth = !isAuthenticated;
  const playbackUrl = videoPlaybackUrl(media);
  const isVideo = media.type === 'video';
  const posterUri = media.posterUrl ?? media.thumbUrl ?? media.feedUrl;
  const playing = isVideo && isActiveVideo && Boolean(playbackUrl);

  const cardHeight = heightProp ?? windowHeight - insets.top;

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
    toggleFeedMuted();
  }, [toggleFeedMuted]);

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

  return (
    <View style={[styles.card, { height: cardHeight }]}>
      <GestureDetector gesture={mediaGesture}>
        <View
          style={styles.stage}
          collapsable={false}
          accessible
          accessibilityRole="image"
          accessibilityLabel={post.caption ?? `@${author.username}`}
          accessibilityHint={
            isVideo ? t('feed.post.a11y.doubleTapSound') : t('feed.post.a11y.doubleTap')
          }
        >
          <View style={styles.media}>
            <Image
              source={posterUri ? { uri: posterUri } : undefined}
              placeholder={media.thumbUrl ? { uri: media.thumbUrl } : undefined}
              contentFit="contain"
              transition={160}
              recyclingKey={post.id}
              style={StyleSheet.absoluteFill}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />

            {playing && playbackUrl ? (
              <PostVideo source={playbackUrl} playing muted={muted} contentFit="contain" />
            ) : null}
          </View>

          <View style={StyleSheet.absoluteFill} collapsable={false} />

          {isVideo && media.durationMs && !playing ? (
            <View className="absolute bottom-3 left-3 flex-row items-center gap-1 rounded-full px-2 py-1" style={onMedia}>
              <Ionicons name="play" size={10} color={colors.text.DEFAULT} />
              <Text variant="caption">{formatDuration(media.durationMs)}</Text>
            </View>
          ) : null}

          <DoubleTapMoai burst={burst} origin={origin} />

          {overlayInsetTop > 0 ? null : (
            <View style={[styles.auraSpread, { top: 16 }]}>
              <View style={styles.auraPill}>
                <Text variant="caption" style={styles.auraLabel}>
                  {format.count(post.aura)} 🗿
                </Text>
              </View>
            </View>
          )}

          <View
            className="absolute bottom-0 left-0 right-0"
            onLayout={(event) => {
              const next = Math.round(event.nativeEvent.layout.height);
              if (next > 0) setCaptionHeight(next);
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('feed.post.a11y.profile', { username: author.username })}
              onPress={shouldTruncateCaption ? openDrawer : openAuthor}
              className="rounded-t-2xl px-4 py-3"
              style={[onMedia, { paddingRight: ACTION + 28 }]}
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
                  <CaptionText
                    caption={post.caption}
                    variant="label"
                    tone="secondary"
                    numberOfLines={captionLines}
                    onHashtagPress={(tag) => router.push(hashtagPath(tag))}
                  />
                  {shouldTruncateCaption ? (
                    <Text variant="caption" tone="aura" className="pt-1">
                      {t('feed.post.seeMore')}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          </View>

          <View style={[styles.actions, { bottom: captionHeight + 8 }]}>
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
                  likeRef.current?.toggle();
                }}
                hitSlop={8}
                style={styles.actionBtn}
              >
                <RNText
                  allowFontScaling={false}
                  style={[styles.moai, { opacity: post.likedByMe ? 1 : 0.7 }]}
                >
                  🗿
                </RNText>
                <Text
                  variant="caption"
                  tone={post.likedByMe ? 'aura' : 'default'}
                  className="font-semibold"
                  style={styles.actionCount}
                >
                  {format.count(post.likeCount)}
                </Text>
              </Pressable>
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
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('feed.post.comments', { count: post.commentCount ?? 0 })}
              accessibilityHint={t('feed.post.a11y.comment')}
              onPress={openDrawer}
              hitSlop={8}
              style={styles.actionBtn}
            >
              <Ionicons name="chatbubble-outline" size={22} color={colors.text.DEFAULT} style={styles.actionIcon} />
              <Text variant="caption" tone="default" className="font-semibold" style={styles.actionCount}>
                {format.count(post.commentCount ?? 0)}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.actions.share')}
              hitSlop={8}
              style={styles.actionBtn}
            >
              <Ionicons name="arrow-redo-outline" size={22} color={colors.text.DEFAULT} style={styles.actionIcon} />
            </Pressable>

            <PostOptions post={post} onDeleted={onDeleted} />
          </View>
        </View>
      </GestureDetector>

      {playing ? <VideoMuteBadge muted={muted} hostHeight={cardHeight} /> : null}

      <FeedCommentsSheet post={post} sheetRef={bottomSheetRef} onOpenAuthor={openAuthor} />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  stage: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  media: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  auraSpread: {
    position: 'absolute',
    right: 12,
    borderRadius: 999,
    backgroundColor: withAlpha(colors.bg, 0.65),
    shadowColor: colors.aura.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  auraPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: colors.aura.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  auraLabel: {
    color: colors.text.DEFAULT,
    fontWeight: '700',
  },
  actions: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 14,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: ACTION,
  },
  actionIcon: {
    textShadowColor: withAlpha(colors.bg, 0.7),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  actionCount: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 13,
    fontVariant: ['tabular-nums'],
    textShadowColor: withAlpha(colors.bg, 0.7),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  moai: {
    fontSize: 24,
    lineHeight: 28,
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: withAlpha(colors.bg, 0.7),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  smashMoai: {
    fontSize: 56,
    lineHeight: 64,
    textAlign: 'center',
    includeFontPadding: false,
  },
});
