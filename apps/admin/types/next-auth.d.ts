import type { PublicStaff } from "@/lib/api/types";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    staff?: PublicStaff;
    error?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    staff?: PublicStaff;
    error?: string;
  }
}
