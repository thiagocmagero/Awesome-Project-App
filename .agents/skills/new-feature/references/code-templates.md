# Code Templates — new-feature skill (internal reference)

Use these templates as starting points. Replace `Xxx`/`xxx`/`XXX` with the actual feature name.

---

## Backend — NestJS Module

```typescript
// backend/src/xxx/xxx.module.ts
import { Module } from '@nestjs/common';
import { XxxController } from './xxx.controller';
import { XxxService } from './xxx.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
// Add if needed:
// import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
// import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, ProjectsModule],
  controllers: [XxxController],
  providers: [XxxService],
  exports: [XxxService],
})
export class XxxModule {}
```

Register in `backend/src/app.module.ts`:
```typescript
import { XxxModule } from './xxx/xxx.module';
// Add XxxModule to the imports array
```

---

## Backend — Controller (project-scoped)

```typescript
// backend/src/xxx/xxx.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { RequireProjectPermission } from '../projects/decorators/require-project-permission.decorator';
import { ProjectAction } from '../projects/project-permissions';
import { XxxService } from './xxx.service';
import { CreateXxxDto } from './dto/create-xxx.dto';
import { UpdateXxxDto } from './dto/update-xxx.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('projects/:projectId/xxx')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
export class XxxController {
  constructor(private readonly xxxService: XxxService) {}

  @Get()
  @RequireProjectPermission(ProjectAction.XXX_VIEW)
  findAll(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.xxxService.findAll(projectId);
  }

  @Post()
  @RequireProjectPermission(ProjectAction.XXX_CREATE)
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateXxxDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.xxxService.create(projectId, dto, req.user.sub);
  }

  @Patch(':xxxId')
  @RequireProjectPermission(ProjectAction.XXX_EDIT)
  update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('xxxId', ParseUUIDPipe) xxxId: string,
    @Body() dto: UpdateXxxDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.xxxService.update(projectId, xxxId, dto, req.user.sub);
  }

  @Delete(':xxxId')
  @RequireProjectPermission(ProjectAction.XXX_DELETE)
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('xxxId', ParseUUIDPipe) xxxId: string,
    @Req() req: { user: JwtPayload },
  ) {
    return this.xxxService.remove(projectId, xxxId, req.user.sub);
  }
}
```

---

## Backend — Service (project-scoped)

```typescript
// backend/src/xxx/xxx.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateXxxDto } from './dto/create-xxx.dto';
import { UpdateXxxDto } from './dto/update-xxx.dto';

@Injectable()
export class XxxService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveProject(projectPublicId: string): Promise<number> {
    const project = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project.id;
  }

  private async resolveXxx(xxxPublicId: string, projectId: number): Promise<{ id: number; projectId: number }> {
    const xxx = await this.prisma.xxx.findUnique({
      where: { publicId: xxxPublicId, status: 'ACTIVE' },
      select: { id: true, projectId: true },
    });
    if (!xxx || xxx.projectId !== projectId) throw new NotFoundException('Xxx not found');
    return xxx;
  }

  async findAll(projectPublicId: string) {
    const projectId = await this.resolveProject(projectPublicId);
    return this.prisma.xxx.findMany({
      where: { projectId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        publicId: true,
        // ... select fields (never return numeric id)
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(projectPublicId: string, dto: CreateXxxDto, actorId: number) {
    const projectId = await this.resolveProject(projectPublicId);
    const result = await this.prisma.xxx.create({
      data: {
        projectId,
        createdById: actorId,
        // ... dto fields
      },
      select: { publicId: true /* ... */ },
    });
    return result;
  }

  async update(projectPublicId: string, xxxPublicId: string, dto: UpdateXxxDto, actorId: number) {
    const projectId = await this.resolveProject(projectPublicId);
    const xxx = await this.resolveXxx(xxxPublicId, projectId);
    return this.prisma.xxx.update({
      where: { id: xxx.id },
      data: { /* dto fields */ },
      select: { publicId: true /* ... */ },
    });
  }

  async remove(projectPublicId: string, xxxPublicId: string, actorId: number) {
    const projectId = await this.resolveProject(projectPublicId);
    const xxx = await this.resolveXxx(xxxPublicId, projectId);
    // Soft delete — never prisma.xxx.delete()
    await this.prisma.xxx.update({
      where: { id: xxx.id },
      data: { status: 'INACTIVE' },
    });
    return { success: true };
  }
}
```

