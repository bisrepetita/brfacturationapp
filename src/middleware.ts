import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer les paths publics et les assets
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Vérifier le cookie de session Firebase
  // Note: Firebase Auth côté client — on redirige si pas de cookie session
  // La vraie protection est dans les layouts avec useAuth
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
