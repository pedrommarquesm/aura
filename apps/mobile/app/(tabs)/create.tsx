import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InteractionManager, Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout';
import { Button, Text, TextField } from '@/components/ui';
import { messageForError } from '@/lib/api';
import { completeUpload, createUpload, fetchPost, refreshUpload } from '@/lib/api/posts';
import { measureFileBytes } from '@/lib/media/measure-file';
import { optimizePickedPhoto } from '@/lib/media/optimize-photo';
import { PHOTO_UPLOAD_MAX_BYTES, normalizePhotoMime } from '@/lib/media/photo-targets';
import { queryKeys } from '@/lib/query/keys';
import { putPresignedObject } from '@/lib/upload/put-presigned';
import { colors } from '@/theme/tokens';

type Picked = {
  uri: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
};

type Phase = 'idle' | 'preparing' | 'uploading' | 'processing' | 'done';

function afterInteractions(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      const error = new Error('Aborted');
      error.name = 'AbortError';
      reject(error);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export default function CreateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [picked, setPicked] = useState<Picked | null>(null);
  const [caption, setCaption] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const optimizeRef = useRef<Promise<Picked> | null>(null);

  const busy = phase === 'preparing' || phase === 'uploading' || phase === 'processing';

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    optimizeRef.current = null;
    setPicked(null);
    setCaption('');
    setPhase('idle');
    setProgress(0);
    setError(null);
  }

  async function choosePhoto() {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('create.errors.libraryPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      exif: false,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const mimeType = normalizePhotoMime(asset.mimeType) || 'image/jpeg';
    let byteSize = 0;
    try {
      byteSize = await measureFileBytes(asset.uri, asset.fileSize);
    } catch {
      // Optimizer still has a chance to produce a sized JPEG.
    }

    const draft: Picked = {
      uri: asset.uri,
      mimeType,
      byteSize,
      width: asset.width,
      height: asset.height,
    };

    setPicked(draft);
    setPhase('idle');
    setProgress(0);

    const job = afterInteractions()
      .then(() => optimizePickedPhoto(draft))
      .then((optimized) => {
        const next: Picked = {
          uri: optimized.uri,
          mimeType: optimized.mimeType,
          byteSize: optimized.byteSize,
          width: optimized.width,
          height: optimized.height,
        };
        setPicked(next);
        return next;
      })
      .catch((cause) => {
        if (draft.byteSize > 0) return draft;
        throw cause;
      });

    optimizeRef.current = job;
    void job.catch((cause) => {
      if (optimizeRef.current !== job) return;
      setError(
        (cause as { message?: string }).message === 'unreadable'
          ? t('create.errors.unreadable')
          : t('create.errors.optimize'),
      );
    });
  }

  async function publish() {
    if (!picked || busy) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setError(null);
    setPhase('preparing');
    setProgress(0);

    try {
      const ready = await (optimizeRef.current ?? Promise.resolve(picked));
      if (abort.signal.aborted) return;

      if (!ready.byteSize || ready.byteSize > PHOTO_UPLOAD_MAX_BYTES) {
        setPhase('idle');
        setError(t('create.errors.tooLarge'));
        return;
      }

      setPicked(ready);
      setPhase('uploading');

      const declared = await createUpload({
        contentType: ready.mimeType,
        byteSize: ready.byteSize,
        width: ready.width,
        height: ready.height,
      });

      const put = async (uploadUrl: string, headers: Record<string, string>) => {
        await putPresignedObject(
          uploadUrl,
          headers,
          { uri: ready.uri, mimeType: ready.mimeType },
          (fraction) => setProgress(fraction),
          abort.signal,
        );
      };

      try {
        await put(declared.uploadUrl, declared.uploadHeaders);
      } catch (cause) {
        if (abort.signal.aborted) throw cause;
        const retry = await refreshUpload(declared.postId);
        await put(retry.uploadUrl, retry.uploadHeaders);
      }

      setPhase('processing');
      await completeUpload(declared.postId, caption.trim() || undefined);

      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        const post = await fetchPost(declared.postId);
        if (post.status === 'published') {
          setPhase('done');
          await queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
          router.navigate('/(tabs)');
          reset();
          return;
        }
        if (post.status === 'failed') {
          throw new Error('processing_failed');
        }
        await sleep(2_000, abort.signal);
      }

      // Still processing: the post will land on the feed when the worker
      // finishes. Don't hold the user on this screen.
      await queryClient.invalidateQueries({ queryKey: queryKeys.feed.all });
      router.navigate('/(tabs)');
      reset();
    } catch (cause) {
      if ((cause as { name?: string }).name === 'AbortError') return;
      setPhase('idle');
      setProgress(0);
      setError(
        (cause as { message?: string }).message === 'processing_failed'
          ? t('create.errors.processing')
          : (cause as { message?: string }).message === 'unreadable'
            ? t('create.errors.unreadable')
            : messageForError(cause),
      );
    }
  }

  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="pb-8"
        className="flex-1"
      >
        <Text variant="title" className="pt-4">
          {t('create.title')}
        </Text>
        <Text variant="body" tone="secondary" className="pt-2">
          {t('create.subtitle')}
        </Text>

        {picked ? (
          <View className="pt-6">
            <View className="overflow-hidden rounded-xl bg-surface" style={{ aspectRatio: 0.8 }}>
              <Image source={{ uri: picked.uri }} contentFit="cover" style={{ flex: 1 }} />
            </View>

            <Pressable onPress={reset} disabled={busy} className="self-start pt-3">
              <Text variant="caption" tone="aura">
                {t('create.actions.chooseDifferent')}
              </Text>
            </Pressable>

            <View className="pt-4">
              <TextField
                label={t('create.caption.label')}
                placeholder={t('create.caption.placeholder')}
                value={caption}
                onChangeText={setCaption}
                maxLength={2200}
                autoCapitalize="sentences"
                autoCorrect
                autoComplete="off"
                editable={!busy}
              />
            </View>

            {phase === 'preparing' ? (
              <Text variant="caption" tone="muted" className="pt-3">
                {t('create.progress.preparing')}
              </Text>
            ) : null}
            {phase === 'uploading' ? (
              <Text variant="caption" tone="muted" className="pt-3">
                {t('create.progress.uploading', { percent: Math.round(progress * 100) })}
              </Text>
            ) : null}
            {phase === 'processing' ? (
              <Text variant="caption" tone="muted" className="pt-3">
                {t('create.progress.processing')}
              </Text>
            ) : null}

            <View className="flex-row gap-3 pt-5">
              <Button
                label={t('common.actions.cancel')}
                variant="secondary"
                fullWidth
                disabled={phase === 'processing'}
                onPress={() => {
                  abortRef.current?.abort();
                  reset();
                }}
              />
              <Button
                label={t('create.actions.post')}
                glow
                fullWidth
                busy={busy}
                onPress={() => void publish()}
              />
            </View>
          </View>
        ) : (
          <View className="gap-3 pt-8">
            <Button
              label={t('create.actions.choosePhoto')}
              icon={<Ionicons name="images-outline" size={18} color={colors.text.DEFAULT} />}
              glow
              fullWidth
              onPress={() => void choosePhoto()}
            />
            <Button
              label={t('create.actions.takePhoto')}
              variant="secondary"
              icon={<Ionicons name="camera-outline" size={18} color={colors.text.muted} />}
              fullWidth
              disabled
              accessibilityHint={t('create.actions.takePhotoHint')}
            />
            <Text variant="caption" tone="muted">
              {t('create.actions.takePhotoHint')}
            </Text>
          </View>
        )}

        {error ? (
          <Text variant="caption" tone="danger" className="pt-4">
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
