"use client";

import { useState, useTransition } from "react";
import type { CustomOrder } from "@/types/custom-order";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProductFromOrder } from "@/actions/admin/create-product";

/**
 * @file components/admin/product-create-form.tsx
 * @description 재판매 상품 등록 폼
 * 
 * 주요 기능:
 * - 완성 이미지 미리보기 (참고용)
 * - 새 상품 이미지 업로드 (최대 5장)
 * - 상품 정보 입력
 */

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface ProductCreateFormProps {
  order: CustomOrder;
  categories: Category[];
}

export function ProductCreateForm({
  order,
  categories,
}: ProductCreateFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState(order.description);
  const [basePrice, setBasePrice] = useState("");
  const [paintingPrice, setPaintingPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("1");
  const [categoryId, setCategoryId] = useState(categories[0]?.id.toString() || "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      alert("최대 5개의 이미지만 업로드할 수 있습니다.");
      return;
    }
    setSelectedFiles(files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("🔧 Submitting product creation...");

    // 유효성 검증
    if (!name.trim()) {
      alert("상품명을 입력해주세요.");
      return;
    }

    if (!description.trim()) {
      alert("상품 설명을 입력해주세요.");
      return;
    }

    if (!basePrice || parseFloat(basePrice) <= 0) {
      alert("기본 가격을 입력해주세요.");
      return;
    }

    if (!paintingPrice || parseFloat(paintingPrice) < 0) {
      alert("도색 가격을 입력해주세요.");
      return;
    }

    if (!stockQuantity || parseInt(stockQuantity) < 0) {
      alert("재고 수량을 입력해주세요.");
      return;
    }

    if (!categoryId) {
      alert("카테고리를 선택해주세요.");
      return;
    }

    if (selectedFiles.length === 0) {
      alert("최소 1개의 상품 이미지를 업로드해주세요.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        selectedFiles.forEach((file, i) => {
          formData.append(`image_${i}`, file);
        });

        const params = {
          orderId: order.id,
          name: name.trim(),
          description: description.trim(),
          basePrice: parseFloat(basePrice),
          paintingPrice: parseFloat(paintingPrice),
          stockQuantity: parseInt(stockQuantity),
          categoryId: parseInt(categoryId),
        };

        await createProductFromOrder(params, formData);
        // redirect는 Server Action에서 처리됨
      } catch (error) {
        console.error(error);
        alert(
          error instanceof Error
            ? error.message
            : "상품 등록에 실패했습니다."
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 주문 정보 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-900 mb-2">주문 정보</h2>
        <div className="space-y-2 text-sm">
          <p className="text-blue-800">
            <span className="font-medium">주문 ID:</span>{" "}
            <span className="font-mono">{order.id}</span>
          </p>
          <p className="text-blue-800">
            <span className="font-medium">사이즈:</span> {order.size_preference}
          </p>
          <p className="text-blue-800">
            <span className="font-medium">설명:</span> {order.description}
          </p>
        </div>
      </div>

      {/* 완성 이미지 참고 */}
      {order.completed_image_urls && order.completed_image_urls.length > 0 && (
        <div>
          <Label className="text-base font-semibold">
            완성 이미지 (참고용)
          </Label>
          <p className="text-sm text-gray-600 mb-2">
            이 이미지들은 참고용입니다. 재판매용 이미지는 아래에서 새로 업로드해주세요.
          </p>
          <div className="space-y-1">
            {order.completed_image_urls.map((url, i) => (
              <p
                key={i}
                className="text-xs text-gray-600 font-mono break-all bg-gray-50 p-2 rounded"
              >
                {url}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 상품 이미지 업로드 (새로 촬영한 이미지) */}
      <div>
        <Label htmlFor="product-images" className="text-base font-semibold">
          상품 이미지 업로드 (필수, 최대 5개)
        </Label>
        <p className="text-sm text-gray-600 mb-2">
          재판매용 상품 이미지를 업로드해주세요. 완성 이미지와 다르게 찍어야 할 수 있습니다.
        </p>
        <Input
          id="product-images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={isPending}
          required
        />
        {selectedFiles.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium text-green-700">
              {selectedFiles.length}개 파일 선택됨:
            </p>
            {selectedFiles.map((file, i) => (
              <p key={i} className="text-xs text-gray-600">
                {i + 1}. {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            ))}
          </div>
        )}
      </div>

      {/* 상품명 */}
      <div>
        <Label htmlFor="name" className="text-base font-semibold">
          상품명 (필수)
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="예: 사이버펑크 사무라이 피규어"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          required
        />
      </div>

      {/* 상품 설명 */}
      <div>
        <Label htmlFor="description" className="text-base font-semibold">
          상품 설명 (필수)
        </Label>
        <Textarea
          id="description"
          placeholder="상품에 대한 상세한 설명을 입력해주세요."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          rows={5}
          required
        />
      </div>

      {/* 가격 정보 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="base-price" className="text-base font-semibold">
            기본 가격 (필수, 3D 프린팅만)
          </Label>
          <Input
            id="base-price"
            type="number"
            placeholder="75000"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            disabled={isPending}
            min="0"
            step="1000"
            required
          />
        </div>

        <div>
          <Label htmlFor="painting-price" className="text-base font-semibold">
            도색 추가 가격 (필수)
          </Label>
          <Input
            id="painting-price"
            type="number"
            placeholder="45000"
            value={paintingPrice}
            onChange={(e) => setPaintingPrice(e.target.value)}
            disabled={isPending}
            min="0"
            step="1000"
            required
          />
        </div>
      </div>

      {/* 총 가격 표시 */}
      {basePrice && paintingPrice && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <span className="font-medium">총 가격 (도색 포함):</span>{" "}
            <span className="text-lg font-bold">
              ₩{(parseFloat(basePrice) + parseFloat(paintingPrice)).toLocaleString()}
            </span>
          </p>
        </div>
      )}

      {/* 재고 수량 */}
      <div>
        <Label htmlFor="stock" className="text-base font-semibold">
          초기 재고 수량 (필수)
        </Label>
        <Input
          id="stock"
          type="number"
          placeholder="1"
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
          disabled={isPending}
          min="0"
          required
        />
      </div>

      {/* 카테고리 */}
      <div>
        <Label htmlFor="category" className="text-base font-semibold">
          카테고리 (필수)
        </Label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={isPending}
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 제출 버튼 */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isPending ? "등록 중..." : "재판매 상품 등록"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={isPending}
        >
          취소
        </Button>
      </div>
    </form>
  );
}

