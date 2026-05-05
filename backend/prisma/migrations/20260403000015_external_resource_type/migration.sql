-- Remove email (não aplicável a recursos externos)
-- Adicionar userTypeId obrigatório (tipo funcional do recurso externo)
ALTER TABLE "GanttResource" DROP COLUMN IF EXISTS "email";
ALTER TABLE "GanttResource" ADD COLUMN "userTypeId" INTEGER REFERENCES "UserType"(id) ON DELETE SET NULL;
