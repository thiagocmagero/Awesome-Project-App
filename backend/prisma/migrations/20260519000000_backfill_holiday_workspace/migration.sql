-- Backfill: associa cada Holiday CUSTOM (sem workspaceId) ao workspace mais
-- antigo do owner. Não toca em GLOBAL/REGIONAL (workspace-agnostic, vivem
-- em qualquer workspace) nem em CUSTOM sem owner (orphans pré-existentes).
--
-- Idempotente: o WHERE filtra os que já têm workspaceId.

UPDATE "Holiday" h
SET    "workspaceId" = (
  SELECT w.id
  FROM   "Workspace" w
  WHERE  w."ownerId" = h."ownerId"
  ORDER  BY w."createdAt" ASC
  LIMIT  1
)
WHERE  h."workspaceId" IS NULL
  AND  h."ownerId" IS NOT NULL
  AND  h."scope" = 'CUSTOM';
