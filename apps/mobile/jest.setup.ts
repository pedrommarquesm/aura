import { resetApiMocks } from './__tests__/helpers/api';
import { resetSession, routerMocks } from './__tests__/helpers/session';

// Mock @gorhom/bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  return {
    __esModule: true,
    BottomSheetModal: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        present: jest.fn(),
        dismiss: jest.fn(),
        close: jest.fn(),
        snapToIndex: jest.fn(),
        snapToPosition: jest.fn(),
        expand: jest.fn(),
        collapse: jest.fn(),
      }));
      return null;
    }),
    BottomSheetView: ({ children }: any) => children,
    BottomSheetBackdrop: () => null,
    BottomSheetModalProvider: ({ children }: any) => children,
    useBottomSheetModal: () => ({
      dismiss: jest.fn(),
      dismissAll: jest.fn(),
    }),
  };
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
