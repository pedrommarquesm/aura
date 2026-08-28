import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Text, TextField } from '@/components/ui';
import { ApiError, claimUsername } from '@/lib/api';
import { messageForError } from '@/lib/api/error-message';
import { normalizeUsername, usernameProblem } from '@/lib/auth/username';
import { useSessionStore } from '@/store/session';

export function UsernameCard() {
  const { t } = useTranslation();
  const finishUsernameClaim = useSessionStore((state) => state.finishUsernameClaim);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const problem = value.length > 0 ? usernameProblem(value) : null;
  const error =
    problem === 'invalid'
      ? t('auth.username.invalid')
      : problem === 'reserved'
        ? t('auth.username.reserved')
        : serverError;

  const submit = async () => {
    const username = normalizeUsername(value);
    const nextProblem = usernameProblem(username);
    if (nextProblem) return;

    setBusy(true);
    setServerError(null);

    try {
      const { user } = await claimUsername(username);
      await finishUsernameClaim(user);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setServerError(t('auth.username.taken'));
      } else {
        setServerError(messageForError(caught));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-3">
      <Text variant="title">{t('auth.username.title')}</Text>
      <Text variant="body" tone="secondary">
        {t('auth.username.body')}
      </Text>

      <TextField
        value={value}
        onChangeText={(next) => {
          setValue(next);
          setServerError(null);
        }}
        placeholder={t('auth.username.placeholder')}
        maxLength={30}
        editable={!busy}
        error={value.length > 0 || serverError ? error : null}
        onSubmitEditing={() => void submit()}
        returnKeyType="done"
      />

      <Button
        label={t('auth.username.submit')}
        glow
        fullWidth
        busy={busy}
        disabled={usernameProblem(normalizeUsername(value)) !== null}
        onPress={() => void submit()}
      />
    </View>
  );
}
