-- AlterTable
ALTER TABLE "PlatformLimits" ADD COLUMN     "allowedFileExtensions" JSONB NOT NULL DEFAULT '[]';
