import { resetApiMocks } from './__tests__/helpers/api';
import { resetSession, routerMocks } from './__tests__/helpers/session';

beforeEach(() => {
  resetApiMocks();
  resetSession();
  const router = routerMocks();
  router.navigate.mockClear();
  router.push.mockClear();
  router.back.mockClear();
  router.replace.mockClear();
});
