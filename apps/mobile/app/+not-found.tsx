import { Link } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/layout';
import { Text } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <Screen className="items-center justify-center">
      <Text variant="display">🗿</Text>
      <Text variant="heading" className="pt-4">
        Nothing here
      </Text>
      <Text variant="body" tone="secondary" className="pt-2 text-center">
        This screen does not exist, which is a shame because it has no Aura.
      </Text>

      <View className="pt-6">
        <Link href="/" asChild>
          <Text variant="label" tone="aura">
            Back to the feed
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
