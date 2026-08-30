import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import type { CommentCard } from '@/lib/api';
import { userProfileHref } from '@/lib/navigation/user-profile';
import { useSessionStore } from '@/store/session';

export function CommentRow({ comment }: { comment: CommentCard }) {
  const { t } = useTranslation();
  const router = useRouter();
  const viewerUsername = useSessionStore((state) => state.user?.username);
  const { author } = comment;

  return (
    <View className="flex-row items-start gap-3 px-gutter py-3">
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('feed.post.a11y.profile', { username: author.username })}
        onPress={() => router.push(userProfileHref(author.username, viewerUsername))}
      >
        <Avatar uri={author.avatarUrl} username={author.username} size="sm" accessible={false} />
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
        <Text variant="body" tone="secondary" className="pt-0.5">
          {comment.body}
        </Text>
      </View>
    </View>
  );
}
