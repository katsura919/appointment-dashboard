import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function isAuthenticated(request: NextRequest): boolean {
  // Custom JWT (email/password login)
  const customToken = request.cookies.get("auth-token")?.value
  // NextAuth v5 session (Google OAuth) — dev uses plain name, prod uses __Secure- prefix
  const nextAuthToken =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value

  return !!(customToken || nextAuthToken)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authed = isAuthenticated(request)

  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/workspaces")) && !authed) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if ((pathname === "/login" || pathname === "/register") && authed) {
    return NextResponse.redirect(new URL("/workspaces", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/workspaces/:path*", "/login", "/register"],
}
