-- 택배 연동을 위한 공급자/송장/이벤트/라이더 로그 컬럼 추가
CREATE TYPE "DeliveryProvider" AS ENUM ('MOCK', 'KAKAO', 'BAROGO', 'VROONG', 'THINKING', 'INTERNAL');

ALTER TABLE "Order"
ADD COLUMN "deliveryProvider" "DeliveryProvider",
ADD COLUMN "externalDeliveryId" TEXT,
ADD COLUMN "externalDeliveryStatus" TEXT,
ADD COLUMN "courierCode" TEXT,
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "trackingUrl" TEXT,
ADD COLUMN "dispatchedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3);

CREATE TABLE "DeliveryEvent" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiderLocationLog" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "riderUserId" INTEGER,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderLocationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryEvent_dedupeKey_key" ON "DeliveryEvent"("dedupeKey");
CREATE INDEX "Order_status_deliveryStatus_idx" ON "Order"("status", "deliveryStatus");
CREATE INDEX "Order_externalDeliveryId_idx" ON "Order"("externalDeliveryId");
CREATE INDEX "Order_trackingNumber_idx" ON "Order"("trackingNumber");
CREATE INDEX "Order_deliveryProvider_externalDeliveryStatus_idx" ON "Order"("deliveryProvider", "externalDeliveryStatus");
CREATE INDEX "DeliveryEvent_orderId_receivedAt_idx" ON "DeliveryEvent"("orderId", "receivedAt");
CREATE INDEX "DeliveryEvent_provider_eventType_idx" ON "DeliveryEvent"("provider", "eventType");
CREATE INDEX "RiderLocationLog_orderId_recordedAt_idx" ON "RiderLocationLog"("orderId", "recordedAt");
CREATE INDEX "RiderLocationLog_riderUserId_recordedAt_idx" ON "RiderLocationLog"("riderUserId", "recordedAt");

ALTER TABLE "DeliveryEvent"
ADD CONSTRAINT "DeliveryEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RiderLocationLog"
ADD CONSTRAINT "RiderLocationLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RiderLocationLog"
ADD CONSTRAINT "RiderLocationLog_riderUserId_fkey" FOREIGN KEY ("riderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
