import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarCropEditor, type AvatarCropHandle } from '@/components/profile/avatar-crop-editor';
import { Button, Text } from '@/components/ui';
import { completeAvatarUpload, createAvatarUpload, messageForError } from '@/lib/api';
import { cropAvatarPhoto } from '@/lib/media/crop-avatar';
import { clearPendingAvatarSource, peekPendingAvatarSource } from '@/lib/media/pending-avatar';
import { applyAvatarUrl } from '@/lib/query/avatar-cache';
import { putPresignedObject } from '@/lib/upload/put-presigned';
import { useSessionStore } from '@/store/session';
import { colors } from '@/theme/tokens';

function readPendingSource() {
  const pending = peekPendingAvatarSource();
  if (!pending || pending.width <= 0 || pending.height <= 0) return null;
  return pending;
}

export default function AvatarEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const setUser = useSessionStore((state) => state.setUser);

  const [source] = useState(readPendingSource);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cropRef = useRef<AvatarCropHandle>(null);

  async function confirm() {
    if (!source || busy) return;
    const rect = cropRef.current?.crop();
    if (!rect) return;

    setBusy(true);
    setError(null);

    try {
      const cropped = await cropAvatarPhoto({ uri: source.uri, ...rect });
      const declared = await createAvatarUpload({
        contentType: cropped.mimeType,
        byteSize: cropped.byteSize,
        width: cropped.width,
        height: cropped.height,
      });
      await putPresignedObject(declared.uploadUrl, declared.uploadHeaders, {
        uri: cropped.uri,
        mimeType: cropped.mimeType,
      });
      const { user } = await completeAvatarUpload(declared.uploadId);
      clearPendingAvatarSource();
      setUser(user);
      if (user.avatarUrl) {
        applyAvatarUrl(queryClient, {
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
        });
      }
      router.back();
    } catch (cause) {
      setError(
        (cause as { message?: string }).message === 'too_large'
          ? t('create.errors.tooLarge')
          : (cause as { message?: string }).message === 'unreadable'
            ? t('create.errors.unreadable')
            : messageForError(cause),
      );
      setBusy(false);
    }
  }

  function cancel() {
    clearPendingAvatarSource();
    router.back();
  }

  if (!source) {
    return (
      <View className="flex-1 bg-bg items-start justify-center gap-3 px-gutter" style={{ paddingTop: insets.top }}>
        <Text variant="title">{t('profile.avatar.title')}</Text>
        <Button label={t('profile.avatar.cancel')} onPress={cancel} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-gutter py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.avatar.cancel')}
          disabled={busy}
          hitSlop={12}
          onPress={cancel}
        >
          <Text variant="label" tone="secondary">
            {t('profile.avatar.cancel')}
          </Text>
        </Pressable>
        <Text variant="label">{t('profile.avatar.title')}</Text>
        <View className="w-16" />
      </View>

      <AvatarCropEditor
        ref={cropRef}
        uri={source.uri}
        imageWidth={source.width}
        imageHeight={source.height}
      />

      <View className="gap-3 px-gutter pb-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Text variant="caption" tone="muted" className="text-center">
          {t('profile.avatar.hint')}
        </Text>
        {error ? (
          <Text variant="caption" className="text-center" style={{ color: colors.danger }}>
            {error}
          </Text>
        ) : null}
        <Button
          label={t('profile.avatar.use')}
          glow
          fullWidth
          busy={busy}
          onPress={() => void confirm()}
        />
      </View>
    </View>
  );
}
