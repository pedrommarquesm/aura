export type PendingAvatarSource = {
  uri: string;
  width: number;
  height: number;
};

let pending: PendingAvatarSource | null = null;

export function setPendingAvatarSource(source: PendingAvatarSource) {
  pending = source;
}

export function peekPendingAvatarSource(): PendingAvatarSource | null {
  return pending;
}

export function takePendingAvatarSource(): PendingAvatarSource | null {
  const current = pending;
  pending = null;
  return current;
}

export function clearPendingAvatarSource() {
  pending = null;
}
