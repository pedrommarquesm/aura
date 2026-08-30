import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, TextField } from '@/components/ui';
import { messageForError } from '@/lib/api';
import { useAuthGateStore } from '@/store/auth-gate';
import { useIsAuthenticated } from '@/store/session';

const COMMENT_MAX = 500;

export function CommentComposer({
  postId,
  onSubmit,
}: {
  postId: string;
  onSubmit: (body: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const isAuthenticated = useIsAuthenticated();
  const requestAuth = useAuthGateStore((state) => state.requestAuth);
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && !busy;

  const submit = async () => {
    if (!isAuthenticated) {
      requestAuth({ reason: 'comment', pending: { type: 'comment', postId } });
      return;
    }
    if (!canSend) return;

    setError(null);
    setBusy(true);
    try {
      await onSubmit(trimmed);
      setBody('');
    } catch (cause) {
      setError(messageForError(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="border-t border-border bg-bg px-gutter pb-3 pt-3">
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <TextField
            testID="comment-body"
            value={body}
            onChangeText={setBody}
            onFocus={() => {
              if (!isAuthenticated) {
                requestAuth({ reason: 'comment', pending: { type: 'comment', postId } });
              }
            }}
            placeholder={t('post.comments.placeholder')}
            maxLength={COMMENT_MAX}
            autoCapitalize="sentences"
            autoCorrect
            autoComplete="off"
            returnKeyType="send"
            onSubmitEditing={() => void submit()}
            editable={!busy}
            error={error}
          />
        </View>
        <Button
          testID="comment-submit"
          label={t('post.comments.post')}
          size="sm"
          disabled={!canSend && isAuthenticated}
          busy={busy}
          onPress={() => void submit()}
        />
      </View>
    </View>
  );
}
