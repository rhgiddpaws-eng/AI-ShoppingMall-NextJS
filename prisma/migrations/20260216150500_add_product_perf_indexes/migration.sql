-- Product 목록(카테고리/최신순) 조회 최적화 인덱스
CREATE INDEX IF NOT EXISTS "Product_status_category_createdAt_idx"
ON "Product"("status", "category", "createdAt");

-- 신상품(전체 최신순) 조회 최적화 인덱스
CREATE INDEX IF NOT EXISTS "Product_status_createdAt_idx"
ON "Product"("status", "createdAt");

-- 상품별 대표 이미지(첫 장) 조회 최적화 인덱스
CREATE INDEX IF NOT EXISTS "Image_productId_id_idx"
ON "Image"("productId", "id");
