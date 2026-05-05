-- AlterTable
ALTER TABLE "BoardSwimlane" ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "labelKey" TEXT,
ALTER COLUMN "label" DROP NOT NULL;
