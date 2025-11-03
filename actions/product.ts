/**
 * @file actions/product.ts
 * @description 상품 관련 Server Actions
 * 
 * 이 파일은 상품 데이터를 조회하는 Server Actions를 제공합니다.
 * Supabase Server 클라이언트를 사용하여 데이터베이스에서 상품 정보를 가져옵니다.
 * 
 * @dependencies
 * - @/lib/supabase/server: Supabase 서버 클라이언트
 * - @/types/product: 상품 타입 정의
 */

"use server";

import { createClerkSupabaseClient } from "@/lib/supabase/server";
import type { Product, Category, ProductWithCategory } from "@/types/product";

/**
 * 최신 상품을 조회합니다
 * 
 * @param limit - 조회할 상품 개수 (기본값: 8)
 * @returns 카테고리 정보가 포함된 최신 상품 목록
 */
export async function getLatestProducts(
  limit: number = 8
): Promise<ProductWithCategory[]> {
  console.log("📦 [getLatestProducts] 최신 상품 조회 시작", { limit });

  try {
    const supabase = createClerkSupabaseClient();

    // 상품과 카테고리를 JOIN하여 조회
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        category:categories(*)
      `
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ [getLatestProducts] 상품 조회 실패:", error);
      throw error;
    }

    console.log("✅ [getLatestProducts] 상품 조회 완료:", {
      count: data?.length || 0,
    });

    // 타입 변환: category가 배열로 올 수 있으므로 단일 객체로 변환
    const products: ProductWithCategory[] = (data || []).map((item) => ({
      ...item,
      category: Array.isArray(item.category)
        ? item.category[0] || null
        : item.category,
    }));

    return products;
  } catch (error) {
    console.error("❌ [getLatestProducts] 예외 발생:", error);
    return [];
  }
}

/**
 * 특정 카테고리의 상품을 조회합니다
 * 
 * @param categoryId - 카테고리 ID
 * @param limit - 조회할 상품 개수 (기본값: 4)
 * @returns 카테고리 정보가 포함된 상품 목록
 */
export async function getProductsByCategory(
  categoryId: number,
  limit: number = 4
): Promise<ProductWithCategory[]> {
  console.log("📦 [getProductsByCategory] 카테고리별 상품 조회 시작", {
    categoryId,
    limit,
  });

  try {
    const supabase = createClerkSupabaseClient();

    const { data, error } = await supabase
      .from("products")
      .select(
        `
        *,
        category:categories(*)
      `
      )
      .eq("is_active", true)
      .eq("category_id", categoryId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("❌ [getProductsByCategory] 상품 조회 실패:", error);
      throw error;
    }

    console.log("✅ [getProductsByCategory] 상품 조회 완료:", {
      categoryId,
      count: data?.length || 0,
    });

    // 타입 변환
    const products: ProductWithCategory[] = (data || []).map((item) => ({
      ...item,
      category: Array.isArray(item.category)
        ? item.category[0] || null
        : item.category,
    }));

    return products;
  } catch (error) {
    console.error("❌ [getProductsByCategory] 예외 발생:", error);
    return [];
  }
}

/**
 * 모든 카테고리를 조회합니다
 * 
 * @returns 카테고리 목록
 */
export async function getAllCategories(): Promise<Category[]> {
  console.log("📦 [getAllCategories] 카테고리 목록 조회 시작");

  try {
    const supabase = createClerkSupabaseClient();

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("❌ [getAllCategories] 카테고리 조회 실패:", error);
      throw error;
    }

    console.log("✅ [getAllCategories] 카테고리 조회 완료:", {
      count: data?.length || 0,
    });

    return data || [];
  } catch (error) {
    console.error("❌ [getAllCategories] 예외 발생:", error);
    return [];
  }
}

/**
 * 여러 카테고리의 상품을 한 번에 조회합니다
 * 홈페이지용으로 최적화된 함수
 * 
 * @param categoryIds - 조회할 카테고리 ID 배열
 * @param limitPerCategory - 카테고리당 조회할 상품 개수 (기본값: 4)
 * @returns 카테고리별로 그룹화된 상품 목록
 */
export async function getProductsByCategories(
  categoryIds: number[],
  limitPerCategory: number = 4
): Promise<{ category: Category; products: ProductWithCategory[] }[]> {
  console.log("📦 [getProductsByCategories] 여러 카테고리 상품 조회 시작", {
    categoryIds,
    limitPerCategory,
  });

  try {
    // 각 카테고리별로 상품 조회
    const results = await Promise.all(
      categoryIds.map(async (categoryId) => {
        const products = await getProductsByCategory(
          categoryId,
          limitPerCategory
        );

        // 카테고리 정보는 상품의 category 필드에서 가져옴
        const category = products[0]?.category;

        return {
          category: category || null,
          products,
        };
      })
    );

    // null 카테고리는 제외
    const filteredResults = results.filter(
      (result) => result.category !== null
    ) as { category: Category; products: ProductWithCategory[] }[];

    console.log("✅ [getProductsByCategories] 조회 완료:", {
      categoryCount: filteredResults.length,
      totalProducts: filteredResults.reduce(
        (sum, r) => sum + r.products.length,
        0
      ),
    });

    return filteredResults;
  } catch (error) {
    console.error("❌ [getProductsByCategories] 예외 발생:", error);
    return [];
  }
}

