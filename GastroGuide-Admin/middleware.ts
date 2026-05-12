import { NextRequest, NextResponse } from "next/server";

import { ADMIN_ACCESS_TOKEN_COOKIE } from "@/lib/api/config";
import { PROTECTED_PATH_PREFIXES } from "@/lib/auth/middleware-config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATH_PREFIXES.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/restaurants/:path*",
    "/menu/:path*",
    "/offers/:path*",
    "/reviews/:path*",
    "/users/:path*",
    "/categories/:path*",
    "/ai/:path*",
    "/system/:path*",
  ],
};
