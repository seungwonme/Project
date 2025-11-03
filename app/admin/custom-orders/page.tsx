import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { assertAdminOrThrow } from "@/lib/auth/is-admin";
import type { CustomOrder, CustomOrderStatus } from "@/types/custom-order";
import { CustomOrderTable } from "@/components/admin/custom-order-table";

/**
 * @file app/admin/custom-orders/page.tsx
 * @description 관리자 주문제작 관리 대시보드
 * 
 * 주요 기능:
 * - 모든 주문제작 의뢰 조회
 * - 상태별 필터링 (탭)
 * - 주문 상세 보기 및 관리 (모달)
 */

interface PageProps {
  searchParams: Promise<{ status?: CustomOrderStatus }>;
}

export default async function AdminCustomOrdersPage(props: PageProps) {
  console.group("📊 admin:custom-orders:page");

  try {
    await assertAdminOrThrow();

    const searchParams = await props.searchParams;
    const statusFilter = searchParams.status;

    console.log("Status filter:", statusFilter);

    const supabase = getServiceRoleClient();

    // 주문 목록 조회
    let query = supabase
      .from("custom_orders")
      .select("*")
      .order("created_at", { ascending: false });

    // 상태 필터링
    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    console.log("Fetching custom orders...");
    const { data: orders, error } = await query;

    if (error) {
      console.error("❌ Fetch error:", error);
      throw new Error("주문 목록을 불러오는데 실패했습니다.");
    }

    console.log("✅ Fetched", orders?.length || 0, "orders");
    console.groupEnd();

    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">주문제작 관리</h1>

        <CustomOrderTable 
          orders={orders as CustomOrder[]} 
          currentStatus={statusFilter}
        />
      </div>
    );
  } catch (error) {
    console.error("❌ Page error:", error);
    console.groupEnd();

    return (
      <div className="container mx-auto py-8 px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">오류 발생</h2>
          <p className="text-red-600">
            {error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."}
          </p>
        </div>
      </div>
    );
  }
}

