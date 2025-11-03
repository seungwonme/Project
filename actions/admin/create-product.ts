"use server";

import { assertAdminOrThrow } from "@/lib/auth/is-admin";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * @file actions/admin/create-product.ts
 * @description 관리자용 상품 생성 Server Action
 * 
 * 재판매 상품 등록 흐름:
 * 1. 상품 기본 정보로 products 행 생성 (이미지는 빈 배열)
 * 2. 생성된 productId로 Storage에 이미지 업로드
 * 3. products.image_urls 업데이트
 * 4. custom_orders.linked_product_id 업데이트
 */

const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024; // 6MB
const MAX_PRODUCT_IMAGES = 5;

interface CreateProductParams {
  orderId: string;
  name: string;
  description: string;
  basePrice: number;
  paintingPrice: number;
  stockQuantity: number;
  categoryId: number;
}

export async function createProductFromOrder(
  params: CreateProductParams,
  formData: FormData
): Promise<never> {
  console.group("🔧 admin:createProductFromOrder");
  console.log("params:", params);

  try {
    await assertAdminOrThrow();
    const { userId } = await auth();

    const {
      orderId,
      name,
      description,
      basePrice,
      paintingPrice,
      stockQuantity,
      categoryId,
    } = params;

    // 유효성 검증
    if (
      !orderId ||
      !name ||
      !description ||
      basePrice <= 0 ||
      paintingPrice < 0 ||
      stockQuantity < 0 ||
      !categoryId
    ) {
      throw new Error("유효하지 않은 입력값입니다.");
    }

    // 이미지 파일 수집
    const imageFiles: File[] = [];
    for (let i = 0; i < MAX_PRODUCT_IMAGES; i++) {
      const file = formData.get(`image_${i}`) as File | null;
      if (file && file.size > 0) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`이미지 ${i + 1}은 이미지 형식이어야 합니다.`);
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            `이미지 ${i + 1}은 최대 6MB까지 업로드할 수 있습니다.`
          );
        }
        imageFiles.push(file);
      }
    }

    if (imageFiles.length === 0) {
      throw new Error("최소 1개의 상품 이미지를 업로드해야 합니다.");
    }

    console.log("Creating product with", imageFiles.length, "images...");

    const supabase = getServiceRoleClient();

    // Step 1: 상품 생성 (이미지는 빈 배열로 시작)
    console.log("Step 1: Creating product...");
    const totalPrice = basePrice + paintingPrice;

    const { data: product, error: createError } = await supabase
      .from("products")
      .insert({
        name,
        description,
        price: totalPrice,
        base_price: basePrice,
        painting_price: paintingPrice,
        stock_quantity: stockQuantity,
        category_id: categoryId,
        image_urls: [], // 빈 배열로 시작
        is_active: true,
      })
      .select("id")
      .single();

    if (createError || !product) {
      console.error("❌ Product creation error:", createError);
      throw new Error("상품 생성에 실패했습니다.");
    }

    const productId = product.id;
    console.log("✅ Product created with ID:", productId);

    // Step 2: 이미지 업로드 (경로: products/{productId}/images/{i}_{filename})
    console.log("Step 2: Uploading images...");
    const uploadedPaths: string[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const path = `products/${productId}/images/${i}_${file.name}`;

      console.log(`Uploading image ${i + 1}:`, path);

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error(`❌ Upload error for image ${i + 1}:`, uploadError);
        // 실패 시 생성된 상품 삭제 (rollback)
        await supabase.from("products").delete().eq("id", productId);
        throw new Error(`이미지 ${i + 1} 업로드에 실패했습니다.`);
      }

      uploadedPaths.push(path);
    }

    console.log("✅ All images uploaded:", uploadedPaths);

    // Step 3: products.image_urls 업데이트
    console.log("Step 3: Updating product image_urls...");
    const { error: updateError } = await supabase
      .from("products")
      .update({ image_urls: uploadedPaths })
      .eq("id", productId);

    if (updateError) {
      console.error("❌ Update error:", updateError);
      throw new Error("상품 이미지 URL 업데이트에 실패했습니다.");
    }

    console.log("✅ Product image_urls updated");

    // Step 4: custom_orders.linked_product_id 업데이트
    console.log("Step 4: Linking product to custom order...");
    const { error: linkError } = await supabase
      .from("custom_orders")
      .update({ linked_product_id: productId })
      .eq("id", orderId);

    if (linkError) {
      console.error("❌ Link error:", linkError);
      // 경고만 하고 계속 진행 (상품은 이미 생성됨)
      console.warn("⚠️ Failed to link product to order, but product created");
    } else {
      console.log("✅ Product linked to order");
    }

    console.log("🎉 Product creation complete!");
    console.groupEnd();

    // 성공: 관리자 대시보드로 리다이렉트
    redirect("/admin/custom-orders");
  } catch (error) {
    console.error("❌ createProductFromOrder error:", error);
    console.groupEnd();
    throw error;
  }
}

