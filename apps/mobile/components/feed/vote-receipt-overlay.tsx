import { useQuery } from '@tanstack/react-query';
import { Fragment } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Avatar, Text } from '@/components/ui';
import { fetchVoteOverlay, type VoteReceipt } from '@/lib/api';
import { useFormat } from '@/lib/i18n';
import { queryKeys } from '@/lib/query/keys';
import { colors, withAlpha } from '@/theme/tokens';

/** How often the overlay re-checks for new community receipts on this post. */
const POLL_INTERVAL_MS = 15_000;

function ReceiptRow({ row }: { row: VoteReceipt }) {
  const format = useFormat();
  const positive = row.amount > 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(200)}
      className="mb-2 flex-row items-center gap-2 self-start rounded-sm px-2 py-1.5"
      style={{ backgroundColor: withAlpha(colors.bg, 0.65), maxWidth: '84%' }}
    >
      <Avatar uri={row.author.avatarUrl} username={row.author.username} size="sm" shape="square" />
      <Text variant="caption" numberOfLines={2} style={{ flexShrink: 1 }}>
        <Text variant="caption" className="font-semibold">
          @{row.author.username}:{' '}
        </Text>
        {row.receipt}{' '}
        <Text variant="caption" style={{ color: positive ? colors.aura.DEFAULT : colors.danger }}>
          ({format.signed(row.amount)})
        </Text>
      </Text>
    </Animated.View>
  );
}

/**
 * Floating receipts, left side. Only votes with text float here — a vote
 * with no receipt lands in the ledger silently (docs/redesign-tracker.md
 * Q19). There is no live push channel yet, so this polls the "latest
 * receipts with text" endpoint while the card is on screen; a future pass
 * can replace the poll with a socket without changing this component's shape.
 */
export function VoteReceiptOverlay({ postId, active }: { postId: string; active: boolean }) {
  const overlay = useQuery({
    queryKey: queryKeys.postVoteOverlay(postId),
    queryFn: ({ signal }) => fetchVoteOverlay(postId, signal),
    enabled: active,
    refetchInterval: active ? POLL_INTERVAL_MS : false,
    staleTime: POLL_INTERVAL_MS,
  });

  const rows = overlay.data ?? [];
  if (rows.length === 0) return null;

  return (
    <View pointerEvents="none" style={{ maxWidth: '70%' }}>
      {rows.map((row, index) => (
        <Fragment key={`${row.author.id}:${row.createdAt}`}>
          {index < 3 ? <ReceiptRow row={row} /> : null}
        </Fragment>
      ))}
    </View>
  );
}
