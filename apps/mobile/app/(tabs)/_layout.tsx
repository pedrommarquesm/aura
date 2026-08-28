import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CreateTabButton } from '@/components/navigation/create-tab-button';
import { colors, typography } from '@/theme/tokens';

const TAB_BAR_HEIGHT = 60;

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

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
          lineHeight: typography.caption.lineHeight,
          fontWeight: typography.caption.fontWeight,
        },
        tabBarItemStyle: { paddingTop: 2 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: icon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: 'Discover', tabBarIcon: icon('search-outline', 'search') }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarButton: ({ onPress }) => <CreateTabButton onPress={onPress} />,
        }}
      />
      <Tabs.Screen
        name="rank"
        options={{ title: 'Rank', tabBarIcon: icon('trophy-outline', 'trophy') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: icon('person-outline', 'person') }}
      />
    </Tabs>
  );
}
