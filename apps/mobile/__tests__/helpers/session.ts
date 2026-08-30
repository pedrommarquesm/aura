import i18n from '@/lib/i18n/i18n';
import { useAuthGateStore } from '@/store/auth-gate';
import { usePreferencesStore } from '@/store/preferences';
import { useSessionStore } from '@/store/session';

import { testUser } from './api';

export function asGuest() {
  useSessionStore.setState({
    status: 'guest',
    accessToken: null,
    user: null,
    needsUsername: false,
  });
}

export function asSignedIn(overrides: Partial<typeof testUser> = {}) {
  useSessionStore.setState({
    status: 'authenticated',
    accessToken: 'test-access-token',
    user: { ...testUser, ...overrides },
    needsUsername: false,
  });
}

export function asNeedsUsername() {
  asSignedIn();
  useSessionStore.setState({ needsUsername: true });
}

export function resetSession() {
  asGuest();
  useAuthGateStore.setState({ open: false, reason: 'generic', pending: null });
  usePreferencesStore.setState({
    feedRanking: 'latest',
    autoplayVideo: true,
    hapticsEnabled: true,
    languageOverride: null,
  });
  void i18n.changeLanguage('en');
}

export function routerMocks() {
  return (
    globalThis as {
      __routerMocks: {
        navigate: jest.Mock;
        push: jest.Mock;
        back: jest.Mock;
        replace: jest.Mock;
      };
    }
  ).__routerMocks;
}
