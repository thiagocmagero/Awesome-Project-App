-- Migração de limpeza pós-remoção do tab Board / Aw-Kanban (Abril 2026).
-- Remove apenas grants e a feature flag `board_view`. As tabelas
-- BoardColumn / BoardSwimlane / BoardConfig / BoardCardAssignee /
-- BoardSwimlaneUserState NÃO são apagadas: BoardColumn continua a ser a
-- fonte de verdade do estado das tarefas via GanttTask.boardColumnId, e as
-- tabelas auxiliares ficam dormentes para o futuro componente Board.
-- Ver `docs/claude/future-board.md`.

-- 1) Apagar grants atribuídos a actions Board que já não existem no enum.
DELETE FROM "ProjectPermissionGrant"
WHERE "action" IN (
  'BOARD_VIEW',
  'BOARD_CARD_MOVE',
  'BOARD_CARD_ASSIGN',
  'BOARD_CONFIG'
);

-- 2) Apagar a feature flag `board_view` e os PlanFeatureFlag/UserFeatureFlag
--    que dela dependem (ON DELETE CASCADE no schema cobre os filhos).
DELETE FROM "FeatureFlag" WHERE "key" = 'board_view';
