import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-gesture-handler', () => require('./jest.gesture-mock'));

// Node already has Intl. The FormatJS polyfills are ESM and only needed on Hermes.
jest.mock('@/lib/i18n/intl', () => ({}));

jest.mock('react-native/Libraries/Interaction/InteractionManager', () => {
  const run = (task: (() => void) | { gen?: () => void }) => {
    if (typeof task === 'function') task();
    else task.gen?.();
    return {
      then: (onfulfilled?: () => void) => Promise.resolve().then(onfulfilled),
      done: () => undefined,
      cancel: () => undefined,
    };
  };
  return { __esModule: true, default: { runAfterInteractions: run }, runAfterInteractions: run };
});

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(async () => undefined),
  isLoaded: jest.fn(() => true),
}));

jest.mock('@expo/vector-icons', () => require('./jest.ionicons-mock'));
jest.mock('@expo/vector-icons/Ionicons', () => require('./jest.ionicons-mock'));
jest.mock('react-native-worklets', () => ({ createSerializable: jest.fn() }));
jest.mock('react-native-reanimated', () => require('./jest.reanimated-mock'));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});

jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({
    play: jest.fn(),
    pause: jest.fn(),
    muted: true,
    loop: true,
    volume: 1,
    audioMixingMode: 'auto',
  }),
  VideoView: 'VideoView',
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  UIImagePickerPreferredAssetRepresentationMode: { Current: 'current', Compatible: 'compatible' },
  VideoExportPreset: { H264_1920x1080: 7, Passthrough: 0 },
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('react-native-compressor', () => ({
  Video: { compress: jest.fn(async (uri: string) => uri) },
  getRealPath: jest.fn(async (uri: string) => uri),
  getVideoMetaData: jest.fn(),
}));

jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('@/lib/haptics', () => ({
  tapFeedback: jest.fn(),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-GB', languageCode: 'en' }],
  useLocales: () => [{ languageTag: 'en-GB', languageCode: 'en' }],
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => false),
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonType: { CONTINUE: 0 },
  AppleAuthenticationButtonStyle: { WHITE: 0 },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => {
  const passthrough = ({ children }: { children?: unknown }) => children ?? null;
  return {
    useRouter: () => ({
      navigate: mockNavigate,
      push: mockPush,
      back: mockBack,
      replace: mockReplace,
    }),
    useIsFocused: () => true,
    usePathname: () => '/',
    useLocalSearchParams: () =>
      (globalThis as { __routerMocks?: { params?: Record<string, unknown> } }).__routerMocks
        ?.params ?? {},
    Stack: Object.assign(passthrough, { Screen: () => null }),
    Tabs: Object.assign(passthrough, { Screen: () => null }),
  };
});

(
  globalThis as {
    __routerMocks?: {
      navigate: jest.Mock;
      push: jest.Mock;
      back: jest.Mock;
      replace: jest.Mock;
      params: Record<string, string | string[] | undefined>;
    };
  }
).__routerMocks = {
  navigate: mockNavigate,
  push: mockPush,
  back: mockBack,
  replace: mockReplace,
  params: {},
};
