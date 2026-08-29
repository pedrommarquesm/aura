import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";
  const isPublic =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    isLogin;

  if (request.auth?.error === "RefreshError") {
    const response = NextResponse.redirect(new URL("/login?error=Session", request.nextUrl));
    return response;
  }

  if (!request.auth && !isPublic) {
    const login = new URL("/login", request.nextUrl);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (request.auth && isLogin) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
