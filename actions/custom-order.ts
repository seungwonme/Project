"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClerkSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

/**
 * @file actions/custom-order.ts
 * @description 주문제작 의뢰 Server Action
 *
 * - FormData를 받아 Supabase Storage에 이미지 업로드
 * - `public.custom_orders`에 레코드 생성
 * - 생성된 의뢰 ID로 확인 페이지로 리다이렉트
 */

const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024; // 6MB (setup_storage.sql 정책과 일치)

const schema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "설명을 10자 이상 입력해 주세요."),
  size_preference: z
    .string()
    .trim()
    .min(1, "사이즈를 선택해 주세요."),
});

function assertImageOrThrow(file: File, label: string) {
  if (!file) throw new Error(`${label} 파일이 필요합니다.`);
  if (!file.type.startsWith("image/")) {
    throw new Error(`${label} 파일은 이미지 형식이어야 합니다.`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`${label} 파일은 최대 6MB까지 업로드할 수 있습니다.`);
  }
}

export async function createCustomOrder(formData: FormData): Promise<never> {
  console.group("custom-order:server-action:create");
  const { userId } = await auth();
  if (!userId) {
    console.log("not-authenticated -> redirect /sign-in");
    console.groupEnd();
    redirect("/sign-in");
  }

  const description = String(formData.get("description") ?? "");
  const sizePreference = String(formData.get("size_preference") ?? "");
  const sourceImage = formData.get("source_image");

  const parsed = schema.safeParse({ description, size_preference: sizePreference });
  if (!parsed.success) {
    console.log("validation-failed", parsed.error.flatten());
    console.groupEnd();
    throw new Error("입력값을 확인해 주세요.");
  }

  if (!(sourceImage instanceof File)) {
    console.groupEnd();
    throw new Error("대표 이미지를 선택해 주세요.");
  }
  assertImageOrThrow(sourceImage, "대표 이미지");

  const referenceImages: File[] = [];
  const refEntries = formData.getAll("reference_images");
  for (const entry of refEntries) {
    if (entry instanceof File && entry.size > 0) {
      assertImageOrThrow(entry, "참고 이미지");
      referenceImages.push(entry);
    }
  }

  const supabase = createClerkSupabaseClient();

  // 업로드 경로 prefix: {clerk_sub}/custom-orders/{requestUid}
  const requestUid = crypto.randomUUID();
  const prefix = `${userId}/custom-orders/${requestUid}`;

  // 1) 대표 이미지 업로드
  const sourceImagePath = `${prefix}/source/${sourceImage.name}`;
  console.log("upload:source", sourceImagePath, sourceImage.type, sourceImage.size);
  const uploadMain = await supabase.storage
    .from("uploads")
    .upload(sourceImagePath, sourceImage, {
      cacheControl: "3600",
      contentType: sourceImage.type,
      upsert: false,
    });
  if (uploadMain.error) {
    console.log("upload-main-error", uploadMain.error);
    console.groupEnd();
    throw new Error("대표 이미지 업로드에 실패했습니다.");
  }

  // 2) 참고 이미지 업로드 (선택)
  const referencePaths: string[] = [];
  for (let i = 0; i < referenceImages.length; i++) {
    const f = referenceImages[i];
    const path = `${prefix}/refs/${i}_${f.name}`;
    console.log("upload:ref", path, f.type, f.size);
    const res = await supabase.storage
      .from("uploads")
      .upload(path, f, { cacheControl: "3600", contentType: f.type, upsert: false });
    if (res.error) {
      console.log("upload-ref-error", res.error, path);
      console.groupEnd();
      throw new Error("참고 이미지 업로드에 실패했습니다.");
    }
    referencePaths.push(path);
  }

  // 3) DB insert
  console.log("db:insert:custom_orders");
  // users 외래키 보장: clerk_id upsert (존재하지 않으면 생성)
  const upsertUser = await supabase
    .from("users")
    .upsert({ clerk_id: userId }, { onConflict: "clerk_id", ignoreDuplicates: true });
  if (upsertUser.error) {
    console.log("users-upsert-error", upsertUser.error);
    console.groupEnd();
    throw new Error("사용자 동기화에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }

  const insertRes = await supabase
    .from("custom_orders")
    .insert({
      clerk_id: userId,
      description: parsed.data.description,
      size_preference: parsed.data.size_preference,
      source_image_url: sourceImagePath,
      reference_image_urls: referencePaths.length ? referencePaths : null,
      status: "pending_review",
    })
    .select("id")
    .single();

  if (insertRes.error || !insertRes.data) {
    console.log("db-insert-error", insertRes.error);
    // 마이그레이션 미적용 시 reference_image_urls 컬럼 에러 가능성
    if (insertRes.error && typeof insertRes.error.message === "string" && insertRes.error.message.includes("reference_image_urls")) {
      console.log("hint: run pending migrations to add reference_image_urls column");
    }
    console.groupEnd();
    throw new Error("의뢰 저장에 실패했습니다.");
  }

  const newId = insertRes.data.id as string;
  console.log("redirect ->", `/custom-order/${newId}/confirmation`);
  console.groupEnd();
  redirect(`/custom-order/${newId}/confirmation`);
}



