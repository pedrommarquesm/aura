import NextAuth, { type Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";

import { staffRefresh, staffSignInWithGoogle } from "@/lib/api/staff-auth";
import type { PublicStaff } from "@/lib/api/types";

const REFRESH_SKEW_MS = 60_000;

type StaffJwt = JWT & {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  staff?: PublicStaff;
  error?: string;
};

/**
 * NextAuth owns the browser session cookie only. It has no user table.
 * Identity and authorization stay on the API (`staff`, not `users`).
 *
 * Google is V0. A later Credentials / email provider can call a new
 * `/v1/staff/auth/email` without changing this session shape.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, account }) {
      const staffToken = token as StaffJwt;

      if (account?.id_token) {
        const issued = await staffSignInWithGoogle(account.id_token);
        staffToken.accessToken = issued.accessToken;
        staffToken.refreshToken = issued.refreshToken;
        staffToken.accessTokenExpires = Date.now() + issued.expiresIn * 1000;
        staffToken.staff = issued.staff;
        delete staffToken.error;
        return staffToken;
      }

      if (
        staffToken.refreshToken &&
        typeof staffToken.accessTokenExpires === "number" &&
        Date.now() > staffToken.accessTokenExpires - REFRESH_SKEW_MS
      ) {
        try {
          const issued = await staffRefresh(staffToken.refreshToken);
          staffToken.accessToken = issued.accessToken;
          staffToken.refreshToken = issued.refreshToken;
          staffToken.accessTokenExpires = Date.now() + issued.expiresIn * 1000;
          delete staffToken.error;
        } catch {
          staffToken.error = "RefreshError";
          delete staffToken.accessToken;
          delete staffToken.refreshToken;
        }
      }

      return staffToken;
    },
    async session({ session, token }) {
      const staffToken = token as StaffJwt;
      const next: Session = session;
      next.accessToken = staffToken.accessToken;
      next.staff = staffToken.staff;
      next.error = staffToken.error;
      if (staffToken.staff) {
        next.user = {
          ...session.user,
          email: staffToken.staff.email,
          name: staffToken.staff.displayName ?? staffToken.staff.email,
        };
      }
      return next;
    },
  },
});
