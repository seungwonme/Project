# Phase 3: 관리자 기능 구현 완료 요약

## 구현 완료 날짜
2025년 11월 3일

## 구현된 기능

### 1. 관리자 권한 보호 시스템

#### 미들웨어 (`middleware.ts`)
- Clerk `publicMetadata.role === "admin"` 체크
- `/admin/*` 라우트 자동 보호
- 비관리자 접근 시 홈으로 리다이렉트
- 로깅: 모든 접근 시도 콘솔 기록

#### 서버 헬퍼 함수 (`lib/auth/is-admin.ts`)
- `isAdmin()`: 관리자 여부 확인
- `assertAdminOrThrow()`: Server Action용 권한 가드
- 로깅: 권한 확인 과정 상세 기록

### 2. 주문제작 관리 대시보드

#### 대시보드 페이지 (`app/admin/custom-orders/page.tsx`)
- 모든 주문제작 의뢰 조회
- 상태별 필터링 (쿼리 파라미터)
- Service Role 클라이언트 사용 (RLS 우회)
- 로깅: 데이터 페칭 과정 기록

#### 테이블 컴포넌트 (`components/admin/custom-order-table.tsx`)
- 상태별 탭 (전체, 검토 대기, 견적 제공됨, 제작 중, 제작 완료, 취소됨)
- 각 탭에 주문 개수 표시
- 주문 목록 테이블 (ID, 사용자, 설명, 상태, 견적가, 생성일)
- 상세보기 버튼

### 3. 주문 상세 관리 모달

#### 상세 모달 (`components/admin/custom-order-detail-dialog.tsx`)
- **정보 표시**: 주문 ID, 사용자 ID, 상태, 생성일, 설명, 사이즈, 원본/참고 이미지, 견적가, 완성 이미지
- **견적 제공**: `pending_review` 상태에서 견적 금액 입력 → `quote_provided` 상태로 변경
- **상태 변경**:
  - 제작 시작: `pending_review` → `in_progress`
  - 반려/취소: → `cancelled`
- **완료 처리**: 
  - `in_progress` 상태에서 완성 이미지 업로드 (최대 5장)
  - `custom_orders.completed_image_urls` 저장
  - 상태 → `completed`
- **재판매 등록 링크**: `completed` 상태이고 `linked_product_id`가 없을 때 표시

### 4. Server Actions (`actions/admin/update-custom-order.ts`)

#### `provideQuote(orderId, quotedPrice)`
- 견적 금액 설정 및 상태 변경
- 유효성 검증
- 로깅: 전체 프로세스 기록

#### `updateOrderStatus(orderId, status)`
- 주문 상태 변경
- 유효 상태값 검증
- 로깅: 상태 변경 과정 기록

#### `uploadCompletedImages(formData)`
- FormData에서 이미지 파일 수집 (최대 5개)
- Supabase Storage 업로드 (`{clerk_id}/custom-orders/{orderId}/completed/`)
- `completed_image_urls` 필드 업데이트
- 상태 → `completed`
- 로깅: 각 이미지 업로드 및 DB 업데이트 기록

### 5. 재판매 상품 등록

#### 등록 페이지 (`app/admin/products/create/page.tsx`)
- 쿼리 파라미터로 `orderId` 전달
- 주문 정보 조회 및 검증 (완료 상태, 미등록)
- 카테고리 목록 조회
- 로깅: 데이터 페칭 과정 기록

#### 등록 폼 (`components/admin/product-create-form.tsx`)
- **완성 이미지 미리보기**: 참고용으로 `completed_image_urls` 표시
- **새 상품 이미지 업로드**: 최대 5개 (재판매용)
- **상품 정보 입력**:
  - 상품명
  - 설명 (주문 설명 기본값)
  - 기본 가격 (3D 프린팅만)
  - 도색 추가 가격
  - 총 가격 자동 계산 표시
  - 초기 재고 수량
  - 카테고리 선택
- **제출 처리**: Server Action 호출

#### Server Action (`actions/admin/create-product.ts`)

##### `createProductFromOrder(params, formData)`
흐름:
1. 관리자 권한 확인
2. 유효성 검증
3. FormData에서 이미지 파일 수집
4. **Step 1**: `products` 테이블에 행 생성 (`image_urls: []`)
5. **Step 2**: 생성된 `productId`로 Storage에 이미지 업로드 (`products/{productId}/images/`)
6. **Step 3**: `products.image_urls` 업데이트
7. **Step 4**: `custom_orders.linked_product_id` 업데이트
8. 성공 시 `/admin/custom-orders`로 리다이렉트

로깅: 각 단계마다 상세 로깅

### 6. UI 통합

