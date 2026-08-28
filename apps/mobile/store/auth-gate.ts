import { create } from 'zustand';

export type AuthReason = 'like' | 'create' | 'profile' | 'generic';

export type PendingAction =
  { type: 'like'; postId: string } | { type: 'unlike'; postId: string } | { type: 'create' };

type AuthGateState = {
  open: boolean;
  reason: AuthReason;
  pending: PendingAction | null;
  requestAuth: (input?: { reason?: AuthReason; pending?: PendingAction | null }) => void;
  close: () => void;
  dismiss: () => void;
  takePending: () => PendingAction | null;
};

/**
 * Guest browsing is the default. The first Aura action (like, post) opens this
 * gate; after Apple/Google (+ username if needed) the pending action replays.
 */
export const useAuthGateStore = create<AuthGateState>((set, get) => ({
  open: false,
  reason: 'generic',
  pending: null,

  requestAuth(input = {}) {
    set({
      open: true,
      reason: input.reason ?? 'generic',
      pending: input.pending ?? null,
    });
  },

  close() {
    set({ open: false });
  },

  dismiss() {
    set({ open: false, pending: null });
  },

  takePending() {
    const pending = get().pending;
    set({ pending: null });
    return pending;
  },
}));
