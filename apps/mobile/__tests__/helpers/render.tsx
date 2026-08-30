import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createTestQueryClient } from './query-client';
import { AuthModals } from '@/components/auth';
import { I18nProvider } from '@/lib/i18n';

const insets = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export async function renderApp(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const queryClient = createTestQueryClient();

  function Providers({ children }: { children: React.ReactNode }) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={insets}>
          <I18nProvider>
            <QueryClientProvider client={queryClient}>
              {children}
              <AuthModals />
            </QueryClientProvider>
          </I18nProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return { ...render(ui, { wrapper: Providers, ...options }), queryClient };
}
