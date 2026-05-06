/*
  Warnings:

  - You are about to drop the column `timezone` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "timezone";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "locale" TEXT;
