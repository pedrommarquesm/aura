import { resetApiMocks } from './__tests__/helpers/api';
import { resetQueryClients } from './__tests__/helpers/query-client';
import { resetSession, routerMocks } from './__tests__/helpers/session';

afterEach(() => {
  resetQueryClients();
});

beforeEach(() => {
  resetApiMocks();
  resetSession();
  const router = routerMocks();
  router.navigate.mockClear();
  router.push.mockClear();
  router.back.mockClear();
  router.replace.mockClear();
  router.params = {};
});
