-- CreateEnum
CREATE TYPE "InventoryLocationType" AS ENUM ('WAREHOUSE', 'FPS');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('PENDING', 'PARTIALLY_DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('DISPATCHED', 'PARTIALLY_RECEIVED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('CONFIRMED', 'DISCREPANCY_FLAGGED');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('INCREASE', 'DECREASE');

-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('APPROVED', 'PENDING_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT_INWARD', 'DISPATCH_OUTWARD', 'RECEIPT_CONFIRMATION', 'RETURN_OUTWARD', 'RETURN_INWARD', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUBTRACT', 'DISTRIBUTION_DISPENSE');

-- CreateEnum
CREATE TYPE "MovementDirection" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "districts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "state" VARCHAR(64) NOT NULL DEFAULT 'Karnataka',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "district_id" UUID NOT NULL,
    "district_code" VARCHAR(64) NOT NULL,
    "address" VARCHAR(255),
    "capacity_mtl" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fair_price_shops" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "district_id" UUID NOT NULL,
    "district_code" VARCHAR(64) NOT NULL,
    "warehouse_id" UUID,
    "warehouse_code" VARCHAR(64),
    "address" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fair_price_shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commodities" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "unit" VARCHAR(32) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "commodities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" UUID NOT NULL,
    "batch_number" VARCHAR(128) NOT NULL,
    "commodity_id" UUID NOT NULL,
    "commodity_code" VARCHAR(64) NOT NULL,
    "location_type" "InventoryLocationType" NOT NULL,
    "location_code" VARCHAR(64) NOT NULL,
    "warehouse_id" UUID,
    "fps_id" UUID,
    "initial_quantity" DECIMAL(18,4) NOT NULL,
    "current_quantity" DECIMAL(18,4) NOT NULL,
    "unit" VARCHAR(32) NOT NULL,
    "receipt_ref" VARCHAR(128),
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_allocations" (
    "id" UUID NOT NULL,
    "allocation_ref" VARCHAR(128) NOT NULL,
    "source_warehouse_id" UUID NOT NULL,
    "source_warehouse_code" VARCHAR(64) NOT NULL,
    "destination_fps_id" UUID NOT NULL,
    "destination_fps_code" VARCHAR(64) NOT NULL,
    "commodity_id" UUID NOT NULL,
    "commodity_code" VARCHAR(64) NOT NULL,
    "allocated_quantity" DECIMAL(18,4) NOT NULL,
    "dispatched_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "remaining_quantity" DECIMAL(18,4) NOT NULL,
    "period" INTEGER,
    "status" "AllocationStatus" NOT NULL DEFAULT 'PENDING',
    "created_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_dispatches" (
    "id" UUID NOT NULL,
    "dispatch_ref" VARCHAR(128) NOT NULL,
    "allocation_id" UUID,
    "source_warehouse_id" UUID NOT NULL,
    "source_warehouse_code" VARCHAR(64) NOT NULL,
    "destination_fps_id" UUID NOT NULL,
    "destination_fps_code" VARCHAR(64) NOT NULL,
    "commodity_id" UUID NOT NULL,
    "commodity_code" VARCHAR(64) NOT NULL,
    "batch_number" VARCHAR(128),
    "dispatched_quantity" DECIMAL(18,4) NOT NULL,
    "received_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "DispatchStatus" NOT NULL DEFAULT 'DISPATCHED',
    "dispatched_by_id" UUID NOT NULL,
    "dispatched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockchain_tx_hash" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_confirmations" (
    "id" UUID NOT NULL,
    "confirmation_ref" VARCHAR(128) NOT NULL,
    "dispatch_id" UUID NOT NULL,
    "dispatch_ref" VARCHAR(128) NOT NULL,
    "destination_fps_id" UUID NOT NULL,
    "destination_fps_code" VARCHAR(64) NOT NULL,
    "commodity_id" UUID NOT NULL,
    "commodity_code" VARCHAR(64) NOT NULL,
    "batch_number" VARCHAR(128),
    "received_quantity" DECIMAL(18,4) NOT NULL,
    "shortage_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "excess_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "damaged_quantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discrepancy_reason" VARCHAR(500),
    "status" "ConfirmationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "confirmed_by_id" UUID NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_returns" (
    "id" UUID NOT NULL,
    "return_ref" VARCHAR(128) NOT NULL,
    "source_fps_id" UUID NOT NULL,
    "source_fps_code" VARCHAR(64) NOT NULL,
    "destination_warehouse_id" UUID NOT NULL,
    "destination_warehouse_code" VARCHAR(64) NOT NULL,
    "originating_dispatch_ref" VARCHAR(128),
    "commodity_id" UUID NOT NULL,
    "commodity_code" VARCHAR(64) NOT NULL,
    "batch_number" VARCHAR(128),
    "return_quantity" DECIMAL(18,4) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'CONFIRMED',
    "returned_by_id" UUID NOT NULL,
    "confirmed_by_id" UUID,
    "confirmed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" UUID NOT NULL,
    "adjustment_ref" VARCHAR(128) NOT NULL,
    "location_type" "InventoryLocationType" NOT NULL,
    "location_code" VARCHAR(64) NOT NULL,
    "commodity_id" UUID NOT NULL,
    "commodity_code" VARCHAR(64) NOT NULL,
    "batch_number" VARCHAR(128),
    "adjustment_type" "AdjustmentType" NOT NULL,
    "quantity_change" DECIMAL(18,4) NOT NULL,
    "previous_balance" DECIMAL(18,4) NOT NULL,
    "resulting_balance" DECIMAL(18,4) NOT NULL,
    "reason_code" VARCHAR(64) NOT NULL,
    "explanation" VARCHAR(500) NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'APPROVED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "movement_ref" VARCHAR(128) NOT NULL,
    "movement_type" "StockMovementType" NOT NULL,
    "location_type" "InventoryLocationType" NOT NULL,
    "location_code" VARCHAR(64) NOT NULL,
    "commodity_id" UUID NOT NULL,
    "commodity_code" VARCHAR(64) NOT NULL,
    "batch_number" VARCHAR(128),
    "quantity" DECIMAL(18,4) NOT NULL,
    "direction" "MovementDirection" NOT NULL,
    "balance_after" DECIMAL(18,4) NOT NULL,
    "source_document_ref" VARCHAR(128) NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "blockchain_tx_hash" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "districts_code_key" ON "districts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");
CREATE INDEX "warehouses_district_id_idx" ON "warehouses"("district_id");
CREATE INDEX "warehouses_district_code_idx" ON "warehouses"("district_code");

-- CreateIndex
CREATE UNIQUE INDEX "fair_price_shops_code_key" ON "fair_price_shops"("code");
CREATE INDEX "fair_price_shops_district_id_idx" ON "fair_price_shops"("district_id");
CREATE INDEX "fair_price_shops_district_code_idx" ON "fair_price_shops"("district_code");
CREATE INDEX "fair_price_shops_warehouse_id_idx" ON "fair_price_shops"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "commodities_code_key" ON "commodities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_batches_location_type_location_code_commodity_id_batch_number_key" ON "inventory_batches"("location_type", "location_code", "commodity_id", "batch_number");
CREATE INDEX "inventory_batches_location_code_commodity_code_idx" ON "inventory_batches"("location_code", "commodity_code");
CREATE INDEX "inventory_batches_status_idx" ON "inventory_batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_allocations_allocation_ref_key" ON "stock_allocations"("allocation_ref");
CREATE INDEX "stock_allocations_source_warehouse_code_idx" ON "stock_allocations"("source_warehouse_code");
CREATE INDEX "stock_allocations_destination_fps_code_idx" ON "stock_allocations"("destination_fps_code");
CREATE INDEX "stock_allocations_status_idx" ON "stock_allocations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_dispatches_dispatch_ref_key" ON "stock_dispatches"("dispatch_ref");
CREATE INDEX "stock_dispatches_source_warehouse_code_idx" ON "stock_dispatches"("source_warehouse_code");
CREATE INDEX "stock_dispatches_destination_fps_code_idx" ON "stock_dispatches"("destination_fps_code");
CREATE INDEX "stock_dispatches_status_idx" ON "stock_dispatches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_confirmations_confirmation_ref_key" ON "receipt_confirmations"("confirmation_ref");
CREATE INDEX "receipt_confirmations_dispatch_id_idx" ON "receipt_confirmations"("dispatch_id");
CREATE INDEX "receipt_confirmations_destination_fps_code_idx" ON "receipt_confirmations"("destination_fps_code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_returns_return_ref_key" ON "stock_returns"("return_ref");
CREATE INDEX "stock_returns_source_fps_code_idx" ON "stock_returns"("source_fps_code");
CREATE INDEX "stock_returns_destination_warehouse_code_idx" ON "stock_returns"("destination_warehouse_code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustments_adjustment_ref_key" ON "stock_adjustments"("adjustment_ref");
CREATE INDEX "stock_adjustments_location_code_commodity_code_idx" ON "stock_adjustments"("location_code", "commodity_code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_movement_ref_key" ON "stock_movements"("movement_ref");
CREATE INDEX "stock_movements_location_type_location_code_commodity_code_created_at_idx" ON "stock_movements"("location_type", "location_code", "commodity_code", "created_at");
CREATE INDEX "stock_movements_movement_type_created_at_idx" ON "stock_movements"("movement_type", "created_at");
CREATE INDEX "stock_movements_source_document_ref_idx" ON "stock_movements"("source_document_ref");

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_price_shops" ADD CONSTRAINT "fair_price_shops_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_price_shops" ADD CONSTRAINT "fair_price_shops_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_fps_id_fkey" FOREIGN KEY ("fps_id") REFERENCES "fair_price_shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_allocations" ADD CONSTRAINT "stock_allocations_source_warehouse_id_fkey" FOREIGN KEY ("source_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_allocations" ADD CONSTRAINT "stock_allocations_destination_fps_id_fkey" FOREIGN KEY ("destination_fps_id") REFERENCES "fair_price_shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_allocations" ADD CONSTRAINT "stock_allocations_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_allocations" ADD CONSTRAINT "stock_allocations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_dispatches" ADD CONSTRAINT "stock_dispatches_source_warehouse_id_fkey" FOREIGN KEY ("source_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_dispatches" ADD CONSTRAINT "stock_dispatches_destination_fps_id_fkey" FOREIGN KEY ("destination_fps_id") REFERENCES "fair_price_shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_dispatches" ADD CONSTRAINT "stock_dispatches_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_dispatches" ADD CONSTRAINT "stock_dispatches_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "stock_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_dispatches" ADD CONSTRAINT "stock_dispatches_dispatched_by_id_fkey" FOREIGN KEY ("dispatched_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_confirmations" ADD CONSTRAINT "receipt_confirmations_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "stock_dispatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_confirmations" ADD CONSTRAINT "receipt_confirmations_destination_fps_id_fkey" FOREIGN KEY ("destination_fps_id") REFERENCES "fair_price_shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_confirmations" ADD CONSTRAINT "receipt_confirmations_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_returns" ADD CONSTRAINT "stock_returns_source_fps_id_fkey" FOREIGN KEY ("source_fps_id") REFERENCES "fair_price_shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_returns" ADD CONSTRAINT "stock_returns_destination_warehouse_id_fkey" FOREIGN KEY ("destination_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_returns" ADD CONSTRAINT "stock_returns_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_returns" ADD CONSTRAINT "stock_returns_returned_by_id_fkey" FOREIGN KEY ("returned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_commodity_id_fkey" FOREIGN KEY ("commodity_id") REFERENCES "commodities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

