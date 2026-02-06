import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest, context: any) {
  return auth((request) => {
    const { pathname } = request.nextUrl;

    // Protected routes that require authentication
    const protectedPaths = ["/dashboard", "/api/user"];

    const isProtectedPath = protectedPaths.some((path) =>
      pathname.startsWith(path),
    );

    // Allow public API routes
    const publicApiPaths = ["/api/modules"];
    const isPublicApi = publicApiPaths.some((path) =>
      pathname.startsWith(path),
    );

    if (isProtectedPath && !isPublicApi && !request.auth) {
      // Redirect to sign-in page if not authenticated
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  })(request, context);
}

export const config = {
  matcher: [
    // Match all paths except static files and images
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