---

## Backend — DTOs

```typescript
// backend/src/xxx/dto/create-xxx.dto.ts
import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateXxxDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  // For relations: accept publicId, service resolves to id
  @IsOptional()
  @IsUUID('all')
  relatedEntityPublicId?: string;
}

// backend/src/xxx/dto/update-xxx.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateXxxDto } from './create-xxx.dto';

export class UpdateXxxDto extends PartialType(CreateXxxDto) {}
```

---

## Prisma — New Model

```prisma
// Addition to backend/prisma/schema.prisma

model Xxx {
  id          Int      @id @default(autoincrement())
  publicId    String   @unique @default(uuid(7))
  projectId   Int
  createdById Int?
  // feature-specific fields here
  name        String
  description String?
  status      Status   @default(ACTIVE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy   User?    @relation(fields: [createdById], references: [id], onDelete: SetNull)

  @@index([projectId])
}
```

---

## Permissions — Add new ProjectActions

```typescript
// In backend/src/projects/project-permissions.ts

// 1. Add to enum ProjectAction:
export enum ProjectAction {
  // ... existing ...
  XXX_VIEW   = 'XXX_VIEW',
  XXX_CREATE = 'XXX_CREATE',
  XXX_EDIT   = 'XXX_EDIT',
  XXX_DELETE = 'XXX_DELETE',
}

// 2. Add to DEFAULT_PERMISSIONS:
export const DEFAULT_PERMISSIONS = {
  CONTRIBUTOR: new Set([
    // ... existing ...
    ProjectAction.XXX_VIEW,
    ProjectAction.XXX_CREATE,
    ProjectAction.XXX_EDIT,
    ProjectAction.XXX_DELETE,
  ]),
  READER: new Set([
    // ... existing ...
    ProjectAction.XXX_VIEW,
  ]),
};

// 3. Add to DELEGATABLE_ACTIONS:
export const DELEGATABLE_ACTIONS = new Set([
  // ... existing ...
  ProjectAction.XXX_CREATE,
  ProjectAction.XXX_EDIT,
  ProjectAction.XXX_DELETE,
]);

// 4. Add to ACTION_GROUPS (add a new group or add to existing):
export const ACTION_GROUPS = [
  // ... existing groups ...
  {
    key: 'xxx',
    actions: [
      ProjectAction.XXX_VIEW,
      ProjectAction.XXX_CREATE,
      ProjectAction.XXX_EDIT,
      ProjectAction.XXX_DELETE,
    ],
  },
];
```

Also add i18n keys to `backend/prisma/seeds/translations/permissions.json`:
```json
{
  "en":    { "action.XXX_VIEW": "View Xxx", "action.XXX_CREATE": "Create Xxx", ... },
  "es":    { "action.XXX_VIEW": "Ver Xxx", ... },
  "pt-BR": { "action.XXX_VIEW": "Ver Xxx", ... },
  "pt-PT": { "action.XXX_VIEW": "Ver Xxx", ... }
}
```

---

## Frontend — Feature Hook

