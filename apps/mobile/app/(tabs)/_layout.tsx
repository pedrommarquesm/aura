import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GuardedCreateTab } from '@/components/navigation/create-tab-button';
import { Text } from '@/components/ui';
import { emitFeedTabPress } from '@/lib/navigation/feed-tab';
import { colors } from '@/theme/tokens';

const TAB_BAR_HEIGHT = 60;

/**
 * Five tabs share the width, so a label has roughly 70pt to live in. Portuguese runs
 * longer than English ("Descobrir" against "Discover"), and at full accessibility text
 * scaling either language ends up clipped mid-word — an icon over a truncated label
 * reads as a bug, so the label scales up only this far.
 */
const LABEL_MAX_FONT_SCALE = 1.2;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IoniconName, activeName: IoniconName) {
  return function TabIcon({
    color,
    focused,
    size,
  }: {
    color: ColorValue;
    focused: boolean;
    size: number;
  }) {
    return <Ionicons name={focused ? activeName : name} size={size} color={color} />;
  };
}

function label(text: string) {
  return function TabLabel({ color }: { color: ColorValue }) {
    return (
      <Text
        variant="caption"
        numberOfLines={1}
        maxFontSizeMultiplier={LABEL_MAX_FONT_SCALE}
        style={{ color }}
      >
        {text}
      </Text>
    );
  };
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.aura.bright,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.surface.DEFAULT,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        // No horizontal padding: the label needs every point of the item it can get.
        tabBarItemStyle: { paddingTop: 2, paddingHorizontal: 0 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarLabel: label(t('nav.home')),
          tabBarIcon: icon('home-outline', 'home'),
        }}
        listeners={{
          tabPress: () => {
            emitFeedTabPress();
          },
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t('nav.discover'),
          tabBarLabel: label(t('nav.discover')),
          tabBarIcon: icon('search-outline', 'search'),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('nav.create'),
          tabBarButton: ({ onPress }) => <GuardedCreateTab onPress={onPress} />,
        }}
      />
      <Tabs.Screen
        name="rank"
        options={{
          title: t('nav.rank'),
          tabBarLabel: label(t('nav.rank')),
          tabBarIcon: icon('trophy-outline', 'trophy'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarLabel: label(t('nav.profile')),
          tabBarIcon: icon('person-outline', 'person'),
        }}
      />
    </Tabs>
  );
}
