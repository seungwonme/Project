import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { assertAdminOrThrow } from "@/lib/auth/is-admin";
import type { CustomOrder } from "@/types/custom-order";
import { ProductCreateForm } from "@/components/admin/product-create-form";
import { redirect } from "next/navigation";

/**
 * @file app/admin/products/create/page.tsx
 * @description 재판매 상품 등록 페이지
 * 
 * 주요 기능:
 * - 완료된 주문제작 건 정보 표시
 * - 완성 이미지 미리보기 (참고용)
 * - 새 상품 이미지 업로드 (최대 5장)
 * - 상품 정보 입력 (이름, 설명, 가격, 카테고리, 재고)
 */

interface PageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function ProductCreatePage(props: PageProps) {
  console.group("📦 admin:products:create:page");

  try {
    await assertAdminOrThrow();

    const searchParams = await props.searchParams;
    const orderId = searchParams.orderId;

    if (!orderId) {
      redirect("/admin/custom-orders");
    }

    console.log("orderId:", orderId);

    const supabase = getServiceRoleClient();

    // 주문 정보 조회
    console.log("Fetching custom order...");
    const { data: order, error: orderError } = await supabase
      .from("custom_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("❌ Order fetch error:", orderError);
      throw new Error("주문을 찾을 수 없습니다.");
    }

    // 완료 상태 확인
    if (order.status !== "completed") {
      throw new Error("완료 상태의 주문만 재판매 등록이 가능합니다.");
    }

    // 이미 상품이 연결되어 있는지 확인
    if (order.linked_product_id) {
      throw new Error("이미 재판매 상품이 등록된 주문입니다.");
    }

    console.log("✅ Order fetched:", order.id);

    // 카테고리 목록 조회
    console.log("Fetching categories...");
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .order("id");

    if (categoriesError) {
      console.error("❌ Categories fetch error:", categoriesError);
      throw new Error("카테고리를 불러오는데 실패했습니다.");
    }

    console.log("✅ Categories fetched:", categories?.length);
    console.groupEnd();

    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">재판매 상품 등록</h1>

        <ProductCreateForm 
          order={order as CustomOrder} 
          categories={categories || []}
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
            {error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다."}
          </p>
        </div>
      </div>
    );
  }
}

