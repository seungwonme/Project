import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const isAdmin = (sessionClaims as any)?.privateMetadata?.role === "admin";
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

  console.log("🔐 Middleware Check:", {
    path: req.nextUrl.pathname,
    userId: userId ? "authenticated" : "anonymous",
    isAdmin,
    isAdminRoute,
  });

  // Admin route 보호: 관리자가 아니면 홈으로 리다이렉트
  if (isAdminRoute && (!userId || !isAdmin)) {
    console.log("❌ Admin access denied, redirecting to /");
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