#### Navbar 업데이트 (`components/Navbar.tsx`)
- 관리자 페이지 링크 추가
- 로그인한 모든 사용자에게 보이지만, 미들웨어가 비관리자 접근 차단

## 파일 구조

```
middleware.ts                                      # 관리자 라우트 보호
lib/auth/is-admin.ts                              # 권한 확인 헬퍼
actions/admin/
  ├── update-custom-order.ts                      # 주문 상태/견적/완성 이미지 관리
  └── create-product.ts                           # 재판매 상품 생성
app/admin/
  ├── custom-orders/page.tsx                      # 주문 관리 대시보드
  └── products/create/page.tsx                    # 재판매 등록 페이지
components/admin/
  ├── custom-order-table.tsx                      # 주문 목록 테이블
  ├── custom-order-detail-dialog.tsx              # 주문 상세 모달
  └── product-create-form.tsx                     # 상품 등록 폼
components/Navbar.tsx                              # 네비게이션 (관리자 링크 추가)
```

## 데이터베이스 변경사항

### 추가 마이그레이션: 없음
- 기존 스키마 충분 (`completed_image_urls`, `image_urls`, `linked_product_id` 이미 존재)

## Storage 경로 규칙

### 완성 이미지
```
{clerk_id}/custom-orders/{orderId}/completed/{i}_{filename}
```

### 상품 이미지
```
products/{productId}/images/{i}_{filename}
```

## 로깅 전략

모든 주요 Server Action과 페이지에 체계적인 로깅 구현:
- `console.group()` / `console.groupEnd()`로 그룹화
- 입력 파라미터 기록
- 각 단계 진행 상황 기록
- 성공/실패 명확히 표시 (✅/❌)
- 에러 상세 정보 기록

## 보안 고려사항

1. **미들웨어 레벨 보호**: 모든 `/admin/*` 라우트 접근 제한
2. **Server Action 가드**: 모든 관리자 액션에 `assertAdminOrThrow()` 적용
3. **Service Role 사용**: 관리자 작업은 RLS 우회 가능한 Service Role 클라이언트 사용
4. **클라이언트 노출 방지**: Service Role 키는 서버 사이드에서만 사용

## 사용자 가이드

### 관리자 권한 설정 (Clerk Dashboard)

1. Clerk Dashboard 접속
2. Users 메뉴에서 관리자로 지정할 사용자 선택
3. Metadata 탭 선택
4. Public Metadata에 추가:
```json
{
  "role": "admin"
}
```
5. 저장

### 주문제작 관리 워크플로우

1. **검토 대기 (`pending_review`)**
   - 관리자 대시보드에서 주문 상세 확인
   - 견적 제공 또는 반려

2. **견적 제공됨 (`quote_provided`)**
   - 고객이 결제 대기 상태
   - 필요시 제작 시작 또는 취소

3. **제작 중 (`in_progress`)**
   - 제작 진행
   - 완료 시 완성 이미지 업로드 → 자동으로 `completed` 상태

4. **제작 완료 (`completed`)**
   - "재판매 상품 등록" 버튼 표시
   - 재판매 등록 페이지에서 상품 정보 입력 및 이미지 업로드

5. **재판매 등록**
   - 완성 이미지 참고
   - 새 상품 이미지 업로드
   - 가격, 재고, 카테고리 설정
   - 등록 완료 시 `custom_orders.linked_product_id` 자동 연결

## 테스트 체크리스트

- [ ] 관리자가 아닌 사용자가 `/admin/custom-orders` 접근 시 홈으로 리다이렉트되는지 확인
- [ ] 관리자 대시보드에서 모든 주문이 표시되는지 확인
- [ ] 상태별 탭 필터링이 작동하는지 확인
- [ ] 견적 제공이 정상 작동하는지 확인
- [ ] 주문 상태 변경이 정상 작동하는지 확인
- [ ] 완성 이미지 업로드가 정상 작동하는지 확인 (최대 5개)
- [ ] 재판매 상품 등록이 정상 작동하는지 확인
- [ ] 상품 이미지가 올바른 경로에 저장되는지 확인
- [ ] `linked_product_id`가 올바르게 연결되는지 확인
- [ ] 콘솔 로그가 각 단계마다 출력되는지 확인

## 다음 단계 (Phase 4+)

- 마켓플레이스 상품 목록/상세 페이지 구현
- 장바구니 기능 구현
- 결제 통합 (Toss Payments)
- 리뷰 시스템 구현
- Q&A 시스템 구현

## 알려진 제한사항

- 현재 Navbar에 관리자 링크가 모든 로그인 사용자에게 보임 (비관리자는 접근 불가하지만 링크는 보임)
- 향후 개선: 클라이언트에서도 관리자 여부를 체크하여 링크 조건부 렌더링

