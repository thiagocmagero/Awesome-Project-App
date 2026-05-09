import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspacesService } from './workspaces.service';
import { SkipWorkspaceContext } from './decorators/skip-workspace-context.decorator';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  /**
   * Devolve o workspace default do utilizador autenticado.
   * Endpoint workspace-agnostic (o frontend chama-o ANTES de saber qual ws usar).
   */
  @SkipWorkspaceContext()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyDefault(@Req() req: any) {
    const ws = await this.workspacesService.getDefaultForUser(req.user.sub);
    return {
      publicId: ws.publicId,
      name: ws.name,
      status: ws.status,
      createdAt: ws.createdAt,
    };
  }
}
