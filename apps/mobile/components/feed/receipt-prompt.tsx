import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';

import { Button, Text, TextField } from '@/components/ui';
import { messageForError, setVoteReceipt, type SetReceiptResult } from '@/lib/api';
import { RECEIPT_MAX_LENGTH } from '@/lib/vote';
import { colors, withAlpha } from '@/theme/tokens';

/**
 * "Drop a receipt..." — shown once, right after a successful nonzero vote.
 * Optional: skipping still leaves the vote in place (Q3/Q4). A receipt can be
 * added later exactly once if skipped here, from the ledger sheet.
 */
export function ReceiptPrompt({
  postId,
  onDone,
}: {
  postId: string;
  onDone: (result?: SetReceiptResult) => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onDone();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await setVoteReceipt(postId, trimmed);
      onDone(result);
    } catch (cause) {
      setError(messageForError(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOut.duration(160)}>
      <View
        className="gap-2 rounded-sm border border-border px-3 py-2.5"
        style={{ backgroundColor: withAlpha(colors.bg, 0.85) }}
      >
        <TextField
          value={text}
          onChangeText={setText}
          placeholder={t('feed.vote.receipt.placeholder')}
          maxLength={RECEIPT_MAX_LENGTH}
          autoCapitalize="sentences"
          autoCorrect
          autoComplete="off"
          returnKeyType="send"
          onSubmitEditing={() => void submit()}
          editable={!busy}
          error={error}
          style={{ height: 40 }}
        />
        <View className="flex-row items-center justify-end gap-2">
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            disabled={busy}
            onPress={() => onDone()}
          >
            <Text variant="label" tone="secondary">
              {t('feed.vote.receipt.skip')}
            </Text>
          </Pressable>
          <Button
            label={t('feed.vote.receipt.post')}
            size="sm"
            busy={busy}
            onPress={() => void submit()}
          />
        </View>
      </View>
    </Animated.View>
  );
}
