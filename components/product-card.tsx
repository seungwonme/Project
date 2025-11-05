/**
 * @file components/product-card.tsx
 * @description 상품 카드 컴포넌트
 * 
 * 이 컴포넌트는 개별 상품을 카드 형태로 표시합니다.
 * 상품 이미지, 이름, 가격, 카테고리 정보를 보여주며, 클릭 시 상품 상세 페이지로 이동합니다.
 * 
 * 주요 기능:
 * 1. 상품 이미지 표시 (첫 번째 이미지 사용, 실패 시 대체 이미지)
 * 2. 상품명, 가격 정보 표시
 * 3. 카테고리 뱃지 표시
 * 4. base_price와 painting_price 표시
 * 
 * @dependencies
 * - next/image: 이미지 최적화
 * - next/link: 클라이언트 사이드 네비게이션
 * - @/components/ui/card: shadcn/ui Card 컴포넌트
 * - @/components/ui/badge: shadcn/ui Badge 컴포넌트
 * - @/types/product: 상품 타입
 */

'use client';

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProductWithCategory } from "@/types/product";
import { CATEGORY_LABEL } from "@/types/product";

interface ProductCardProps {
  product: ProductWithCategory;
  /**
   * 이미지 로드 실패 시 대체 이미지 URL
   */
  fallbackImage?: string;
}

/**
 * 상품 카드 컴포넌트
 */
export function ProductCard({
  product,
  fallbackImage = "/logo.png", // 기본 로고 이미지 사용
}: ProductCardProps) {
  // 첫 번째 이미지 URL 추출
  const rawImageUrl = product.image_urls?.[0];
  
  // example.com 또는 유효하지 않은 URL인 경우 대체 이미지 사용
  const imageUrl = rawImageUrl && 
    !rawImageUrl.includes('example.com') && 
    rawImageUrl.startsWith('http')
    ? rawImageUrl 
    : fallbackImage;

  // 카테고리 한글 레이블
  const categoryLabel = product.category
    ? CATEGORY_LABEL[product.category.name] || product.category.name
    : "미분류";

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="h-full transition-all hover:shadow-lg cursor-pointer overflow-hidden group">
        {/* 상품 이미지 */}
        <CardHeader className="p-0 relative aspect-square overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              // 이미지 로드 실패 시 대체 이미지로 변경
              const target = e.target as HTMLImageElement;
              target.src = fallbackImage;
            }}
          />
          {/* 카테고리 뱃지 */}
          {product.category && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm">
                {categoryLabel}
              </Badge>
            </div>
          )}
        </CardHeader>

        {/* 상품 정보 */}
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        </CardContent>

        {/* 가격 정보 */}
        <CardFooter className="p-4 pt-0 flex flex-col items-start gap-2">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground">기본 (프린팅)</span>
              <span className="font-bold text-lg">
                {product.base_price.toLocaleString()}원
              </span>
            </div>
            {product.painting_price > 0 && (
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">도색 포함</span>
                <span className="font-semibold text-primary">
                  {(product.base_price + product.painting_price).toLocaleString()}원
                </span>
              </div>
            )}
          </div>

          {/* 재고 정보 */}
          {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
            <Badge variant="outline" className="text-xs">
              재고 {product.stock_quantity}개
            </Badge>
          )}
          {product.stock_quantity === 0 && (
            <Badge variant="destructive" className="text-xs">
              품절
            </Badge>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}

