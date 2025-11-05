import { auth } from "@clerk/nextjs/server";

/**
 * @file lib/auth/is-admin.ts
 * @description 서버 사이드에서 관리자 권한 확인 유틸리티
 * 
 * Clerk privateMetadata.role === "admin" 체크
 */

/**
 * 현재 사용자가 관리자인지 확인
 */
export async function isAdmin(): Promise<boolean> {
  const { userId, sessionClaims } = await auth();
  
  if (!userId) return false;
  
  const role = (sessionClaims as any)?.privateMetadata?.role;
  return role === "admin";
}

/**
 * 관리자가 아니면 에러를 throw
 * Server Action에서 사용
 */
export async function assertAdminOrThrow(): Promise<void> {
  console.group("🔐 assertAdminOrThrow");
  
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims as any)?.privateMetadata?.role;
  
  console.log("userId:", userId);
  console.log("role:", role);
  
  if (!userId || role !== "admin") {
    console.log("❌ Not admin - throwing error");
    console.groupEnd();
    throw new Error("관리자 권한이 필요합니다.");
  }
  
  console.log("✅ Admin verified");
  console.groupEnd();
}

