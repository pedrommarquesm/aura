import type { User } from '../db/schema';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  aura: number;
  title: string | null;
  locale: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    aura: user.aura,
    title: user.title,
    locale: user.locale,
  };
}
