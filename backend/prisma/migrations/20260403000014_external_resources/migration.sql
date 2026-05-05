-- Campos adicionais no GanttResource para suportar recursos sem conta na plataforma
-- email: contacto opcional do recurso externo
-- hoursPerDay: capacidade diária (externos usam este campo; internos usam ProjectMemberHours)
ALTER TABLE "GanttResource"
  ADD COLUMN "email"       TEXT,
  ADD COLUMN "hoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8;
