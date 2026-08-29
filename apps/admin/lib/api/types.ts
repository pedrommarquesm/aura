export type StaffRole = "owner" | "admin" | "moderator";
export type StaffStatus = "invited" | "active" | "deactivated";
export type UserStatus = "active" | "suspended" | "banned";
export type PostStatus = "uploading" | "processing" | "published" | "failed" | "removed";
export type ReportStatus = "open" | "dismissed" | "actioned";

export interface PublicStaff {
  id: string;
  email: string;
  displayName: string | null;
  role: StaffRole;
  status: StaffStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface StaffSignInResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  staff: PublicStaff;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AdminStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    banned: number;
    createdLast7Days: number;
  };
  posts: { published: number; removed: number; createdLast7Days: number };
  likes: { total: number; last7Days: number };
  reports: { open: number; dismissed: number; actioned: number };
  staff: { total: number; active: number };
}

export interface AdminUserRow {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  status: UserStatus;
  aura: number;
  postCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetail extends AdminUserRow {
  country: string | null;
  city: string | null;
  locale: string;
  title: string | null;
  identities: { provider: string; email: string | null; lastLoginAt: string | null }[];
}

export interface AdminPostRow {
  id: string;
  caption: string | null;
  status: PostStatus;
  mediaType: "photo" | "video";
  likeCount: number;
  aura: number;
  createdAt: string;
  publishedAt: string | null;
  thumbUrl: string | null;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    status: UserStatus;
  };
}

export interface ReportRow {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: "user" | "post";
  targetId: string;
  reason: string;
  note: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ActionRow {
  id: string;
  staffId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export class AdminApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}
