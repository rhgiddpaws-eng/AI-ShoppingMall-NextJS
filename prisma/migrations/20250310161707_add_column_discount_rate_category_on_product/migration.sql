-- CreateEnum
CREATE TYPE "Category" AS ENUM ('MEN', 'WOMEN', 'ACCESSORIES', 'SHOES');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" "Category",
ADD COLUMN     "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
