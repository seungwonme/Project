"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { createCustomOrder } from "@/actions/custom-order";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * @file app/custom-order/page.tsx
 * @description 주문제작 의뢰 페이지 (클라이언트 컴포넌트)
 *
 * - react-hook-form + zod로 유효성 검사
 * - Server Action(createCustomOrder) 직접 호출
 * - Supabase Storage 업로드는 서버 액션에서 수행
 */

const SIZE_OPTIONS = ["10cm", "15cm", "20cm", "30cm"]; // 예시 옵션

const schema = z.object({
  description: z.string().trim().min(10, "설명을 10자 이상 입력해 주세요."),
  size_preference: z.string().trim().min(1, "사이즈를 선택해 주세요."),
  source_image: z.instanceof(File).refine((f) => f.size > 0, "대표 이미지를 선택해 주세요."),
  reference_images: z.array(z.instanceof(File)).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function CustomOrderPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [refFiles, setRefFiles] = useState<File[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: "",
      size_preference: SIZE_OPTIONS[1],
      reference_images: [],
    },
  });

  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const refsInputRef = useRef<HTMLInputElement | null>(null);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    console.group("custom-order:submit");
    try {
      // RHF의 File은 values로 전달되므로 그대로 사용, 다만 안전하게 ref에서 다시 취득
      const sourceFile = sourceInputRef.current?.files?.[0] ?? values.source_image;
      if (!sourceFile) {
        throw new Error("대표 이미지를 선택해 주세요.");
      }

      // 참고 이미지는 input이 새 선택마다 덮어쓰기 되므로 상태에 누적하여 사용
      const refs = refFiles;

      const fd = new FormData();
      fd.append("description", values.description);
      fd.append("size_preference", values.size_preference);
      fd.append("source_image", sourceFile);
      for (const f of refs) {
        fd.append("reference_images", f);
      }

      console.log("submit: form-data ready", {
        size: values.size_preference,
        source: { name: sourceFile.name, size: sourceFile.size, type: sourceFile.type },
        refsCount: refs.length,
      });

      startTransition(async () => {
        await createCustomOrder(fd); // 성공 시 server action에서 redirect 처리
      });
    } catch (e: any) {
      console.log("submit-error", e);
      setError(e?.message ?? "제출 중 오류가 발생했습니다.");
    } finally {
      console.groupEnd();
    }
  });

  const sizeOptions = useMemo(() => SIZE_OPTIONS, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">주문제작 의뢰</h1>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6" encType="multipart/form-data">
          <FormField
            control={form.control}
            name="size_preference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>피규어 사이즈</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    {sizeOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>추가 요구사항</FormLabel>
                <FormControl>
                  <Textarea rows={6} placeholder="원하는 스타일, 포즈, 재질 등을 상세히 적어주세요." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>대표 이미지 (필수)</FormLabel>
            <FormControl>
              <Input
                ref={sourceInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  form.setValue("source_image", f as any, { shouldValidate: true });
                }}
              />
            </FormControl>
            <FormMessage>{form.formState.errors.source_image?.message as string}</FormMessage>
          </FormItem>

          <FormItem>
            <FormLabel>참고 이미지 (선택, 여러 장 가능)</FormLabel>
            <FormControl>
              <Input
                ref={refsInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const added = Array.from(e.target.files ?? []);
                  if (added.length === 0) return;
                  // 중복 제거 키: name|size|lastModified
                  const toKey = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;
                  const current = new Map(refFiles.map((f) => [toKey(f), f] as const));
                  for (const f of added) {
                    current.set(toKey(f), f);
                  }
                  const merged = Array.from(current.values());
                  setRefFiles(merged);
                  console.log("refs-merged", merged.map((f) => ({ name: f.name, size: f.size })));
                  // 같은 파일을 다시 선택할 수 있도록 input을 초기화
                  if (refsInputRef.current) refsInputRef.current.value = "";
                }}
              />
            </FormControl>
          </FormItem>

          {refFiles.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              <div className="mb-2 font-medium">선택한 참고 이미지</div>
              <ul className="space-y-1">
                {refFiles.map((f, i) => (
                  <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between gap-3">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      className="text-gray-500 underline"
                      onClick={() => {
                        const next = refFiles.slice();
                        next.splice(i, 1);
                        setRefFiles(next);
                      }}
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "제출 중..." : "의뢰 제출"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}



