import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Tabs, useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_CONTENT_HEIGHT } from '@/components/navigation/tab-bar';
import { Text } from '@/components/ui';
import { emitFeedTabPress } from '@/lib/navigation/feed-tab';
import { colors } from '@/theme/tokens';

/**
 * Screen 01 (docs/redesign-screens/): two tabs, Home | Profile. No Create,
 * no Discover, no Rank in the bar (RDX-50) — those routes still exist for
 * direct navigation (Create is reachable from the Profile screen; Discover
 * and Rank are parked, not deleted), they are just hidden here via `href:
 * null` rather than rendered as tab buttons.
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
        style={[styles.label, { color }]}
      >
        {text}
      </Text>
    );
  };
}

/**
 * The active tab's top edge gets a full-width-of-that-tab neon green bar
 * (screen 01). Only two tabs are ever visible, so this is a plain 50/50
 * split rather than a measured indicator — `useSegments` re-renders this on
 * every navigation, no extra state needed.
 */
function ActiveTabIndicator() {
  const segments = useSegments();
  const onProfile = segments[segments.length - 1] === 'profile';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={[
          styles.indicator,
          onProfile ? styles.indicatorRight : styles.indicatorLeft,
        ]}
      />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <BottomSheetModalProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: colors.aura.DEFAULT,
          tabBarInactiveTintColor: colors.text.secondary,
          tabBarBackground: () => <ActiveTabIndicator />,
          tabBarStyle: {
            backgroundColor: colors.bg,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
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
        <Tabs.Screen name="discover" options={{ href: null }} />
        <Tabs.Screen name="create" options={{ href: null }} />
        <Tabs.Screen name="rank" options={{ href: null }} />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('nav.profile'),
            tabBarLabel: label(t('nav.profile')),
            tabBarIcon: icon('person-outline', 'person'),
          }}
        />
      </Tabs>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: '50%',
    height: 3,
    backgroundColor: colors.aura.DEFAULT,
  },
  indicatorLeft: {
    left: 0,
  },
  indicatorRight: {
    right: 0,
  },
});
