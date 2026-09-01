import { View } from 'react-native';

import { Skeleton } from '@/components/ui';

/** Shared by the in-frame panel and the full ledger sheet. */
export function LedgerRowSkeleton() {
  return (
    <View className="flex-row items-start gap-3 px-gutter py-3" accessibilityElementsHidden>
      <Skeleton className="h-8 w-8" />
      <View className="flex-1 gap-1.5 pt-0.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-full" />
      </View>
    </View>
  );
}
