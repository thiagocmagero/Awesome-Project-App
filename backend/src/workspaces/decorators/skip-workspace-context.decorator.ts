import { SetMetadata } from '@nestjs/common';

export const SKIP_WORKSPACE_CONTEXT_KEY = 'skipWorkspaceContext';

/**
 * Aplicado em controllers/handlers que não exigem o header X-Workspace-Id.
 * Usado em rotas workspace-agnostic: auth, platform-admin, user-self,
 * webhooks, e o próprio GET /workspaces/me.
 */
export const SkipWorkspaceContext = () =>
  SetMetadata(SKIP_WORKSPACE_CONTEXT_KEY, true);
