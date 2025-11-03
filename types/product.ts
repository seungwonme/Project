/**
 * @file types/product.ts
 * @description 상품 관련 타입 정의
 * 
 * 이 파일은 마켓플레이스 상품과 카테고리에 대한 타입을 정의합니다.
 * 데이터베이스 스키마와 일치하도록 설계되었습니다.
 */

/**
 * 카테고리 타입
 * 데이터베이스의 category_name ENUM과 일치
 */
export type CategoryName =
  | "Anime"
  | "Gaming"
  | "Original Character"
  | "Diorama"
  | "Props"
  | "Mecha"
  | "Creature";

/**
 * 카테고리 인터페이스
 * categories 테이블과 일치
 */
export interface Category {
  id: number;
  name: CategoryName;
  description: string | null;
  created_at: string;
}

/**
 * 상품 인터페이스
 * products 테이블과 일치
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  base_price: number;
  painting_price: number;
  stock_quantity: number;
  image_urls: string[];
  model_data_url: string | null;
  category_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 카테고리 정보가 포함된 상품
 * JOIN 쿼리 결과용
 */
export interface ProductWithCategory extends Product {
  category: Category | null;
}

/**
 * 홈페이지용 상품 목록 타입
 */
export interface HomeProductsData {
  latestProducts: ProductWithCategory[];
  productsByCategory: {
    category: Category;
    products: ProductWithCategory[];
  }[];
}

/**
 * 카테고리별 주요 카테고리 목록
 * 홈페이지에서 기본적으로 표시할 카테고리
 */
export const MAIN_CATEGORIES: CategoryName[] = [
  "Anime",
  "Gaming",
  "Original Character",
  "Mecha",
];

/**
 * 카테고리 한글 레이블
 */
export const CATEGORY_LABEL: Record<CategoryName, string> = {
  Anime: "애니메이션",
  Gaming: "게임",
  "Original Character": "오리지널 캐릭터",
  Diorama: "디오라마",
  Props: "소품",
  Mecha: "메카",
  Creature: "크리처",
};

