import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

/**
 * Clerk + Supabase 네이티브 통합 클라이언트 (Server Component용)
 *
 * 2025년 4월부터 권장되는 방식:
 * - JWT 템플릿 불필요
 * - Clerk 토큰을 Supabase가 자동 검증
 * - auth().getToken()으로 현재 세션 토큰 사용
 * - 인증이 없는 경우(공개 데이터)에도 안전하게 동작
 *
 * @example
 * ```tsx
 * // Server Component
 * import { createClerkSupabaseClient } from '@/lib/supabase/server';
 *
 * export default async function MyPage() {
 *   const supabase = createClerkSupabaseClient();
 *   const { data } = await supabase.from('table').select('*');
 *   return <div>...</div>;
 * }
 * ```
 */
export function createClerkSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseKey, {
    async accessToken() {
      try {
        // 인증 정보가 있으면 토큰 반환
        const authObj = await auth();
        const token = await authObj.getToken();
        return token;
      } catch (error) {
        // 인증이 없거나 에러 발생 시 null 반환 (공개 데이터 조회)
        // 이렇게 하면 공개 데이터를 조회할 때도 안전하게 동작
        console.log("🔓 [createClerkSupabaseClient] No auth token, using anonymous access");
        return null;
      }
    },
  });
}
