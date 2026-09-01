import Ionicons from '@expo/vector-icons/Ionicons';
import { type BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuraVoteSlider } from './aura-vote-slider';
import { CaptionText } from './caption-text';
import { PostOptions } from './post-options';
import { PostVideo, VideoMuteBadge, videoPlaybackUrl } from './post-video';
import { ReceiptPrompt } from './receipt-prompt';
import { VoteLedgerSheet } from './vote-ledger-sheet';
import { VoteReceiptOverlay } from './vote-receipt-overlay';
import { Avatar, Text } from '@/components/ui';
import type { CastVoteResult, FeedCard } from '@/lib/api';
import { useFormat } from '@/lib/i18n';
import { hashtagPath } from '@/lib/hashtags';
import { userProfileHref } from '@/lib/navigation/user-profile';
import { applyVoteResult, applyVoteToLedger } from '@/lib/query/feed-cache';
import { queryKeys } from '@/lib/query/keys';
import { useAuthGateStore } from '@/store/auth-gate';
import { usePreferencesStore } from '@/store/preferences';
import { useIsAuthenticated, useSessionStore } from '@/store/session';
import { colors, withAlpha } from '@/theme/tokens';

/** Semi-transparent chrome on media. Slash-opacity class names crash Expo Router. */
const onMedia = { backgroundColor: withAlpha(colors.bg, 0.7) };

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

const ACTION = 44;

/**
 * TikTok-style full-screen post card, with the vote & receipts redesign's
 * signature interaction: a vertical slider on the right edge replaces the
 * old like button and double-tap (docs/redesign-tracker.md `RDX-30`–`RDX-35`).
 * Memoised because a vote must repaint one card, never the list (§6.3).
 */
export const FeedPostCard = memo(function FeedPostCard({
  post,
  isActiveVideo = false,
  isActive = true,
  onDeleted,
  height: heightProp,
  overlayInsetTop = 0,
}: {
  post: FeedCard;
  /** Home feed only: the viewport video plays; others show the poster. */
  isActiveVideo?: boolean;
  /** Whether this card is the one currently on screen. Gates the receipt-overlay poll. */
  isActive?: boolean;
  onDeleted?: () => void;
  /** Exact page height. Home feed passes the list viewport so posts snap 1:1. */
  height?: number;
  /** Keep the vote slider clear of a floating header above it. */
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
  const sessionUser = useSessionStore((state) => state.user);
  const requestAuth = useAuthGateStore((state) => state.requestAuth);

  const ledgerSheetRef = useRef<BottomSheetModal>(null);
  const openAuthor = useCallback(() => {
    router.push(userProfileHref(author.username, viewerUsername));
  }, [author.username, router, viewerUsername]);

  const [captionHeight, setCaptionHeight] = useState(96);
  const [pendingReceiptAmount, setPendingReceiptAmount] = useState<number | null>(null);
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

  const openLedger = useCallback(() => {
    ledgerSheetRef.current?.present();
  }, []);

  const toggleMuted = useCallback(() => {
    toggleFeedMuted();
  }, [toggleFeedMuted]);

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

  const handleRequireAuth = useCallback(
    (amount: number) => {
      requestAuth({ reason: 'vote', pending: { type: 'vote', postId: post.id, amount } });
    },
    [post.id, requestAuth],
  );

  const handleCommitted = useCallback(
    (result: CastVoteResult) => {
      applyVoteResult(queryClient, post.id, result);

      if (result.alreadyVoted) return;

      if (sessionUser) {
        applyVoteToLedger(queryClient, post.id, {
          amount: result.amount,
          receipt: result.receipt,
          createdAt: result.createdAt,
          author: {
            id: sessionUser.id,
            username: sessionUser.username,
            displayName: sessionUser.displayName,
            avatarUrl: sessionUser.avatarUrl,
            aura: sessionUser.aura,
            title: sessionUser.title,
          },
        });
      }

      if (result.receipt === null) {
        setPendingReceiptAmount(result.amount);
      }
    },
    [post.id, queryClient, sessionUser],
  );

  const dismissReceiptPrompt = useCallback(() => {
    setPendingReceiptAmount(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.postVoteOverlay(post.id) });
  }, [post.id, queryClient]);

  const committedAmount = post.votedByMe ? post.myAmount : null;

  const mediaView = (
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
  );

  return (
    <View style={[styles.card, { height: cardHeight }]}>
      <View
        style={styles.stage}
        collapsable={false}
        accessible
        accessibilityRole="image"
        accessibilityLabel={post.caption ?? `@${author.username}`}
        accessibilityHint={isVideo ? t('feed.post.a11y.mute') : undefined}
      >
        {isVideo ? <GestureDetector gesture={singleTap}>{mediaView}</GestureDetector> : mediaView}

        {isVideo && media.durationMs && !playing ? (
          <View
            className="absolute bottom-3 left-3 flex-row items-center gap-1 rounded-sm px-2 py-1"
            style={onMedia}
          >
            <Ionicons name="play" size={10} color={colors.text.DEFAULT} />
            <Text variant="caption">{formatDuration(media.durationMs)}</Text>
          </View>
        ) : null}

        <View
          pointerEvents="box-none"
          style={[styles.sliderColumn, { top: overlayInsetTop + 32, bottom: captionHeight + 176 }]}
        >
          <AuraVoteSlider
            postId={post.id}
            committedAmount={committedAmount}
            requireAuth={requireAuth}
            onRequireAuth={handleRequireAuth}
            onCommitted={handleCommitted}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('feed.post.voteCount', { count: post.voteCount })}
          hitSlop={8}
          onPress={openLedger}
          style={[styles.scoreWrap, { bottom: captionHeight + 96 }]}
        >
          <Text
            variant="display"
            allowFontScaling={false}
            style={{ color: post.aura >= 0 ? colors.aura.DEFAULT : colors.danger }}
          >
            {format.signed(post.aura)}
          </Text>
        </Pressable>

        <View
          pointerEvents="box-none"
          style={[styles.receiptOverlayWrap, { bottom: captionHeight + 96 }]}
        >
          <VoteReceiptOverlay postId={post.id} active={isActive} />
        </View>

        {pendingReceiptAmount !== null ? (
          <View style={[styles.receiptPromptWrap, { bottom: captionHeight + 16 }]}>
            <ReceiptPrompt postId={post.id} onDone={() => dismissReceiptPrompt()} />
          </View>
        ) : null}

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
            onPress={shouldTruncateCaption ? openLedger : openAuthor}
            className="rounded-t-lg px-4 py-3"
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.actions.share')}
            hitSlop={8}
            style={styles.actionBtn}
          >
            <Ionicons
              name="arrow-redo-outline"
              size={22}
              color={colors.text.DEFAULT}
              style={styles.actionIcon}
            />
          </Pressable>

          <PostOptions post={post} onDeleted={onDeleted} />
        </View>
      </View>

      {playing ? <VideoMuteBadge muted={muted} hostHeight={cardHeight} /> : null}

      <VoteLedgerSheet post={post} sheetRef={ledgerSheetRef} onOpenAuthor={openAuthor} />
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
  sliderColumn: {
    position: 'absolute',
    right: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreWrap: {
    position: 'absolute',
    left: 16,
  },
  receiptOverlayWrap: {
    position: 'absolute',
    left: 16,
    right: 90,
  },
  receiptPromptWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
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
});
