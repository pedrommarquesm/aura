import { View } from 'react-native';

import { Skeleton } from '@/components/ui';

/** Mirrors `FeedPostCard`'s geometry so the swap to real content does not jump. */
export function FeedPostSkeleton() {
  return (
    <View className="pb-6">
      <View className="flex-row items-center gap-3 px-gutter py-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <View className="gap-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-16" />
        </View>
      </View>
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <View className="flex-row gap-5 px-gutter pt-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-8" />
      </View>
    </View>
  );
}
