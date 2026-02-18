-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MediaType') THEN
    CREATE TYPE "MediaType" AS ENUM ('image', 'video');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Image"
ADD COLUMN IF NOT EXISTS "mediaType" "MediaType" NOT NULL DEFAULT 'image';

-- Backfill
-- 기존 DB에 저장된 원본/썸네일 확장자를 기준으로 동영상을 다시 분류합니다.
UPDATE "Image"
SET "mediaType" = 'video'
WHERE
  LOWER(COALESCE("original", '')) ~ '\.(mp4|webm|mov)($|[?#])'
  OR LOWER(COALESCE("thumbnail", '')) ~ '\.(mp4|webm|mov)($|[?#])';
