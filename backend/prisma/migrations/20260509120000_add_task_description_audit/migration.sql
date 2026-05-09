-- Adiciona description (rich text/longa) e auditoria de autor a Task.
-- createdById/updatedById com onDelete: SetNull — preserva história ao
-- apagar utilizadores (regra obrigatória "User cascade rule").

ALTER TABLE "Task"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "createdById" INTEGER,
  ADD COLUMN "updatedById" INTEGER;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");
CREATE INDEX "Task_updatedById_idx" ON "Task"("updatedById");
