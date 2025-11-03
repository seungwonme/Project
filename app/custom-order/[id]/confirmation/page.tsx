import { createClerkSupabaseClient } from "@/lib/supabase/server";

/**
 * @file app/custom-order/[id]/confirmation/page.tsx
 * @description 주문제작 의뢰 접수 확인 페이지 (Server Component)
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConfirmationPage(props: PageProps) {
  console.group("custom-order:confirmation");
  const { id } = await props.params;
  const supabase = createClerkSupabaseClient();

  const { data, error } = await supabase
    .from("custom_orders")
    .select("id, description, size_preference, source_image_url, reference_image_urls, created_at, status")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.log("load-order-error", error);
    console.groupEnd();
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <h1 className="mb-4 text-xl font-semibold">의뢰 정보를 불러오지 못했습니다.</h1>
        <p className="text-sm text-gray-600">잠시 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  // 서명 URL 발급 (10분)
  const signedMain = await supabase.storage
    .from("uploads")
    .createSignedUrl(data.source_image_url as string, 600);

  const refUrls: string[] = Array.isArray(data.reference_image_urls)
    ? (data.reference_image_urls as string[])
    : [];

  const signedRefs = await Promise.all(
    refUrls.map((p) => supabase.storage.from("uploads").createSignedUrl(p, 600))
  );

  console.groupEnd();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">의뢰가 접수되었습니다</h1>
      <p className="mb-6 text-sm text-gray-600">요청 ID: {data.id}</p>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-medium">대표 이미지</h2>
          {signedMain.data?.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedMain.data.signedUrl}
              alt="대표 이미지"
              className="h-auto w-full rounded-md border"
            />
          ) : (
            <div className="rounded-md border p-6 text-sm text-gray-500">이미지를 표시할 수 없습니다.</div>
          )}
        </div>

        <div>
          <h2 className="mb-2 font-medium">의뢰 정보</h2>
          <div className="rounded-md border p-4 text-sm">
            <div className="mb-2">
              <span className="mr-2 inline-block w-20 text-gray-500">상태</span>
              <span className="font-medium">{data.status}</span>
            </div>
            <div className="mb-2">
              <span className="mr-2 inline-block w-20 text-gray-500">사이즈</span>
              <span>{data.size_preference}</span>
            </div>
            <div className="mb-2">
              <span className="mr-2 inline-block w-20 text-gray-500">설명</span>
              <span className="whitespace-pre-wrap">{data.description}</span>
            </div>
            <div>
              <span className="mr-2 inline-block w-20 text-gray-500">접수일</span>
              <span>{new Date(data.created_at as string).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 font-medium">참고 이미지</h2>
        {signedRefs.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 참고 이미지가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {signedRefs.map((res, i) => (
              res.data?.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={res.data.signedUrl} alt={`참고 이미지 ${i + 1}`} className="h-auto w-full rounded-md border" />
              ) : (
                <div key={i} className="rounded-md border p-6 text-sm text-gray-500">표시 불가</div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


