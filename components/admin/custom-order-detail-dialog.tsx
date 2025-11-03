"use client";

import { useState, useTransition } from "react";
import type { CustomOrder } from "@/types/custom-order";
import { ORDER_STATUS_LABEL } from "@/types/custom-order";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  provideQuote,
  updateOrderStatus,
  uploadCompletedImages,
} from "@/actions/admin/update-custom-order";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * @file components/admin/custom-order-detail-dialog.tsx
 * @description 관리자용 주문 상세 모달
 * 
 * 주요 기능:
 * - 주문 정보 표시
 * - 견적 제공
 * - 상태 변경 (승인/반려/진행중/완료)
 * - 완성 이미지 업로드
 */

interface CustomOrderDetailDialogProps {
  order: CustomOrder;
  open: boolean;
  onClose: () => void;
}

export function CustomOrderDetailDialog({
  order,
  open,
  onClose,
}: CustomOrderDetailDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quotedPrice, setQuotedPrice] = useState(
    order.quoted_price?.toString() || ""
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleProvideQuote = () => {
    if (!quotedPrice || parseFloat(quotedPrice) <= 0) {
      alert("유효한 견적 금액을 입력해주세요.");
      return;
    }

    console.log("🔧 Providing quote...");
    startTransition(async () => {
      try {
        await provideQuote(order.id, parseFloat(quotedPrice));
        alert("견적이 제공되었습니다.");
        router.refresh();
        onClose();
      } catch (error) {
        console.error(error);
        alert(
          error instanceof Error ? error.message : "견적 제공에 실패했습니다."
        );
      }
    });
  };

  const handleStatusChange = (status: typeof order.status) => {
    console.log("🔧 Changing status to:", status);
    startTransition(async () => {
      try {
        await updateOrderStatus(order.id, status);
        alert("상태가 변경되었습니다.");
        router.refresh();
        onClose();
      } catch (error) {
        console.error(error);
        alert(
          error instanceof Error ? error.message : "상태 변경에 실패했습니다."
        );
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      alert("최대 5개의 이미지만 업로드할 수 있습니다.");
      return;
    }
    setSelectedFiles(files);
  };

  const handleUploadCompleted = () => {
    if (selectedFiles.length === 0) {
      alert("완성 이미지를 선택해주세요.");
      return;
    }

    console.log("🔧 Uploading completed images...");
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("orderId", order.id);
        selectedFiles.forEach((file, i) => {
          formData.append(`image_${i}`, file);
        });

        await uploadCompletedImages(formData);
        alert("완성 이미지가 업로드되고 상태가 완료로 변경되었습니다.");
        router.refresh();
        onClose();
      } catch (error) {
        console.error(error);
        alert(
          error instanceof Error
            ? error.message
            : "완성 이미지 업로드에 실패했습니다."
        );
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>주문 상세</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">
                주문 ID
              </Label>
              <p className="text-sm text-gray-900 font-mono mt-1">
                {order.id}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">
                사용자 ID
              </Label>
              <p className="text-sm text-gray-900 font-mono mt-1">
                {order.clerk_id}
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">
                상태
              </Label>
              <p className="text-sm mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : order.status === "in_progress"
                      ? "bg-blue-100 text-blue-800"
                      : order.status === "cancelled"
                      ? "bg-red-100 text-red-800"
                      : order.status === "quote_provided"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {ORDER_STATUS_LABEL[order.status]}
                </span>
              </p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">
                생성일
              </Label>
              <p className="text-sm text-gray-900 mt-1">
                {new Date(order.created_at).toLocaleString("ko-KR")}
              </p>
            </div>
          </div>

          {/* 설명 */}
          <div>
            <Label className="text-sm font-semibold text-gray-700">설명</Label>
            <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
              {order.description}
            </p>
          </div>

          {/* 사이즈 */}
          <div>
            <Label className="text-sm font-semibold text-gray-700">
              사이즈 선호
            </Label>
            <p className="text-sm text-gray-900 mt-1">{order.size_preference}</p>
          </div>

          {/* 원본 이미지 */}
          <div>
            <Label className="text-sm font-semibold text-gray-700">
              원본 이미지
            </Label>
            <p className="text-xs text-gray-600 mt-1 font-mono break-all">
              {order.source_image_url}
            </p>
          </div>

          {/* 참고 이미지 */}
          {order.reference_image_urls && order.reference_image_urls.length > 0 && (
            <div>
              <Label className="text-sm font-semibold text-gray-700">
                참고 이미지 ({order.reference_image_urls.length}개)
              </Label>
              <div className="mt-2 space-y-1">
                {order.reference_image_urls.map((url, i) => (
                  <p key={i} className="text-xs text-gray-600 font-mono break-all">
                    {url}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* 견적가 */}
          <div>
            <Label className="text-sm font-semibold text-gray-700">
              견적가
            </Label>
            <p className="text-sm text-gray-900 mt-1">
              {order.quoted_price
                ? `₩${order.quoted_price.toLocaleString()}`
                : "미제공"}
            </p>
          </div>

          {/* 완성 이미지 */}
          {order.completed_image_urls &&
            order.completed_image_urls.length > 0 && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">
                  완성 이미지 ({order.completed_image_urls.length}개)
                </Label>
                <div className="mt-2 space-y-1">
                  {order.completed_image_urls.map((url, i) => (
                    <p
                      key={i}
                      className="text-xs text-gray-600 font-mono break-all"
                    >
                      {url}
                    </p>
                  ))}
                </div>
              </div>
            )}

          {/* 재판매 상품 연결 */}
          {order.linked_product_id && (
            <div>
              <Label className="text-sm font-semibold text-gray-700">
                재판매 상품 ID
              </Label>
              <p className="text-sm text-gray-900 mt-1 font-mono">
                {order.linked_product_id}
              </p>
            </div>
          )}

          {/* 관리 액션 */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-semibold text-gray-900">관리 액션</h3>

            {/* 견적 제공 */}
            {order.status === "pending_review" && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <Label htmlFor="quote-input" className="text-sm font-semibold">
                  견적 제공
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="quote-input"
                    type="number"
                    placeholder="견적 금액 (원)"
                    value={quotedPrice}
                    onChange={(e) => setQuotedPrice(e.target.value)}
                    disabled={isPending}
                  />
                  <Button
                    onClick={handleProvideQuote}
                    disabled={isPending}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    견적 제공
                  </Button>
                </div>
              </div>
            )}

            {/* 상태 변경 버튼 */}
            <div className="flex flex-wrap gap-2">
              {order.status === "pending_review" && (
                <>
                  <Button
                    onClick={() => handleStatusChange("in_progress")}
                    disabled={isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    제작 시작
                  </Button>
                  <Button
                    onClick={() => handleStatusChange("cancelled")}
                    disabled={isPending}
                    variant="destructive"
                  >
                    반려
                  </Button>
                </>
              )}

              {order.status === "quote_provided" && (
                <>
                  <Button
                    onClick={() => handleStatusChange("in_progress")}
                    disabled={isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    제작 시작
                  </Button>
                  <Button
                    onClick={() => handleStatusChange("cancelled")}
                    disabled={isPending}
                    variant="destructive"
                  >
                    취소
                  </Button>
                </>
              )}

              {order.status === "in_progress" && (
                <div className="w-full space-y-2">
                  <Label htmlFor="completed-images" className="text-sm font-semibold">
                    완성 이미지 업로드 (최대 5개)
                  </Label>
                  <Input
                    id="completed-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    disabled={isPending}
                  />
                  {selectedFiles.length > 0 && (
                    <p className="text-sm text-gray-600">
                      {selectedFiles.length}개 파일 선택됨
                    </p>
                  )}
                  <Button
                    onClick={handleUploadCompleted}
                    disabled={isPending || selectedFiles.length === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    완료 처리
                  </Button>
                </div>
              )}

              {order.status === "completed" && !order.linked_product_id && (
                <Link href={`/admin/products/create?orderId=${order.id}`}>
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    재판매 상품 등록
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

