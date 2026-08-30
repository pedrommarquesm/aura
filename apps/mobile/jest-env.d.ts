/// <reference types="jest" />

interface RouterMocks {
  navigate: jest.Mock;
  push: jest.Mock;
  back: jest.Mock;
  replace: jest.Mock;
}

declare global {
  var __routerMocks: RouterMocks | undefined;
}

export {};
