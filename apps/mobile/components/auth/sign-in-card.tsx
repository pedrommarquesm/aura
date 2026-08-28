import * as AppleAuthentication from 'expo-apple-authentication';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { isAppleAvailable } from '@/lib/auth/apple';
import { googleNeedsDevelopmentBuild, isGoogleConfigured } from '@/lib/auth/google';
import { useSignIn } from '@/lib/auth/use-sign-in';
import type { AuthReason } from '@/store/auth-gate';
import { colors, radius } from '@/theme/tokens';

const REASON_COPY: Record<
  AuthReason,
  {
    title:
      | 'auth.reasons.like.title'
      | 'auth.reasons.create.title'
      | 'auth.reasons.profile.title'
      | 'auth.reasons.generic.title';
    body:
      | 'auth.reasons.like.body'
      | 'auth.reasons.create.body'
      | 'auth.reasons.profile.body'
      | 'auth.reasons.generic.body';
  }
> = {
  like: { title: 'auth.reasons.like.title', body: 'auth.reasons.like.body' },
  create: { title: 'auth.reasons.create.title', body: 'auth.reasons.create.body' },
  profile: { title: 'auth.reasons.profile.title', body: 'auth.reasons.profile.body' },
  generic: { title: 'auth.reasons.generic.title', body: 'auth.reasons.generic.body' },
};

export function SignInCard({ reason, onDismiss }: { reason: AuthReason; onDismiss?: () => void }) {
  const { t } = useTranslation();
  const { signIn, busy, errorMessage, notConfigured } = useSignIn();
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    void isAppleAvailable().then(setAppleAvailable);
  }, []);

  const googleReady = isGoogleConfigured();
  const googleDevBuild = googleNeedsDevelopmentBuild();

  return (
    <View className="gap-3">
      <Text variant="title">{t(REASON_COPY[reason].title)}</Text>
      <Text variant="body" tone="secondary">
        {t(REASON_COPY[reason].body)}
      </Text>

      <View className="gap-3 pt-4">
        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={radius.md}
            style={{ width: '100%', height: 48 }}
            onPress={() => void signIn('apple')}
          />
        ) : null}

        <Button
          label={t('auth.providers.google')}
          variant="secondary"
          fullWidth
          busy={busy === 'google'}
          disabled={busy !== null || !googleReady}
          icon={<Ionicons name="logo-google" size={18} color={colors.text.DEFAULT} />}
          onPress={() => void signIn('google')}
        />
      </View>

      {googleDevBuild ? (
        <Text variant="caption" tone="muted">
          {t('auth.unavailable.googleDevBuild')}
        </Text>
      ) : notConfigured === 'google' || !googleReady ? (
        <Text variant="caption" tone="muted">
          {t('auth.unavailable.google')}
        </Text>
      ) : null}

      {notConfigured === 'apple' ? (
        <Text variant="caption" tone="muted">
          {t('auth.unavailable.apple')}
        </Text>
      ) : null}

      {errorMessage ? (
        <Text variant="caption" tone="danger">
          {errorMessage}
        </Text>
      ) : null}

      {onDismiss ? (
        <Button
          label={t('auth.notNow')}
          variant="ghost"
          fullWidth
          disabled={busy !== null}
          onPress={onDismiss}
        />
      ) : null}
    </View>
  );
}
