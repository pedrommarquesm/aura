import { resetApiMocks } from './__tests__/helpers/api';
import { resetQueryClients } from './__tests__/helpers/query-client';
import { resetSession, routerMocks } from './__tests__/helpers/session';

// Mock @gorhom/bottom-sheet
jest.mock(
  '@gorhom/bottom-sheet',
  () => {
  const React = require('react');
  const { TextInput, ScrollView } = require('react-native');
  const MockBottomSheetModal = React.forwardRef((props: any, ref: any) => {
    const [open, setOpen] = React.useState(false);
    React.useImperativeHandle(ref, () => ({
      present: () => {
        setOpen(true);
        props.onChange?.(0);
      },
      dismiss: () => {
        setOpen(false);
        props.onChange?.(-1);
        props.onDismiss?.();
      },
      close: () => {
        setOpen(false);
        props.onChange?.(-1);
        props.onDismiss?.();
      },
      snapToIndex: jest.fn(),
      snapToPosition: jest.fn(),
      expand: () => {
        setOpen(true);
        props.onChange?.(0);
      },
      collapse: () => setOpen(false),
    }));
    if (!open) return null;
    return props.children ?? null;
  });
  MockBottomSheetModal.displayName = 'MockBottomSheetModal';

  return {
    __esModule: true,
    BottomSheetModal: MockBottomSheetModal,
    BottomSheetView: ({ children }: { children: React.ReactNode }) => children,
    BottomSheetScrollView: ScrollView,
    BottomSheetTextInput: TextInput,
    BottomSheetBackdrop: () => null,
    BottomSheetFooter: ({ children }: { children: React.ReactNode }) => children,
    BottomSheetModalProvider: ({ children }: { children: React.ReactNode }) => children,
    useBottomSheetModal: () => ({
      dismiss: jest.fn(),
      dismissAll: jest.fn(),
    }),
  };
},
{ virtual: true },
);

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