```typescript
// frontend/src/features/xxx/useXxxData.ts
import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { getApiBase } from '../../lib/api';
import type { IXxx } from './types';

function resolveError(err: unknown, t: (k: string) => string): string {
  if (err instanceof Response) {
    if (err.status === 403) return t('common:errors.forbidden');
    if (err.status === 404) return t('common:errors.not_found');
  }
  return t('common:messages.network_error');
}

export function useXxxData(projectPublicId: string) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('xxx');
  const { t: tc } = useTranslation('common');

  const [data, setData] = useState<IXxx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (firstLoad.current) setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/projects/${projectPublicId}/xxx`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw res;
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(resolveError(err, tc));
    } finally {
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
    }
  }, [projectPublicId, token, tc]);

  const createXxx = useCallback(async (payload: { name: string; description?: string }) => {
    const res = await fetch(`${getApiBase()}/projects/${projectPublicId}/xxx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = Array.isArray(body.message) ? body.message[0] : (body.message ?? tc('messages.network_error'));
      showToast('danger', msg);
      return null;
    }
    showToast('success', t('success.created'));
    await fetchData();
    return await res.json();
  }, [projectPublicId, token, tc, t, fetchData, showToast]);

  const updateXxx = useCallback(async (publicId: string, payload: Partial<{ name: string }>) => {
    const res = await fetch(`${getApiBase()}/projects/${projectPublicId}/xxx/${publicId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { showToast('danger', tc('messages.network_error')); return false; }
    showToast('success', t('success.updated'));
    await fetchData();
    return true;
  }, [projectPublicId, token, tc, t, fetchData, showToast]);

  const removeXxx = useCallback(async (publicId: string) => {
    const res = await fetch(`${getApiBase()}/projects/${projectPublicId}/xxx/${publicId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { showToast('danger', tc('messages.network_error')); return false; }
    showToast('success', t('success.deleted'));
    await fetchData();
    return true;
  }, [projectPublicId, token, tc, t, fetchData, showToast]);

  return { data, loading, error, fetchData, createXxx, updateXxx, removeXxx };
}
```

---

## Frontend — Modal (Zynix pattern)

```tsx
// frontend/src/features/xxx/components/XxxModal.tsx
import { useState, useEffect, useRef, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { toFlatpickrFormat } from '../../../lib/dateFormatting';

declare const flatpickr: (el: HTMLElement, opts?: object) => { destroy(): void };

interface Props {
  open: boolean;
  existing?: { publicId: string; name: string; startDate?: string };
  onSave: (payload: { name: string; startDate?: string }) => Promise<void>;
  onClose: () => void;
}

export function XxxModal({ open, existing, onSave, onClose }: Props) {
  const { t } = useTranslation('xxx');
  const { t: tc } = useTranslation('common');
  const dateFormat = useResolvedDateFormat();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? '');
    setStartDate(existing?.startDate ?? '');
    setFormError(null);
  }, [open, existing]);

  // Overflow control
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // FlatPickr for date field
  useEffect(() => {
    if (!open || !dateRef.current || typeof flatpickr === 'undefined') return;
    const fp = flatpickr(dateRef.current, {
      dateFormat: toFlatpickrFormat(dateFormat, false),
      defaultDate: startDate || null,
      onChange: ([d]) => setStartDate(d?.toISOString() ?? ''),
    });
    return () => fp.destroy();
  }, [open, dateFormat]); // dateFormat in dep array — mandatory

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setFormError(t('form.name_required')); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), startDate: startDate || undefined });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">
                  {existing ? t('modal.edit_title') : t('modal.create_title')}
                </h5>
                <button type="button" className="btn-close" onClick={onClose} />
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger py-2">{formError}</div>}
                <div className="mb-3">
                  <label className="form-label">{t('form.name')}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('form.name_placeholder')}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('form.start_date')}</label>
                  <input type="text" className="form-control" ref={dateRef} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  {tc('actions.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? tc('messages.saving') : tc('actions.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
```

---

## Frontend — TypeScript types

```typescript
// frontend/src/features/xxx/types.ts

export interface IXxx {
  publicId: string;
  name: string;
  description?: string | null;
  // feature-specific fields
  createdAt: string;
  updatedAt: string;
}

export interface ICreateXxx {
  name: string;
  description?: string;
}

export interface IUpdateXxx extends Partial<ICreateXxx> {}
```

---

## i18n — Translation file template

```json
// backend/prisma/seeds/translations/xxx.json
{
  "en": {
    "page.title": "Xxx",
    "page.subtitle": "Manage xxx",
    "btn.new_xxx": "New Xxx",
    "modal.create_title": "New Xxx",
    "modal.edit_title": "Edit Xxx",
    "modal.delete.title": "Delete Xxx",
    "modal.delete.warning": "This action cannot be undone.",
    "form.name": "Name",
    "form.name_placeholder": "Enter a name...",
    "form.name_required": "Name is required.",
    "form.start_date": "Start date",
    "form.description": "Description",
    "success.created": "Created successfully.",
    "success.updated": "Updated successfully.",
    "success.deleted": "Deleted successfully.",
    "empty.no_items": "No items yet.",
    "empty.no_match": "No results found."
  },
  "es": {
    "page.title": "Xxx",
    "page.subtitle": "Gestionar xxx",
    "btn.new_xxx": "Nuevo Xxx",
    "modal.create_title": "Nuevo Xxx",
    "modal.edit_title": "Editar Xxx",
    "modal.delete.title": "Eliminar Xxx",
    "modal.delete.warning": "Esta acción no se puede deshacer.",
    "form.name": "Nombre",
    "form.name_placeholder": "Introduce un nombre...",
    "form.name_required": "El nombre es obligatorio.",
    "form.start_date": "Fecha de inicio",
    "form.description": "Descripción",
    "success.created": "Creado con éxito.",
    "success.updated": "Actualizado con éxito.",
    "success.deleted": "Eliminado con éxito.",
    "empty.no_items": "No hay elementos.",
    "empty.no_match": "No se encontraron resultados."
  },
  "pt-BR": {
    "page.title": "Xxx",
    "page.subtitle": "Gerenciar xxx",
    "btn.new_xxx": "Novo Xxx",
    "modal.create_title": "Novo Xxx",
    "modal.edit_title": "Editar Xxx",
    "modal.delete.title": "Excluir Xxx",
    "modal.delete.warning": "Esta ação não pode ser desfeita.",
    "form.name": "Nome",
    "form.name_placeholder": "Digite um nome...",
    "form.name_required": "O nome é obrigatório.",
    "form.start_date": "Data de início",
    "form.description": "Descrição",
    "success.created": "Criado com sucesso.",
    "success.updated": "Atualizado com sucesso.",
    "success.deleted": "Excluído com sucesso.",
    "empty.no_items": "Nenhum item encontrado.",
    "empty.no_match": "Nenhum resultado encontrado."
  },
  "pt-PT": {
    "page.title": "Xxx",
    "page.subtitle": "Gerir xxx",
    "btn.new_xxx": "Novo Xxx",
    "modal.create_title": "Novo Xxx",
    "modal.edit_title": "Editar Xxx",
    "modal.delete.title": "Eliminar Xxx",
    "modal.delete.warning": "Esta acção não pode ser desfeita.",
    "form.name": "Nome",
    "form.name_placeholder": "Introduza um nome...",
    "form.name_required": "O nome é obrigatório.",
    "form.start_date": "Data de início",
    "form.description": "Descrição",
    "success.created": "Criado com sucesso.",
    "success.updated": "Actualizado com sucesso.",
    "success.deleted": "Eliminado com sucesso.",
    "empty.no_items": "Sem itens.",
    "empty.no_match": "Sem resultados."
  }
}
```

---

## Feature Flag — seed.js addition

```javascript
// In backend/prisma/seed.js, inside the seeding function:
await prisma.featureFlag.upsert({
  where: { key: 'xxx_view' },
  update: {},
  create: {
    key: 'xxx_view',
    name: 'Xxx View',
    description: 'Enables access to the Xxx feature',
    enabledGlobally: false,
  },
});
```

---

## PlanningPage — New Tab (viewFrameStyle pattern)

```tsx
// In frontend/src/pages/PlanningPage.tsx

// 1. Add tab button to UnifiedToolbar tabs array:
{ key: 'xxx', label: t('planning:tab.xxx'), icon: 'ti ti-xxx' }

// 2. Wrap content with viewFrameStyle:
<div style={viewFrameStyle(pageTab === 'xxx')}>
  <XxxView projectId={project.publicId} />
</div>

// Note: viewFrameStyle(active) is already defined in PlanningPage.tsx
// const viewFrameStyle = (active: boolean): CSSProperties => ({
//   border: '1px solid #e6e4f0', borderRadius: '8px 8px 0 0',
//   overflow: 'hidden', boxShadow: '0 2px 12px rgba(115,93,255,0.07)',
//   background: '#fff', display: active ? 'flex' : 'none',
//   flexDirection: 'column', flex: viewFullscreen && active ? 1 : undefined, minHeight: 0,
// });
```
