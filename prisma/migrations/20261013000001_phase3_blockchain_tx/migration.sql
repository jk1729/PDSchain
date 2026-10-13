-- CreateEnum
CREATE TYPE "BlockchainTxType" AS ENUM ('COMMODITY_REGISTERED', 'OPERATOR_AUTHORIZED', 'OPERATOR_REVOKED', 'BENEFICIARY_REGISTERED', 'BENEFICIARY_STATUS_UPDATED', 'ENTITLEMENT_CONFIGURED', 'WAREHOUSE_STOCK_RECEIVED', 'STOCK_TRANSFERRED_FPS', 'RATION_DISTRIBUTED');

-- CreateEnum
CREATE TYPE "BlockchainTxStatus" AS ENUM ('SUBMITTED', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "blockchain_transactions" (
    "id" UUID NOT NULL,
    "tx_hash" VARCHAR(128) NOT NULL,
    "tx_type" "BlockchainTxType" NOT NULL,
    "status" "BlockchainTxStatus" NOT NULL DEFAULT 'CONFIRMED',
    "block_number" INTEGER,
    "contract_address" VARCHAR(64) NOT NULL,
    "from_address" VARCHAR(64) NOT NULL,
    "actor_user_id" UUID,
    "entity_id" VARCHAR(128),
    "beneficiary_ref" VARCHAR(128),
    "commodity_id" VARCHAR(128),
    "quantity" DECIMAL(18, 4),
    "claim_ref" VARCHAR(128),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockchain_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_transactions_tx_hash_key" ON "blockchain_transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "blockchain_transactions_tx_type_created_at_idx" ON "blockchain_transactions"("tx_type", "created_at");

-- CreateIndex
CREATE INDEX "blockchain_transactions_actor_user_id_created_at_idx" ON "blockchain_transactions"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "blockchain_transactions_entity_id_created_at_idx" ON "blockchain_transactions"("entity_id", "created_at");

-- CreateIndex
CREATE INDEX "blockchain_transactions_beneficiary_ref_idx" ON "blockchain_transactions"("beneficiary_ref");

-- CreateIndex
CREATE INDEX "blockchain_transactions_claim_ref_idx" ON "blockchain_transactions"("claim_ref");

-- AddForeignKey
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

