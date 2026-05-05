-- CreateTable
CREATE TABLE "PlatformLimits" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "maxTaskBusinessDays" INTEGER NOT NULL DEFAULT 1300,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformLimits_pkey" PRIMARY KEY ("id")
);
