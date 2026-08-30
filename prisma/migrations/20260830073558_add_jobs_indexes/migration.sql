/*
  Warnings:

  - Made the column `attempts` on table `jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `max_attempts` on table `jobs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `jobs` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "available_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lease_expires_at" TIMESTAMP(6),
ADD COLUMN     "locked_by" UUID,
ALTER COLUMN "attempts" SET NOT NULL,
ALTER COLUMN "max_attempts" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_status_available_at_idx" ON "jobs"("status", "available_at");

-- CreateIndex
CREATE INDEX "jobs_status_lease_expires_at_idx" ON "jobs"("status", "lease_expires_at");
