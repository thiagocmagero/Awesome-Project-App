import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspacesService } from './workspaces.service';
import { SkipWorkspaceContext } from './decorators/skip-workspace-context.decorator';
import { Audit } from '../audit-log/decorators/audit.decorator';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  /**
   * Devolve o workspace default do utilizador autenticado (V2: mais antigo).
   * Endpoint workspace-agnostic (frontend chama-o ANTES de saber qual ws usar).
   */
  @SkipWorkspaceContext()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyDefault(@Req() req: { user: { sub: number } }) {
    const ws = await this.workspacesService.getDefaultForUser(req.user.sub);
    return {
      publicId: ws.publicId,
      name: ws.name,
      status: ws.status,
      createdAt: ws.createdAt,
    };
  }

  /**
   * Lista todos os workspaces a que o utilizador autenticado tem acesso:
   * owned (Workspace.ownerId = user) + WorkspaceMember(ACCEPTED).
   * Cada item traz `role` = 'OWNER' | 'BASIC' | 'LICENSED'.
   */
  @SkipWorkspaceContext()
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: { user: { sub: number } }) {
    const items = await this.workspacesService.findAllForUser(req.user.sub);
    return { items };
  }

  /**
   * Cria um workspace novo cujo owner é o utilizador autenticado.
   * Body: `{ name: string }`. Auto-cria Subscription default no novo workspace.
   * V2 (Maio 2026): permitido pela remoção do unique constraint Workspace.ownerId.
   */
  @SkipWorkspaceContext()
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(201)
  @Audit({
    action: 'WORKSPACE_CREATED',
    resourceType: 'workspace',
    // resourceId fica `null` no log — a decorator actual só recebe `req` (não a response).
    // Para auditar com publicId, o caller verifica method+url+userId+status; o publicId
    // do ws criado vai na response body (intercepter futuro pode capturá-lo se preciso).
  })
  async create(@Req() req: { user: { sub: number } }, @Body() dto: CreateWorkspaceDto) {
    const ws = await this.workspacesService.createWorkspace(req.user.sub, dto.name);
    return {
      publicId: ws.publicId,
      name: ws.name,
      status: ws.status,
      createdAt: ws.createdAt,
    };
  }
}
