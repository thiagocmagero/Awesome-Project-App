import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { TagsService } from './tags.service';

@Controller('workspaces/me/tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  /**
   * Lista as tags do workspace default do utilizador autenticado.
   * Endpoint usado pelo autocompletar do TaskModal.
   */
  @Get()
  async listMyWorkspaceTags(@Req() req: { user: JwtPayload }) {
    const workspace = await this.workspacesService.getDefaultForUser(req.user.sub);
    return this.tagsService.listForWorkspace(workspace.id);
  }
}
