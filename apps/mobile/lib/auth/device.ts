import Constants from 'expo-constants';
import { Platform } from 'react-native';

import i18n from '@/lib/i18n/i18n';

export type DevicePayload = {
  name?: string;
  platform: 'ios' | 'android' | 'web';
  appVersion?: string;
};

export function devicePayload(): DevicePayload {
  const platform: DevicePayload['platform'] =
    Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';

  return {
    platform,
    appVersion: Constants.expoConfig?.version,
  };
}

export function signInLocale(): string {
  return i18n.language;
}
