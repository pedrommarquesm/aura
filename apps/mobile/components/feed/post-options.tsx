import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, CaptionField, Text } from '@/components/ui';
import { deletePost, messageForError, updatePostCaption, type FeedCard } from '@/lib/api';
import { applyCaptionUpdate, applyPostRemoved } from '@/lib/query/post-cache';
import { useSessionStore } from '@/store/session';
import { colors, withAlpha } from '@/theme/tokens';

const CAPTION_MAX = 2_200;

type Sheet = 'closed' | 'menu' | 'edit' | 'confirmDelete';

export function PostOptions({ post, onDeleted }: { post: FeedCard; onDeleted?: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const userId = useSessionStore((state) => state.user?.id);
  const [sheet, setSheet] = useState<Sheet>('closed');
  const [caption, setCaption] = useState(post.caption ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId || userId !== post.author.id) return null;

  const close = () => {
    if (busy) return;
    setSheet('closed');
    setError(null);
    setCaption(post.caption ?? '');
  };

  const saveCaption = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = caption.trim() || null;
      const updated = await updatePostCaption(post.id, next);
      applyCaptionUpdate(queryClient, post.id, updated.caption);
      setSheet('closed');
    } catch (cause) {
      setError(messageForError(cause));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deletePost(post.id);
      applyPostRemoved(queryClient, post.id, {
        id: post.author.id,
        username: post.author.username,
      });
      setSheet('closed');
      onDeleted?.();
    } catch (cause) {
      setError(messageForError(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('feed.post.a11y.options')}
        hitSlop={10}
        onPress={() => {
          setCaption(post.caption ?? '');
          setError(null);
          setSheet('menu');
        }}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={22}
          color={colors.text.DEFAULT}
          style={{
            textShadowColor: withAlpha(colors.bg, 0.7),
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
          }}
        />
      </Pressable>

      <Modal visible={sheet !== 'closed'} transparent animationType="fade" onRequestClose={close}>
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: withAlpha(colors.bg, 0.8), paddingBottom: insets.bottom + 16 }}
        >
          <Pressable
            className="flex-1"
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t('common.actions.cancel')}
          />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="mx-gutter rounded-xl border border-border bg-surface-elevated p-5">
              {sheet === 'menu' ? (
                <View className="gap-3">
                  <Button
                    label={t('feed.post.actions.edit')}
                    variant="secondary"
                    fullWidth
                    onPress={() => setSheet('edit')}
                  />
                  <Button
                    label={t('feed.post.actions.delete')}
                    variant="danger"
                    fullWidth
                    onPress={() => setSheet('confirmDelete')}
                  />
                  <Button
                    label={t('common.actions.cancel')}
                    variant="ghost"
                    fullWidth
                    onPress={close}
                  />
                </View>
              ) : null}

              {sheet === 'edit' ? (
                <View className="gap-3">
                  <Text variant="title">{t('feed.post.edit.title')}</Text>
                  <CaptionField
                    label={t('create.caption.label')}
                    placeholder={t('create.caption.placeholder')}
                    value={caption}
                    onChangeText={setCaption}
                    maxLength={CAPTION_MAX}
                    numberOfLines={4}
                    autoCapitalize="sentences"
                    autoCorrect
                    autoComplete="off"
                    editable={!busy}
                  />
                  {error ? (
                    <Text variant="caption" tone="danger">
                      {error}
                    </Text>
                  ) : null}
                  <Button
                    label={t('feed.post.actions.save')}
                    glow
                    fullWidth
                    busy={busy}
                    onPress={() => void saveCaption()}
                  />
                  <Button
                    label={t('common.actions.cancel')}
                    variant="ghost"
                    fullWidth
                    disabled={busy}
                    onPress={close}
                  />
                </View>
              ) : null}

              {sheet === 'confirmDelete' ? (
                <View className="gap-3">
                  <Text variant="title">{t('feed.post.delete.title')}</Text>
                  <Text variant="body" tone="secondary">
                    {t('feed.post.delete.body')}
                  </Text>
                  {error ? (
                    <Text variant="caption" tone="danger">
                      {error}
                    </Text>
                  ) : null}
                  <Button
                    label={t('feed.post.delete.confirm')}
                    variant="danger"
                    fullWidth
                    busy={busy}
                    onPress={() => void remove()}
                  />
                  <Button
                    label={t('common.actions.cancel')}
                    variant="ghost"
                    fullWidth
                    disabled={busy}
                    onPress={close}
                  />
                </View>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}
