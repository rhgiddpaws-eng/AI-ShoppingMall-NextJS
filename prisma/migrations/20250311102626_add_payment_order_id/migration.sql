/*
  Warnings:

  - Added the required column `paymentOrderId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentOrderId" TEXT NOT NULL;
