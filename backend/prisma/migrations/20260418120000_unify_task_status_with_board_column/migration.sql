-- Fase 1 — Unificar estado da tarefa com coluna do Board
-- 1. Renomear "status" → "legacyStatus" (mantém dados intactos)
-- 2. Garantir as 3 colunas-sistema em projectos sem elas
-- 3. Backfill boardColumnId via mapeamento legacyStatus → systemKey
-- 4. Backfill e normalizar boardPosition
-- 5. Renomear permissão BOARD_COLUMN_MANAGE → STATE_MANAGE nos grants
-- legacyStatus permanece como safety net; será dropada numa migração futura.

-- 1. Rename da coluna status
ALTER TABLE "GanttTask" RENAME COLUMN "status" TO "legacyStatus";

-- 2. Criar colunas-sistema faltantes
-- TODO (INITIAL, position 0)
INSERT INTO "BoardColumn" ("publicId", "projectId", "systemKey", "type", "isSystem", "position", "color", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."id", 'TODO', 'INITIAL', true, 0, NULL, 'ACTIVE', NOW(), NOW()
FROM "Project" p
WHERE NOT EXISTS (
  SELECT 1 FROM "BoardColumn" bc
  WHERE bc."projectId" = p."id" AND bc."systemKey" = 'TODO'
);

-- INPROGRESS (INTERMEDIATE, position 1)
INSERT INTO "BoardColumn" ("publicId", "projectId", "systemKey", "type", "isSystem", "position", "color", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."id", 'INPROGRESS', 'INTERMEDIATE', true, 1, NULL, 'ACTIVE', NOW(), NOW()
FROM "Project" p
WHERE NOT EXISTS (
  SELECT 1 FROM "BoardColumn" bc
  WHERE bc."projectId" = p."id" AND bc."systemKey" = 'INPROGRESS'
);

-- DONE (FINAL, position 2)
INSERT INTO "BoardColumn" ("publicId", "projectId", "systemKey", "type", "isSystem", "position", "color", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."id", 'DONE', 'FINAL', true, 2, NULL, 'ACTIVE', NOW(), NOW()
FROM "Project" p
WHERE NOT EXISTS (
  SELECT 1 FROM "BoardColumn" bc
  WHERE bc."projectId" = p."id" AND bc."systemKey" = 'DONE'
);

-- 3. Backfill boardColumnId nas tasks sem coluna atribuída
UPDATE "GanttTask" gt
SET "boardColumnId" = bc."id"
FROM "BoardColumn" bc
WHERE gt."projectId" = bc."projectId"
  AND bc."status" = 'ACTIVE'
  AND gt."boardColumnId" IS NULL
  AND (
    (gt."legacyStatus" = 'nova' AND bc."systemKey" = 'TODO')
    OR (gt."legacyStatus" IN ('em_curso', 'pendente', 'revisao') AND bc."systemKey" = 'INPROGRESS')
    OR (gt."legacyStatus" = 'fechada' AND bc."systemKey" = 'DONE')
  );

-- 4. Normalizar boardPosition (sequencial 0..n por coluna; corrige duplicados pré-existentes)
WITH reseq AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "boardColumnId"
      ORDER BY "boardPosition" NULLS LAST, "createdAt", "id"
    ) - 1 AS new_pos
  FROM "GanttTask"
  WHERE "boardColumnId" IS NOT NULL
)
UPDATE "GanttTask" gt
SET "boardPosition" = r.new_pos
FROM reseq r
WHERE gt."id" = r."id";

-- 5. Renomear permissão nos grants existentes
UPDATE "ProjectPermissionGrant"
SET "action" = 'STATE_MANAGE'
WHERE "action" = 'BOARD_COLUMN_MANAGE';
