import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { colors, withAlpha } from '@/theme/tokens';

export type FeedMode = 'cooked' | 'liveCheck' | 'certified';

export const FEED_MODE_ORDER: FeedMode[] = ['cooked', 'liveCheck', 'certified'];

const shadow = {
  textShadowColor: withAlpha(colors.bg, 0.8),
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
};

/**
 * Home's header swipe (docs/redesign-screens/09_feed_header_cooked_live_check_certified.png,
 * `RDX-51`): COOKED — LIVE CHECK — CERTIFIED, always all three, active one
 * large and white, the others dim and small. Settings gear sits above it,
 * not part of the row (screen 02's header), so it never collides with
 * CERTIFIED at the right edge.
 */
export function FeedModeHeader({
  mode,
  onSelect,
}: {
  mode: FeedMode;
  onSelect: (mode: FeedMode) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={{ paddingTop: insets.top }}>
      <View className="flex-row justify-end px-gutter pb-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.open')}
          hitSlop={12}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text.secondary} style={shadow} />
        </Pressable>
      </View>

      <View className="flex-row items-center px-gutter pb-3">
        {FEED_MODE_ORDER.map((item, index) => {
          const active = item === mode;
          const align = index === 0 ? 'flex-start' : index === 2 ? 'flex-end' : 'center';

          return (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(`feed.mode.${item}`)}
              hitSlop={8}
              onPress={() => onSelect(item)}
              style={{ flex: index === 1 ? 1.4 : 1, alignItems: align }}
            >
              <Text
                variant={active ? 'heading' : 'label'}
                numberOfLines={1}
                allowFontScaling={false}
                style={[
                  shadow,
                  {
                    color: active ? colors.text.DEFAULT : colors.text.muted,
                    fontWeight: active ? '800' : '600',
                    textTransform: 'uppercase',
                  },
                ]}
              >
                {t(`feed.mode.${item}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
