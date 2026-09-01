import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedPostCard, FeedPostSkeleton } from '@/components/feed';
import { Button, Text } from '@/components/ui';
import { fetchPost, messageForError } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';
import { colors } from '@/theme/tokens';

export default function PostScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { height: windowHeight } = useWindowDimensions();
  const raw = useLocalSearchParams<{ id?: string | string[] }>().id;
  const id = Array.isArray(raw) ? raw[0] : raw;

  const [viewportHeight, setViewportHeight] = useState(() => Math.round(windowHeight));

  const post = useQuery({
    queryKey: queryKeys.post(id ?? ''),
    queryFn: () => fetchPost(id!),
    enabled: Boolean(id),
  });

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.post(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.postComments(id) });
    }, [id, queryClient]),
  );

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    if (next > 0) setViewportHeight(next);
  }, []);

  // Provider must live on this screen: the root stack uses native screens, so a
  // provider above the Stack portals the comments sheet behind the page.
  return (
    <BottomSheetModalProvider>
      <View className="flex-1 bg-bg" onLayout={onViewportLayout}>
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            paddingTop: insets.top,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.back')}
            hitSlop={12}
            onPress={() => router.back()}
            className="self-start px-gutter py-2"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text.DEFAULT} />
          </Pressable>
        </View>

        {!id || post.isError ? (
          <View className="flex-1 items-start justify-center gap-3 px-gutter pb-24">
            <Text variant="title">{t('post.error.title')}</Text>
            <Text variant="body" tone="secondary">
              {post.error ? messageForError(post.error) : t('errors.not_found')}
            </Text>
            <Button label={t('common.actions.retry')} onPress={() => void post.refetch()} />
          </View>
        ) : post.isPending || !post.data ? (
          <FeedPostSkeleton />
        ) : (
          <FeedPostCard
            post={post.data}
            isActiveVideo={isFocused}
            height={viewportHeight}
            onDeleted={() => router.back()}
          />
        )}
      </View>
    </BottomSheetModalProvider>
  );
}
