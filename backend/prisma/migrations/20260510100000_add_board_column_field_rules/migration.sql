-- CreateEnum
CREATE TYPE "TaskFieldKey" AS ENUM ('description', 'schedule', 'duration', 'restriction', 'type', 'priority', 'assignees');

-- CreateTable
CREATE TABLE "BoardColumnFieldRule" (
    "id" SERIAL NOT NULL,
    "boardColumnId" INTEGER NOT NULL,
    "field" "TaskFieldKey" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BoardColumnFieldRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardColumnFieldRule_boardColumnId_idx" ON "BoardColumnFieldRule"("boardColumnId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardColumnFieldRule_boardColumnId_field_key" ON "BoardColumnFieldRule"("boardColumnId", "field");

-- AddForeignKey
ALTER TABLE "BoardColumnFieldRule" ADD CONSTRAINT "BoardColumnFieldRule_boardColumnId_fkey" FOREIGN KEY ("boardColumnId") REFERENCES "BoardColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
