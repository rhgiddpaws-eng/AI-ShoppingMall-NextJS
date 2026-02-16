-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "repliedAt" TIMESTAMP(3),
ADD COLUMN     "repliedBy" INTEGER,
ADD COLUMN     "replyMessage" TEXT;
