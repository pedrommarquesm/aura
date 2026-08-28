import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { QueryProvider } from '@/lib/query/provider';
import { useSessionStore } from '@/store/session';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const restore = useSessionStore((state) => state.restore);

  // Reads the refresh token out of the Keychain. Cheap, but async, so it cannot happen
  // during module evaluation.
  useEffect(() => {
    void restore();
  }, [restore]);

  return (
    // Required once, at the very root: gestures registered below an unwrapped tree are
    // silently ignored on Android.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
