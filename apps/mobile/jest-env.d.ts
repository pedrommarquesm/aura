/// <reference types="jest" />

interface RouterMocks {
  navigate: jest.Mock;
  push: jest.Mock;
  back: jest.Mock;
  replace: jest.Mock;
}

declare global {
  // eslint-disable-next-line no-var
  var __routerMocks: RouterMocks | undefined;
}

export {};
