import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import type { VoteReceipt } from '@/lib/api';
import { useFormat } from '@/lib/i18n';
import { userProfileHref } from '@/lib/navigation/user-profile';
import { useSessionStore } from '@/store/session';
import { colors } from '@/theme/tokens';

/** One row of the receipt ledger: square avatar, username, receipt, signed amount. */
export function VoteLedgerRow({ row }: { row: VoteReceipt }) {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const viewerUsername = useSessionStore((state) => state.user?.username);
  const { author } = row;
  const positive = row.amount > 0;

  return (
    <View className="flex-row items-start gap-3 px-gutter py-3">
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('feed.post.a11y.profile', { username: author.username })}
        onPress={() => router.push(userProfileHref(author.username, viewerUsername))}
      >
        <Avatar
          uri={author.avatarUrl}
          username={author.username}
          size="sm"
          shape="square"
          accessible={false}
        />
      </Pressable>
      <View className="flex-1 pt-0.5">
        <Text
          variant="label"
          onPress={() => router.push(userProfileHref(author.username, viewerUsername))}
          accessibilityRole="link"
          accessibilityLabel={t('feed.post.a11y.profile', { username: author.username })}
        >
          @{author.username}
        </Text>
        {row.receipt ? (
          <Text variant="body" tone="secondary" className="pt-0.5">
            {row.receipt}
          </Text>
        ) : null}
      </View>
      <Text
        variant="label"
        className="font-bold"
        style={{
          color: positive ? colors.aura.DEFAULT : colors.danger,
          fontVariant: ['tabular-nums'],
        }}
      >
        {format.signed(row.amount)}
      </Text>
    </View>
  );
}
