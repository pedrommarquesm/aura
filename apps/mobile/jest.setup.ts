import { InteractionManager } from 'react-native';

import { resetApiMocks } from './__tests__/helpers/api';
import { resetSession, routerMocks } from './__tests__/helpers/session';

jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation((task) => {
  if (typeof task === 'function') {
    task();
  }
  return {
    then: (onfulfilled?: () => void) => Promise.resolve().then(onfulfilled),
    done: () => undefined,
    cancel: () => undefined,
  } as ReturnType<typeof InteractionManager.runAfterInteractions>;
});

beforeEach(() => {
  resetApiMocks();
  resetSession();
  const router = routerMocks();
  router.navigate.mockClear();
  router.push.mockClear();
  router.back.mockClear();
  router.replace.mockClear();
});
