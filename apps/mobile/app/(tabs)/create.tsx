import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/layout';
import { AuraGradient, Button, Text } from '@/components/ui';
import { colors } from '@/theme/tokens';

export default function CreateScreen() {
  const { t } = useTranslation();

  return (
    <Screen className="items-center justify-center">
      <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-xl">
        <AuraGradient />
        <Ionicons name="camera" size={36} color={colors.text.DEFAULT} />
      </View>

      <Text variant="title" className="pt-6 text-center">
        {t('create.title')}
      </Text>
      <Text variant="body" tone="secondary" className="pt-2 text-center">
        {t('create.subtitle')}
      </Text>

      <View className="w-full gap-3 pt-8">
        <Button
          label={t('create.actions.takePhoto')}
          icon={<Ionicons name="camera-outline" size={18} color={colors.text.DEFAULT} />}
          glow
          fullWidth
        />
        <Button
          label={t('create.actions.chooseFromLibrary')}
          variant="secondary"
          icon={<Ionicons name="images-outline" size={18} color={colors.text.DEFAULT} />}
          fullWidth
        />
      </View>

      <Text variant="caption" tone="muted" className="pt-6 text-center">
        {t('create.comingSoon')}
      </Text>
    </Screen>
  );
}
