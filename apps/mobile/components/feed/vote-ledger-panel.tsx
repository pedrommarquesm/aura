import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { LedgerRowSkeleton } from './ledger-row-skeleton';
import { VoteLedgerRow } from './vote-ledger-row';
import { Button, Text } from '@/components/ui';
import { fetchVoteLedger, type FeedCard } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';
import { quick } from '@/theme/motion';
import { colors, withAlpha } from '@/theme/tokens';

/** Header-only. Always visible (docs/redesign-screens/02, `RDX-42`). */
export const LEDGER_PANEL_COLLAPSED_HEIGHT = 40;

/** Only the newest rows — pagination lives in `VoteLedgerSheet`, opened via "see all". */
const PANEL_PREVIEW_COUNT = 4;

/**
 * In-frame collapsible receipt ledger (screen 02) sitting just above the
 * caption bar. Replaces the sheet as the primary way to check recent votes;
 * `VoteLedgerSheet` stays for the full, paginated history ("see all" below).
 */
export function VoteLedgerPanel({
  post,
  expanded,
  expandedHeight,
  onToggle,
  onSeeAll,
}: {
  post: FeedCard;
  expanded: boolean;
  expandedHeight: number;
  onToggle: () => void;
  onSeeAll: () => void;
}) {
  const { t } = useTranslation();
  const height = useSharedValue(LEDGER_PANEL_COLLAPSED_HEIGHT);

  useEffect(() => {
    height.set(withTiming(expanded ? expandedHeight : LEDGER_PANEL_COLLAPSED_HEIGHT, quick));
  }, [expanded, expandedHeight, height]);

  const animatedStyle = useAnimatedStyle(() => ({ height: height.get() }));

  const ledger = useInfiniteQuery({
    queryKey: queryKeys.postVotes(post.id),
    queryFn: ({ pageParam, signal }) => fetchVoteLedger(post.id, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: expanded,
  });

  const items = (ledger.data?.pages.flatMap((page) => page.items) ?? []).slice(
    0,
    PANEL_PREVIEW_COUNT,
  );
  const loading = expanded && ledger.isPending && items.length === 0;
  const empty = expanded && !ledger.isPending && items.length === 0 && !ledger.isError;
  const hasMore = expanded && !loading && !empty && !ledger.isError;

  return (
    <Animated.View style={[styles.panel, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('feed.ledger.title')}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        className="flex-row items-center justify-between px-gutter"
        style={styles.header}
      >
        <Text variant="label" style={styles.headerLabel} numberOfLines={1}>
          {t('feed.ledger.title')}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={colors.text.secondary}
        />
      </Pressable>

      {expanded ? (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 8 }}>
          {ledger.isError ? (
            <View className="gap-2 px-gutter py-3">
              <Text variant="body" tone="secondary">
                {t('feed.ledger.error')}
              </Text>
              <Button
                label={t('common.actions.retry')}
                size="sm"
                onPress={() => void ledger.refetch()}
              />
            </View>
          ) : loading ? (
            <View testID="ledger-panel-skeleton">
              <LedgerRowSkeleton />
              <LedgerRowSkeleton />
            </View>
          ) : empty ? (
            <Text variant="body" tone="secondary" className="px-gutter py-3">
              {t('feed.ledger.empty')}
            </Text>
          ) : (
            items.map((row) => (
              <VoteLedgerRow key={`${row.author.id}:${row.createdAt}`} row={row} />
            ))
          )}

          {hasMore ? (
            <Pressable
              accessibilityRole="button"
              onPress={onSeeAll}
              className="px-gutter py-2"
            >
              <Text variant="label" tone="aura">
                {t('feed.ledger.seeAll')}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    backgroundColor: withAlpha(colors.surface.DEFAULT, 0.92),
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  header: {
    height: LEDGER_PANEL_COLLAPSED_HEIGHT,
  },
  headerLabel: {
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    flex: 1,
  },
});
