-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plugin" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL,
    "attempts" INTEGER DEFAULT 0,
    "max_attempts" INTEGER DEFAULT 3,
    "error" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(6),
    "finished_at" TIMESTAMP(6),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);
