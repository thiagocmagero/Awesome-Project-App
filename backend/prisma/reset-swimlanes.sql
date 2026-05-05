-- reset-swimlanes.sql
-- Remove todas as swimlanes e liberta os cards (boardSwimlaneId → NULL).
-- Executa numa única transação — seguro de re-executar.

BEGIN;

-- 1. Libertar cards das swimlanes
UPDATE "GanttTask"
SET "boardSwimlaneId" = NULL
WHERE "boardSwimlaneId" IS NOT NULL;

-- 2. Apagar estados de colapso per-user
DELETE FROM "BoardSwimlaneUserState";

-- 3. Soft-delete de todas as swimlanes
UPDATE "BoardSwimlane"
SET "status" = 'INACTIVE'
WHERE "status" = 'ACTIVE';

COMMIT;
