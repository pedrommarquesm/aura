import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout';
import { Button, Text, TextField } from '@/components/ui';
import { messageForError } from '@/lib/api';
import { completeUpload, createUpload, fetchPost, refreshUpload } from '@/lib/api/posts';
import { queryKeys } from '@/lib/query/keys';
import { putPresignedObject } from '@/lib/upload/put-presigned';
import { colors } from '@/theme/tokens';

type Picked = {
  uri: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  durationMs?: number;
  kind: 'photo' | 'video';
};

type Phase = 'idle' | 'uploading' | 'processing' | 'done';

function durationMsFromPicker(value: number | null | undefined): number | undefined {
  if (value == null) return undefined;
  // iOS has historically reported seconds; Android milliseconds. Anything that
  // could be a duration in seconds (our cap is 60) is treated as seconds.
  return value <= 180 ? Math.round(value * 1000) : Math.round(value);
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

  const busy = phase === 'uploading' || phase === 'processing';

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    setPicked(null);
    setCaption('');
    setPhase('idle');
    setProgress(0);
    setError(null);
  }

  async function pick(from: 'library' | 'camera') {
    setError(null);

    if (from === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError(t('create.errors.cameraPermission'));
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(t('create.errors.libraryPermission'));
        return;
      }
    }

    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images', 'videos'],
            quality: 0.9,
            videoMaxDuration: 60,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            quality: 0.9,
            videoMaxDuration: 60,
          });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const kind = asset.type === 'video' ? 'video' : 'photo';
    const mimeType =
      asset.mimeType ?? (kind === 'video' ? 'video/mp4' : 'image/jpeg');
    const byteSize = asset.fileSize ?? 0;

    if (!byteSize) {
      setError(t('create.errors.unreadable'));
      return;
    }

    setPicked({
      uri: asset.uri,
      mimeType,
      byteSize,
      width: asset.width,
      height: asset.height,
      durationMs: durationMsFromPicker(asset.duration),
      kind,
    });
    setPhase('idle');
    setProgress(0);
  }

  async function publish() {
    if (!picked || busy) return;

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setError(null);
    setPhase('uploading');
    setProgress(0);

    try {
      const declared = await createUpload({
        contentType: picked.mimeType,
        byteSize: picked.byteSize,
        width: picked.width,
        height: picked.height,
        durationMs: picked.durationMs,
      });

      const put = async (uploadUrl: string, headers: Record<string, string>) => {
        await putPresignedObject(
          uploadUrl,
          headers,
          { uri: picked.uri, mimeType: picked.mimeType },
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
                <View className="flex-1 items-center justify-center gap-2">
                  <Ionicons name="play" size={36} color={colors.text.DEFAULT} />
                  <Text variant="caption" tone="secondary">
                    {t('create.videoPicked')}
                  </Text>
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
              label={t('create.actions.takePhoto')}
              icon={<Ionicons name="camera-outline" size={18} color={colors.text.DEFAULT} />}
              glow
              fullWidth
              onPress={() => void pick('camera')}
            />
            <Button
              label={t('create.actions.chooseFromLibrary')}
              variant="secondary"
              icon={<Ionicons name="images-outline" size={18} color={colors.text.DEFAULT} />}
              fullWidth
              onPress={() => void pick('library')}
            />
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
