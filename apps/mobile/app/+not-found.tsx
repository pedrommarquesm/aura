import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/layout';
import { Text } from '@/components/ui';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <Screen className="items-center justify-center">
      <Text variant="display">🗿</Text>
      <Text variant="heading" className="pt-4">
        {t('notFound.title')}
      </Text>
      <Text variant="body" tone="secondary" className="pt-2 text-center">
        {t('notFound.body')}
      </Text>

      <View className="pt-6">
        <Link href="/" asChild>
          <Text variant="label" tone="aura">
            {t('notFound.backToFeed')}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
