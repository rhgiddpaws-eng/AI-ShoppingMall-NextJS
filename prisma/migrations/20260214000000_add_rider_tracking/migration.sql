-- Add rider tracking fields for in-delivery map rendering
ALTER TABLE "Order"
ADD COLUMN "riderLat" DOUBLE PRECISION,
ADD COLUMN "riderLng" DOUBLE PRECISION,
ADD COLUMN "riderUpdatedAt" TIMESTAMP(3);

