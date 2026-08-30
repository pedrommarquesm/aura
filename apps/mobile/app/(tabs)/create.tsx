import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
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
import { measureVideoBytes } from '@/lib/media/measure-video';
import { optimizePickedPhoto } from '@/lib/media/optimize-photo';
import { LibraryPermissionError, pickPhotoFromLibrary } from '@/lib/media/pick-photo';
import { pickVideoFromLibrary } from '@/lib/media/pick-video';
import { PHOTO_UPLOAD_MAX_BYTES, normalizePhotoMime } from '@/lib/media/photo-targets';
import {
  VIDEO_MAX_DURATION_MS,
  VIDEO_UPLOAD_MAX_BYTES,
  durationMsFromPicker,
  isAcceptedVideoMime,
  isVideoTooLarge,
  isVideoTooLong,
  normalizeVideoMime,
} from '@/lib/media/video-targets';
import { queryKeys } from '@/lib/query/keys';
import { putPresignedObject } from '@/lib/upload/put-presigned';
import { colors } from '@/theme/tokens';

type Picked = {
  kind: 'photo' | 'video';
  uri: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  durationMs?: number;
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

    // Let the Reanimated press animation finish before presenting UIKit.
    // Presenting PHPicker from an in-flight AnimatedPressable has killed the
    // process on iOS (SpringBoard, no JS redbox).
    await afterInteractions();

    let asset;
    try {
      asset = await pickPhotoFromLibrary();
    } catch (cause) {
      setError(
        cause instanceof LibraryPermissionError
          ? t('create.errors.libraryPermission')
          : t('create.errors.unreadable'),
      );
      return;
    }

    if (!asset) return;
    const mimeType = normalizePhotoMime(asset.mimeType) || 'image/jpeg';
    let byteSize = 0;
    try {
      byteSize = await measureFileBytes(asset.uri, asset.fileSize);
    } catch {
      // Optimizer still has a chance to produce a sized JPEG.
    }

    const draft: Picked = {
      kind: 'photo',
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
          kind: 'photo',
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

  async function chooseVideo() {
    setError(null);
    await afterInteractions();

    let asset;
    try {
      asset = await pickVideoFromLibrary();
    } catch (cause) {
      setError(
        cause instanceof LibraryPermissionError
          ? t('create.errors.libraryPermission')
          : t('create.errors.unreadable'),
      );
      return;
    }

    if (!asset) return;

    const durationMs = durationMsFromPicker(asset.duration);
    if (isVideoTooLong(durationMs)) {
      setError(t('create.errors.tooLong'));
      return;
    }

    const mimeType = normalizeVideoMime(asset.mimeType, asset.uri);
    if (!isAcceptedVideoMime(mimeType)) {
      setError(t('create.errors.unreadable'));
      return;
    }

    let byteSize = 0;
    try {
      byteSize = await measureVideoBytes(asset.uri, asset.fileSize);
    } catch {
      setError(t('create.errors.unreadable'));
      return;
    }

    if (isVideoTooLarge(byteSize)) {
      setError(t('create.errors.tooLarge'));
      return;
    }

    const draft: Picked = {
      kind: 'video',
      uri: asset.uri,
      mimeType,
      byteSize,
      width: asset.width,
      height: asset.height,
      durationMs: durationMs ?? undefined,
    };

    setPicked(draft);
    setPhase('idle');
    setProgress(0);
    optimizeRef.current = Promise.resolve(draft);
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

      const maxBytes = ready.kind === 'video' ? VIDEO_UPLOAD_MAX_BYTES : PHOTO_UPLOAD_MAX_BYTES;
      if (!ready.byteSize || ready.byteSize > maxBytes) {
        setPhase('idle');
        setError(t('create.errors.tooLarge'));
        return;
      }

      if (
        ready.kind === 'video' &&
        (ready.durationMs == null || ready.durationMs > VIDEO_MAX_DURATION_MS)
      ) {
        setPhase('idle');
        setError(t('create.errors.tooLong'));
        return;
      }

      setPicked(ready);
      setPhase('uploading');

      const declared = await createUpload({
        contentType: ready.mimeType,
        byteSize: ready.byteSize,
        width: ready.width,
        height: ready.height,
        durationMs: ready.kind === 'video' ? ready.durationMs : undefined,
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

      const deadline = Date.now() + (ready.kind === 'video' ? 180_000 : 90_000);
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
              {picked.kind === 'photo' ? (
                <Image source={{ uri: picked.uri }} contentFit="cover" style={{ flex: 1 }} />
              ) : (
                <View className="flex-1 items-center justify-center gap-2 px-6">
                  <Ionicons name="play-circle-outline" size={48} color={colors.aura.bright} />
                  <Text variant="body">{t('create.videoPicked')}</Text>
                  {picked.durationMs ? (
                    <Text variant="caption" tone="muted">
                      {t('create.videoDuration', {
                        seconds: Math.max(1, Math.round(picked.durationMs / 1000)),
                      })}
                    </Text>
                  ) : null}
                </View>
              )}
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
              label={t('create.actions.chooseVideo')}
              icon={<Ionicons name="videocam-outline" size={18} color={colors.text.DEFAULT} />}
              fullWidth
              onPress={() => void chooseVideo()}
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
