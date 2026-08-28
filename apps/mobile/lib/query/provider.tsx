import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { createQueryClient } from './client';

/**
 * TanStack Query's default focus detection is a browser `visibilitychange` listener,
 * which never fires in React Native. Without this, coming back from the background
 * never refetches and the feed shows yesterday's posts.
 */
function useAppStateFocus() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });

    return () => subscription.remove();
  }, []);
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  useAppStateFocus();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
