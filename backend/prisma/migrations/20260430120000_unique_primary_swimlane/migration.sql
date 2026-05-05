-- Limpa duplicados de "Geral" (BoardSwimlane com isPrimary=true) que tenham
-- sido criados por race conditions anteriores (ver bug do StrictMode).
-- Mantém a primária mais antiga por projecto e re-aponta tasks + apaga as
-- restantes em hard-delete (estavam INACTIVE ou ACTIVE — ambos são limpos
-- aqui porque nenhuma swimlane primary deve estar em estado != ACTIVE).
WITH ranked AS (
    SELECT
        id,
        "projectId",
        ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt" ASC, id ASC) AS rn
    FROM "BoardSwimlane"
    WHERE "isPrimary" = true
),
keepers AS (
    SELECT id, "projectId" FROM ranked WHERE rn = 1
),
losers AS (
    SELECT r.id, r."projectId", k.id AS keeper_id
    FROM ranked r
    JOIN keepers k ON k."projectId" = r."projectId"
    WHERE r.rn > 1
)
-- Re-apontar tasks que apontavam para uma "Geral" duplicada
UPDATE "GanttTask" gt
SET "boardSwimlaneId" = l.keeper_id
FROM losers l
WHERE gt."boardSwimlaneId" = l.id;

-- Apagar swimlanes "Geral" duplicadas (mantém só a mais antiga por projecto)
DELETE FROM "BoardSwimlane" bs
USING (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
            PARTITION BY "projectId" ORDER BY "createdAt" ASC, id ASC
        ) AS rn
        FROM "BoardSwimlane"
        WHERE "isPrimary" = true
    ) t WHERE t.rn > 1
) dup
WHERE bs.id = dup.id;

-- Índice parcial único: no máximo uma swimlane com isPrimary=true por
-- projecto. Travar races no nível DB (Prisma não suporta partial unique
-- index nativamente, daí o SQL raw).
CREATE UNIQUE INDEX IF NOT EXISTS "BoardSwimlane_projectId_primary_unique"
    ON "BoardSwimlane" ("projectId")
    WHERE "isPrimary" = true;
