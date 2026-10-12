-- CreateTable
CREATE TABLE "system_checkpoints" (
    "id" UUID NOT NULL,
    "phase" INTEGER NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "initialized_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_checkpoints_phase_key" ON "system_checkpoints"("phase");

