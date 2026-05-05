-- CreateTable: EmailConfig (singleton — id always 1)
CREATE TABLE "EmailConfig" (
    "id"        INTEGER NOT NULL DEFAULT 1,
    "enabled"   BOOLEAN NOT NULL DEFAULT false,
    "host"      TEXT,
    "port"      INTEGER NOT NULL DEFAULT 587,
    "secure"    BOOLEAN NOT NULL DEFAULT false,
    "username"  TEXT,
    "password"  TEXT,
    "fromEmail" TEXT,
    "fromName"  TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row so upsert always finds id=1
INSERT INTO "EmailConfig" ("id", "enabled", "port", "secure", "updatedAt")
VALUES (1, false, 587, false, NOW())
ON CONFLICT ("id") DO NOTHING;
