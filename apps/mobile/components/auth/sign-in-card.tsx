import * as AppleAuthentication from 'expo-apple-authentication';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text, TextField } from '@/components/ui';
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
      | 'auth.reasons.comment.title'
      | 'auth.reasons.generic.title';
    body:
      | 'auth.reasons.like.body'
      | 'auth.reasons.create.body'
      | 'auth.reasons.profile.body'
      | 'auth.reasons.comment.body'
      | 'auth.reasons.generic.body';
  }
> = {
  like: { title: 'auth.reasons.like.title', body: 'auth.reasons.like.body' },
  create: { title: 'auth.reasons.create.title', body: 'auth.reasons.create.body' },
  profile: { title: 'auth.reasons.profile.title', body: 'auth.reasons.profile.body' },
  comment: { title: 'auth.reasons.comment.title', body: 'auth.reasons.comment.body' },
  generic: { title: 'auth.reasons.generic.title', body: 'auth.reasons.generic.body' },
};

export function SignInCard({ reason, onDismiss }: { reason: AuthReason; onDismiss?: () => void }) {
  const { t } = useTranslation();
  const { signIn, signInPassword, registerPassword, busy, errorMessage, notConfigured } =
    useSignIn();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'register'>('signIn');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    void isAppleAvailable().then(setAppleAvailable);
  }, []);

  const googleReady = isGoogleConfigured();
  const googleDevBuild = googleNeedsDevelopmentBuild();
  const locked = busy !== null;

  const submitPassword = () => {
    if (mode === 'signIn') {
      if (!identifier.trim() || password.length < 8) return;
      void signInPassword(identifier, password);
      return;
    }
    if (!email.trim() || !username.trim() || password.length < 8) return;
    void registerPassword({ email, username, password });
  };

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
          disabled={locked || !googleReady}
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

      <Text variant="caption" tone="muted" className="pt-2 text-center">
        {t('auth.password.or')}
      </Text>

      {mode === 'signIn' ? (
        <View className="gap-3">
          <TextField
            label={t('auth.password.identifier')}
            placeholder={t('auth.password.identifier')}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            editable={!locked}
          />
          <TextField
            label={t('auth.password.password')}
            placeholder={t('auth.password.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            editable={!locked}
          />
          <Button
            label={t('auth.password.signIn')}
            glow
            fullWidth
            busy={busy === 'password'}
            disabled={locked || !identifier.trim() || password.length < 8}
            onPress={submitPassword}
          />
          <Button
            label={t('auth.password.toggleCreate')}
            variant="ghost"
            fullWidth
            disabled={locked}
            onPress={() => setMode('register')}
          />
        </View>
      ) : (
        <View className="gap-3">
          <TextField
            label={t('auth.username.placeholder')}
            placeholder={t('auth.username.placeholder')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            editable={!locked}
          />
          <TextField
            label={t('auth.password.email')}
            placeholder={t('auth.password.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            editable={!locked}
          />
          <TextField
            label={t('auth.password.password')}
            placeholder={t('auth.password.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            editable={!locked}
          />
          <Button
            label={t('auth.password.create')}
            glow
            fullWidth
            busy={busy === 'register'}
            disabled={locked || !email.trim() || !username.trim() || password.length < 8}
            onPress={submitPassword}
          />
          <Button
            label={t('auth.password.toggleSignIn')}
            variant="ghost"
            fullWidth
            disabled={locked}
            onPress={() => setMode('signIn')}
          />
        </View>
      )}

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
          disabled={locked}
          onPress={onDismiss}
        />
      ) : null}
    </View>
  );
}
