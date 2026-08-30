/// <reference types="jest" />

interface RouterMocks {
  navigate: jest.Mock;
  push: jest.Mock;
  back: jest.Mock;
  replace: jest.Mock;
  params: Record<string, string | string[] | undefined>;
}

declare global {
  var __routerMocks: RouterMocks | undefined;
}

export {};
