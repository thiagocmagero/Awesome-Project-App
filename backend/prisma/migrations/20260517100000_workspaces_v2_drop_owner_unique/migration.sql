-- V1 → V2 (Maio 2026): permitir múltiplos workspaces por owner.
--
-- O constraint UNIQUE em Workspace.ownerId foi a invariante de V1 (1 workspace
-- por user, auto-criado no registo). V2 introduz endpoints POST /workspaces e
-- GET /workspaces para o user gerir múltiplos workspaces (owned + invited via
-- WorkspaceMember).
--
-- O índice não-único Workspace_ownerId_idx (criado pela migração inicial
-- 20260510000000_introduce_workspace) é preservado — continua a ser a estrutura
-- usada para queries `findFirst({ where: { ownerId } })`.
--
-- "Workspace default" do user passa a ser o mais antigo (orderBy createdAt asc)
-- — preserva semântica V1 para users existentes que continuam a ter apenas 1.

DROP INDEX IF EXISTS "Workspace_ownerId_key";
