"use server";

import { assertAdminOrThrow } from "@/lib/auth/is-admin";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { auth } from "@clerk/nextjs/server";
import type { CustomOrderStatus } from "@/types/custom-order";
import { revalidatePath } from "next/cache";

/**
 * @file actions/admin/update-custom-order.ts
 * @description 관리자용 주문제작 관리 Server Actions
 * 
 * 주요 기능:
 * - 견적 제공
 * - 주문 상태 변경
 * - 완성 이미지 업로드
 */

const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024; // 6MB
const MAX_COMPLETED_IMAGES = 5;

/**
 * 견적 금액 제공 및 상태를 quote_provided로 변경
 */
export async function provideQuote(orderId: string, quotedPrice: number) {
  console.group("🔧 admin:provideQuote");
  console.log("orderId:", orderId);
  console.log("quotedPrice:", quotedPrice);

  try {
    await assertAdminOrThrow();

    if (!orderId || typeof quotedPrice !== "number" || quotedPrice <= 0) {
      throw new Error("유효하지 않은 입력값입니다.");
    }

    const supabase = getServiceRoleClient();

    console.log("Updating custom_orders with quote...");
    const { data, error } = await supabase
      .from("custom_orders")
      .update({
        quoted_price: quotedPrice,
        status: "quote_provided",
      })
      .eq("id", orderId)
      .select("id, status, quoted_price")
      .single();

    if (error) {
      console.error("❌ Update error:", error);
      throw new Error("견적 제공에 실패했습니다.");
    }

    console.log("✅ Quote provided:", data);
    console.groupEnd();

    revalidatePath("/admin/custom-orders");
    return { success: true, data };
  } catch (error) {
    console.error("❌ provideQuote error:", error);
    console.groupEnd();
    throw error;
  }
}

/**
 * 주문 상태 변경
 */
export async function updateOrderStatus(
  orderId: string,
  status: CustomOrderStatus
) {
  console.group("🔧 admin:updateOrderStatus");
  console.log("orderId:", orderId);
  console.log("new status:", status);

  try {
    await assertAdminOrThrow();

    if (!orderId || !status) {
      throw new Error("유효하지 않은 입력값입니다.");
    }

    const validStatuses: CustomOrderStatus[] = [
      "pending_review",
      "quote_provided",
      "payment_pending",
      "in_progress",
      "completed",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      throw new Error("유효하지 않은 상태값입니다.");
    }

    const supabase = getServiceRoleClient();

    console.log("Updating status...");
    const { data, error } = await supabase
      .from("custom_orders")
      .update({ status })
      .eq("id", orderId)
      .select("id, status")
      .single();

    if (error) {
      console.error("❌ Update error:", error);
      throw new Error("상태 변경에 실패했습니다.");
    }

    console.log("✅ Status updated:", data);
    console.groupEnd();

    revalidatePath("/admin/custom-orders");
    return { success: true, data };
  } catch (error) {
    console.error("❌ updateOrderStatus error:", error);
    console.groupEnd();
    throw error;
  }
}

/**
 * 완성 이미지 업로드 및 completed 상태로 변경
 */
export async function uploadCompletedImages(formData: FormData) {
  console.group("🔧 admin:uploadCompletedImages");

  try {
    await assertAdminOrThrow();
    const { userId } = await auth();

    const orderId = formData.get("orderId") as string;
    if (!orderId) {
      throw new Error("주문 ID가 필요합니다.");
    }

    console.log("orderId:", orderId);
    console.log("userId:", userId);

    // 이미지 파일 수집
    const imageFiles: File[] = [];
    for (let i = 0; i < MAX_COMPLETED_IMAGES; i++) {
      const file = formData.get(`image_${i}`) as File | null;
      if (file && file.size > 0) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`이미지 ${i + 1}은 이미지 형식이어야 합니다.`);
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(`이미지 ${i + 1}은 최대 6MB까지 업로드할 수 있습니다.`);
        }
        imageFiles.push(file);
      }
    }

    if (imageFiles.length === 0) {
      throw new Error("최소 1개의 이미지를 업로드해야 합니다.");
    }

    console.log("Uploading", imageFiles.length, "images...");

    const supabase = getServiceRoleClient();

    // 업로드 경로: {clerk_id}/custom-orders/{orderId}/completed/{i}_{filename}
    const uploadedPaths: string[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const path = `${userId}/custom-orders/${orderId}/completed/${i}_${file.name}`;

      console.log(`Uploading image ${i + 1}:`, path);

      const { error } = await supabase.storage
        .from("uploads")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true, // 덮어쓰기 허용
        });

      if (error) {
        console.error(`❌ Upload error for image ${i + 1}:`, error);
        throw new Error(`이미지 ${i + 1} 업로드에 실패했습니다.`);
      }

      uploadedPaths.push(path);
    }

    console.log("✅ All images uploaded:", uploadedPaths);

    // DB 업데이트: completed_image_urls 저장 및 상태를 completed로 변경
    console.log("Updating custom_orders with completed images...");
    const { data, error } = await supabase
      .from("custom_orders")
      .update({
        completed_image_urls: uploadedPaths,
        status: "completed",
      })
      .eq("id", orderId)
      .select("id, status, completed_image_urls")
      .single();

    if (error) {
      console.error("❌ DB update error:", error);
      throw new Error("완성 이미지 저장에 실패했습니다.");
    }

    console.log("✅ Completed images saved:", data);
    console.groupEnd();

    revalidatePath("/admin/custom-orders");
    return { success: true, data };
  } catch (error) {
    console.error("❌ uploadCompletedImages error:", error);
    console.groupEnd();
    throw error;
  }
}

