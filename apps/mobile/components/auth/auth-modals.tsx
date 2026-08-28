import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignInCard } from './sign-in-card';
import { UsernameCard } from './username-card';
import { likePost, unlikePost } from '@/lib/api';
import { applyLikeResult } from '@/lib/query/feed-cache';
import { useAuthGateStore } from '@/store/auth-gate';
import { useSessionStore } from '@/store/session';

/**
 * Overlay for guest conversion and first-login username claim.
 *
 * Stays mounted above the tabs so the feed does not unmount while the user
 * signs in — the pending like then replays against the same cards.
 */
export function AuthModals() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const open = useAuthGateStore((state) => state.open);
  const reason = useAuthGateStore((state) => state.reason);
  const close = useAuthGateStore((state) => state.close);
  const dismiss = useAuthGateStore((state) => state.dismiss);
  const takePending = useAuthGateStore((state) => state.takePending);

  const status = useSessionStore((state) => state.status);
  const needsUsername = useSessionStore((state) => state.needsUsername);
  const authenticated = status === 'authenticated';

  const showUsername = authenticated && needsUsername;
  const showSignIn = open && !authenticated;
  const visible = showSignIn || showUsername;

  useEffect(() => {
    if (!authenticated || needsUsername) return;

    const pending = takePending();
    close();

    if (!pending) return;

    void (async () => {
      if (pending.type === 'create') {
        router.navigate('/(tabs)/create');
        return;
      }

      try {
        const result =
          pending.type === 'like'
            ? await likePost(pending.postId)
            : await unlikePost(pending.postId);
        applyLikeResult(queryClient, pending.postId, result);
      } catch {
        // The user is signed in; the like can be retried from the card.
      }
    })();
  }, [authenticated, needsUsername, takePending, close, queryClient, router]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={showSignIn ? dismiss : undefined}
    >
      <View className="flex-1 justify-end bg-bg/80" style={{ paddingBottom: insets.bottom + 16 }}>
        {showSignIn ? (
          <Pressable
            className="flex-1"
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel={t('auth.notNow')}
          />
        ) : (
          <View className="flex-1" />
        )}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View className="mx-gutter rounded-xl border border-border bg-surface-elevated p-5">
            {showUsername ? <UsernameCard /> : <SignInCard reason={reason} onDismiss={dismiss} />}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
