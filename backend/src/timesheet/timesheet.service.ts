import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  TimesheetDayStatus,
  TimesheetLogAction,
  TimesheetLogScope,
  TimesheetWeekStatus,
} from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProjectPermissionsService } from '../projects/project-permissions.service';
import { ProjectAction } from '../projects/project-permissions';
import type { JwtPayload } from '../auth/jwt.strategy';
import { UpsertEntryDto } from './dto/upsert-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { DeleteRowDto } from './dto/delete-row.dto';
import { SubmitWeekDto } from './dto/submit-week.dto';
import { ApproveDayDto } from './dto/approve-day.dto';
import { ApproveWeekDto } from './dto/approve-week.dto';
import { ApproveMonthDto } from './dto/approve-month.dto';
import { RejectDayDto } from './dto/reject-day.dto';
import { CopyWeekDto, CopyWeekMode } from './dto/copy-week.dto';
import { GlobalApproveWeekDto } from './dto/global-approve-week.dto';
import { GlobalRejectWeekDto } from './dto/global-reject-week.dto';

/**
 * TimesheetService — toda a lógica de Timesheet.
 *
 * Padrões obrigatórios:
 * - publicId → id resolvido nos métodos resolveXxxId.
 * - Lazy-create de TimesheetWeek/TimesheetDay no upsertEntry e getWeek.
 * - Cada submit/approve/reject:
 *     1) actualiza TimesheetDay/Week dentro de uma transação.
 *     2) cria 1 linha em TimesheetApprovalLog na MESMA transação.
 *     3) chama recomputeWeekStatus(weekId) na MESMA transação.
 *     4) dispara notificações fire-and-forget DEPOIS do commit (`.catch(() => {})`).
 * - REQ-A06: nunca expõe update/delete de TimesheetApprovalLog.
 */
@Injectable()
export class TimesheetService {
  private readonly logger = new Logger(TimesheetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly perms: ProjectPermissionsService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private async resolveProjectId(projectPublicId: string): Promise<{ id: number; name: string }> {
    const p = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { id: true, name: true },
    });
    if (!p) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);
    return p;
  }

  private async resolveUserId(userPublicId: string): Promise<{ id: number; name: string }> {
    const u = await this.prisma.user.findUnique({
      where: { publicId: userPublicId },
      select: { id: true, name: true },
    });
    if (!u) throw new AppException('USER_NOT_FOUND', HttpStatus.NOT_FOUND);
    return u;
  }

  private async resolveTaskId(taskPublicId: string, projectId: number): Promise<{ id: number; text: string }> {
    const t = await this.prisma.ganttTask.findFirst({
      where: { publicId: taskPublicId, projectId },
      select: { id: true, text: true },
    });
    if (!t) throw new AppException('TIMESHEET_TASK_NOT_FOUND', HttpStatus.NOT_FOUND);
    return t;
  }

  /** ISO date 'YYYY-MM-DD' → UTC midnight Date. */
  private parseISODate(iso: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) {
      throw new AppException('INVALID_DATE', HttpStatus.BAD_REQUEST);
    }
    const [y, m, d] = iso.slice(0, 10).split('-').map((s) => parseInt(s, 10));
    return new Date(Date.UTC(y, m - 1, d));
  }

  /**
   * Calcula a segunda-feira UTC da semana ISO 8601 que contém esta data.
   * Se for já uma segunda-feira UTC, devolve a mesma data.
   */
  private weekStartOf(date: Date): Date {
    const d = new Date(date);
    const dow = d.getUTCDay(); // 0=Sun .. 6=Sat
    const offset = dow === 0 ? -6 : 1 - dow; // ISO 8601: Mon=1
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset));
  }

  /** Adiciona N dias UTC. */
  private addDays(date: Date, days: number): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
  }

  /** Lista de 7 dias UTC (Mon..Sun) começando em weekStart. */
  private daysOfWeek(weekStart: Date): Date[] {
    const out: Date[] = [];
    for (let i = 0; i < 7; i++) out.push(this.addDays(weekStart, i));
    return out;
  }

  /** Garante que weekStart é segunda-feira; lança se vier desalinhado. */
  private assertWeekStart(date: Date): void {
    if (date.getUTCDay() !== 1) {
      throw new AppException('INVALID_WEEK_START', HttpStatus.BAD_REQUEST);
    }
  }

  /** Lazy-create de TimesheetWeek por (projectId, userId, weekStart). */
  private async ensureWeek(
    tx: Prisma.TransactionClient | PrismaService,
    projectId: number,
    userId: number,
    weekStart: Date,
  ): Promise<{ id: number; status: TimesheetWeekStatus; submittedAt: Date | null }> {
    const existing = await tx.timesheetWeek.findUnique({
      where: { projectId_userId_weekStart: { projectId, userId, weekStart } },
      select: { id: true, status: true, submittedAt: true },
    });
    if (existing) return existing;
    const created = await tx.timesheetWeek.create({
      data: { projectId, userId, weekStart, status: TimesheetWeekStatus.DRAFT },
      select: { id: true, status: true, submittedAt: true },
    });
    return created;
  }

  /** Lazy-create de TimesheetDay por (weekId, workDate). */
  private async ensureDay(
    tx: Prisma.TransactionClient | PrismaService,
    weekId: number,
    workDate: Date,
  ): Promise<{ id: number; status: TimesheetDayStatus }> {
    const existing = await tx.timesheetDay.findUnique({
      where: { weekId_workDate: { weekId, workDate } },
      select: { id: true, status: true },
    });
    if (existing) return existing;
    const created = await tx.timesheetDay.create({
      data: { weekId, workDate, status: TimesheetDayStatus.DRAFT },
      select: { id: true, status: true },
    });
    return created;
  }

  /**
   * Recalcula week.status com base nos dias.
   *
   * Regra crítica (refinamento do utilizador, Abril 2026):
   * **PARTIAL = APPROVED + REJECTED apenas.** Dias sem lançamento são ignorados:
   * não contam como pendentes, não bloqueiam submissão e não influenciam o
   * estado da semana. O gestor aprova com base no contexto do projecto.
   *
   * Prioridade:
   *  1. Sem dias com entries → DRAFT.
   *  2. Existe ≥1 SUBMITTED → SUBMITTED (gestor ainda não terminou a revisão).
   *  3. Existe APPROVED **AND** REJECTED → PARTIAL.
   *  4. Existe APPROVED (sem rejeitados) → APPROVED.
   *  5. Existe REJECTED (sem aprovados) → REJECTED.
   *  6. Caso contrário (só DRAFT) → DRAFT.
   */
  private async recomputeWeekStatus(
    tx: Prisma.TransactionClient,
    weekId: number,
  ): Promise<TimesheetWeekStatus> {
    const days = await tx.timesheetDay.findMany({
      where: {
        weekId,
        // Só dias COM entries — REQ-D02 (zero não conta).
        // Dias em branco são ignorados (decisão do utilizador, Abril 2026).
        entries: { some: {} },
      },
      select: { status: true },
    });

    let next: TimesheetWeekStatus;
    if (days.length === 0) {
      next = TimesheetWeekStatus.DRAFT;
    } else {
      const hasApproved  = days.some((d) => d.status === TimesheetDayStatus.APPROVED);
      const hasRejected  = days.some((d) => d.status === TimesheetDayStatus.REJECTED);
      const hasSubmitted = days.some((d) => d.status === TimesheetDayStatus.SUBMITTED);

      if (hasSubmitted) next = TimesheetWeekStatus.SUBMITTED;
      else if (hasApproved && hasRejected) next = TimesheetWeekStatus.PARTIAL;
      else if (hasApproved) next = TimesheetWeekStatus.APPROVED;
      else if (hasRejected) next = TimesheetWeekStatus.REJECTED;
      else next = TimesheetWeekStatus.DRAFT;
    }

    await tx.timesheetWeek.update({ where: { id: weekId }, data: { status: next } });
    return next;
  }

  private assertEditable(dayStatus: TimesheetDayStatus): void {
    if (dayStatus === TimesheetDayStatus.SUBMITTED || dayStatus === TimesheetDayStatus.APPROVED) {
      throw new AppException('DAY_LOCKED', HttpStatus.CONFLICT);
    }
  }

  /**
   * Bloqueia mutações de dias DRAFT quando a SEMANA está em revisão
   * (SUBMITTED/PARTIAL) ou aprovada (APPROVED). Sem este check o utilizador
   * podia adicionar entries a dias vazios via `POST /entries` mesmo depois
   * de submeter — o que tornaria a submissão arquivada inconsistente com
   * o que o gestor está a rever. Para mexer, user tem de chamar
   * `unsubmit` (Editar semana) primeiro.
   *
   * REJECTED day continua editável aqui — é o caminho da resubmissão
   * pós-rejeição (REQ-T07–T10).
   */
  private assertWeekAllowsCellMutation(weekStatus: TimesheetWeekStatus, dayStatus: TimesheetDayStatus): void {
    const weekLocked =
      weekStatus === TimesheetWeekStatus.SUBMITTED ||
      weekStatus === TimesheetWeekStatus.PARTIAL ||
      weekStatus === TimesheetWeekStatus.APPROVED;
    if (weekLocked && dayStatus === TimesheetDayStatus.DRAFT) {
      throw new AppException('WEEK_LOCKED', HttpStatus.CONFLICT);
    }
  }

  /** Para uma data, devolve o 1º dia do mês UTC. */
  private monthStartOf(year: number, month: number): Date {
    return new Date(Date.UTC(year, month - 1, 1));
  }

  /** Para um (year, month), devolve o último dia do mês UTC (start-of-day). */
  private monthEndOf(year: number, month: number): Date {
    return new Date(Date.UTC(year, month, 0));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET week bundle (project-scoped)
  // ─────────────────────────────────────────────────────────────────────────────

  async getWeek(
    projectPublicId: string,
    requesting: JwtPayload,
    weekStartIso: string,
    targetUserPublicId?: string,
  ) {
    const project = await this.resolveProjectId(projectPublicId);
    const weekStart = this.parseISODate(weekStartIso);
    this.assertWeekStart(weekStart);

    // Se targetUserPublicId é diferente do requesting user → exige TIMESHEET_APPROVE
    let targetUserId = requesting.sub;
    if (targetUserPublicId) {
      const targetUser = await this.resolveUserId(targetUserPublicId);
      if (targetUser.id !== requesting.sub) {
        const can = await this.perms.can(project.id, requesting.sub, ProjectAction.TIMESHEET_APPROVE, requesting.profileCode);
        if (!can) throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
        targetUserId = targetUser.id;
      }
    }

    // Lazy-create do TimesheetWeek (idempotente)
    const week = await this.ensureWeek(this.prisma, project.id, targetUserId, weekStart);

    // Pré-criar 7 TimesheetDay (DRAFT) — útil para UI ter status para todos os dias
    // sem precisar de uma row dedicada para "vazio". Mantém ensureDay idempotente.
    // Optamos por NÃO pré-criar — o frontend trata dias sem registo como DRAFT.

    const [days, entries, projectTasks, member, weekFull] = await Promise.all([
      this.prisma.timesheetDay.findMany({
        where: { weekId: week.id },
        select: {
          publicId: true, workDate: true, status: true,
          approvedAt: true, rejectedAt: true, rejectionReason: true,
          approvedBy: { select: { publicId: true, name: true } },
          rejectedBy: { select: { publicId: true, name: true } },
        },
        orderBy: { workDate: 'asc' },
      }),
      this.prisma.timesheetEntry.findMany({
        where: { weekId: week.id },
        select: {
          publicId: true,
          taskId: true,
          task: { select: { publicId: true, text: true } },
          workDate: true,
          hours: true,
          comment: true,
        },
        orderBy: [{ workDate: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.ganttTask.findMany({
        where: { projectId: project.id, type: { in: ['task', 'milestone'] } },
        select: { publicId: true, text: true },
        orderBy: { text: 'asc' },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { publicId: true, name: true, email: true },
      }),
      this.prisma.timesheetWeek.findUnique({
        where: { id: week.id },
        select: { publicId: true, weekStart: true, status: true, submittedAt: true },
      }),
    ]);

    return {
      week: weekFull,
      days: days.map((d) => ({
        publicId:        d.publicId,
        workDate:        d.workDate.toISOString().slice(0, 10),
        status:          d.status,
        approvedAt:      d.approvedAt?.toISOString() ?? null,
        approvedBy:      d.approvedBy,
        rejectedAt:      d.rejectedAt?.toISOString() ?? null,
        rejectedBy:      d.rejectedBy,
        rejectionReason: d.rejectionReason,
      })),
      entries: entries.map((e) => ({
        publicId:     e.publicId,
        taskPublicId: e.task.publicId,
        taskText:     e.task.text,
        workDate:     e.workDate.toISOString().slice(0, 10),
        hours:        e.hours.toNumber ? e.hours.toNumber() : Number(e.hours),
        comment:      e.comment,
      })),
      tasks: projectTasks.map((t) => ({
        publicId: t.publicId,
        text:     t.text,
        projectName: project.name,
      })),
      member: member ? { publicId: member.publicId, name: member.name, isSelf: targetUserId === requesting.sub } : null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Mutações de entries (próprias)
  // ─────────────────────────────────────────────────────────────────────────────

  async upsertEntry(projectPublicId: string, userId: number, dto: UpsertEntryDto) {
    const project = await this.resolveProjectId(projectPublicId);
    const task = await this.resolveTaskId(dto.taskPublicId, project.id);
    const workDate = this.parseISODate(dto.workDate);
    const weekStart = this.weekStartOf(workDate);

    return this.prisma.$transaction(async (tx) => {
      const week = await this.ensureWeek(tx, project.id, userId, weekStart);
      const day = await this.ensureDay(tx, week.id, workDate);
      this.assertWeekAllowsCellMutation(week.status, day.status);
      this.assertEditable(day.status);

      // Existe entry para mesma (project, user, task, workDate)?
      const existing = await tx.timesheetEntry.findUnique({
        where: {
          uq_entry: { projectId: project.id, userId, taskId: task.id, workDate },
        },
        select: { id: true, hours: true },
      });

      if (existing) {
        // REQ-G20: agrega valor.
        const next = (existing.hours.toNumber ? existing.hours.toNumber() : Number(existing.hours)) + dto.hours;
        if (next > 999.99) throw new AppException('HOURS_OVERFLOW', HttpStatus.BAD_REQUEST);
        const updated = await tx.timesheetEntry.update({
          where: { id: existing.id },
          data: {
            hours: new Prisma.Decimal(next.toFixed(2)),
            // Se forneceu comment, mesclar — replace se não-vazio.
            comment: dto.comment ?? undefined,
          },
          select: { publicId: true, hours: true, comment: true, workDate: true, taskId: true },
        });
        return { publicId: updated.publicId, hours: Number(updated.hours), aggregated: true };
      }

      const created = await tx.timesheetEntry.create({
        data: {
          projectId: project.id,
          userId,
          taskId: task.id,
          weekId: week.id,
          dayId: day.id,
          workDate,
          weekStart,
          hours: new Prisma.Decimal(dto.hours.toFixed(2)),
          comment: dto.comment ?? null,
        },
        select: { publicId: true, hours: true, comment: true },
      });
      return { publicId: created.publicId, hours: Number(created.hours), aggregated: false };
    });
  }

  async updateEntry(projectPublicId: string, userId: number, entryPublicId: string, dto: UpdateEntryDto) {
    const project = await this.resolveProjectId(projectPublicId);
    const entry = await this.prisma.timesheetEntry.findUnique({
      where: { publicId: entryPublicId },
      select: { id: true, projectId: true, userId: true, day: { select: { status: true } } },
    });
    if (!entry || entry.projectId !== project.id) throw new AppException('ENTRY_NOT_FOUND', HttpStatus.NOT_FOUND);
    if (entry.userId !== userId) throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    this.assertEditable(entry.day.status);

    const data: Prisma.TimesheetEntryUpdateInput = {};
    if (dto.hours !== undefined) data.hours = new Prisma.Decimal(dto.hours.toFixed(2));
    if ('comment' in dto) data.comment = dto.comment ?? null;

    const updated = await this.prisma.timesheetEntry.update({
      where: { id: entry.id },
      data,
      select: { publicId: true, hours: true, comment: true },
    });
    return { publicId: updated.publicId, hours: Number(updated.hours), comment: updated.comment };
  }

  async deleteEntry(projectPublicId: string, userId: number, entryPublicId: string) {
    const project = await this.resolveProjectId(projectPublicId);
    const entry = await this.prisma.timesheetEntry.findUnique({
      where: { publicId: entryPublicId },
      select: { id: true, projectId: true, userId: true, weekId: true, day: { select: { status: true } } },
    });
    if (!entry || entry.projectId !== project.id) throw new AppException('ENTRY_NOT_FOUND', HttpStatus.NOT_FOUND);
    if (entry.userId !== userId) throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    this.assertEditable(entry.day.status);

    return this.prisma.$transaction(async (tx) => {
      await tx.timesheetEntry.delete({ where: { id: entry.id } });
      await this.recomputeWeekStatus(tx, entry.weekId);
      return { deleted: true };
    });
  }

  async deleteRow(projectPublicId: string, userId: number, dto: DeleteRowDto) {
    const project = await this.resolveProjectId(projectPublicId);
    const task = await this.resolveTaskId(dto.taskPublicId, project.id);
    const weekStart = this.parseISODate(dto.weekStart);
    this.assertWeekStart(weekStart);

    return this.prisma.$transaction(async (tx) => {
      // Garantir que NENHUM dia (com entries desta task na semana) está bloqueado.
      const entries = await tx.timesheetEntry.findMany({
        where: { projectId: project.id, userId, taskId: task.id, weekStart },
        select: { id: true, day: { select: { status: true } }, weekId: true },
      });
      if (entries.length === 0) return { deleted: 0 };

      for (const e of entries) {
        if (e.day.status === TimesheetDayStatus.SUBMITTED || e.day.status === TimesheetDayStatus.APPROVED) {
          throw new AppException('ROW_HAS_SUBMITTED', HttpStatus.CONFLICT);
        }
      }

      await tx.timesheetEntry.deleteMany({
        where: { projectId: project.id, userId, taskId: task.id, weekStart },
      });
      // Re-compute para a semana (entries desapareceram, status pode regredir)
      const weekId = entries[0].weekId;
      await this.recomputeWeekStatus(tx, weekId);
      return { deleted: entries.length };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Submeter semana
  // ─────────────────────────────────────────────────────────────────────────────

  async submitWeek(projectPublicId: string, requesting: JwtPayload, dto: SubmitWeekDto) {
    const project = await this.resolveProjectId(projectPublicId);
    const weekStart = this.parseISODate(dto.weekStart);
    this.assertWeekStart(weekStart);

    const result = await this.prisma.$transaction(async (tx) => {
      const week = await this.ensureWeek(tx, project.id, requesting.sub, weekStart);
      // Mover dias DRAFT/REJECTED com entries para SUBMITTED.
      const days = await tx.timesheetDay.findMany({
        where: {
          weekId: week.id,
          status: { in: [TimesheetDayStatus.DRAFT, TimesheetDayStatus.REJECTED] },
          entries: { some: {} },
        },
        select: { id: true, workDate: true, status: true },
      });
      if (days.length === 0) {
        throw new AppException('NOTHING_TO_SUBMIT', HttpStatus.BAD_REQUEST);
      }

      const isResubmit = days.some((d) => d.status === TimesheetDayStatus.REJECTED);

      await tx.timesheetDay.updateMany({
        where: { id: { in: days.map((d) => d.id) } },
        data: {
          status: TimesheetDayStatus.SUBMITTED,
          rejectedById: null,
          rejectedAt: null,
          rejectionReason: null,
        },
      });

      // Marcar week.submittedAt na primeira submissão; em re-submit não tocar.
      const updateData: Prisma.TimesheetWeekUpdateInput = {};
      if (!week.submittedAt) updateData.submittedAt = new Date();

      const newStatus = await this.recomputeWeekStatus(tx, week.id);
      if (Object.keys(updateData).length > 0) {
        await tx.timesheetWeek.update({ where: { id: week.id }, data: updateData });
      }

      // Audit log
      await tx.timesheetApprovalLog.create({
        data: {
          weekId: week.id,
          actorId: requesting.sub,
          action: isResubmit ? TimesheetLogAction.RESUBMIT : TimesheetLogAction.SUBMIT,
          scope: TimesheetLogScope.WEEK,
          scopeDate: weekStart,
        },
      });

      return { weekId: week.id, status: newStatus, submittedDays: days.length };
    });

    // Notificar aprovadores fire-and-forget
    this.notifySubmitters(project.id, project.name, requesting.sub, weekStart, projectPublicId)
      .catch((e) => this.logger.error('notifySubmitters failed', e));

    return { status: result.status, submittedDays: result.submittedDays };
  }

  private async notifySubmitters(
    projectId: number,
    projectName: string,
    submitterUserId: number,
    weekStart: Date,
    projectPublicId: string,
  ): Promise<void> {
    const submitter = await this.prisma.user.findUnique({
      where: { id: submitterUserId },
      select: { name: true },
    });
    if (!submitter) return;

    const approverIds = await this.perms.findUserIdsWithAction(projectId, ProjectAction.TIMESHEET_APPROVE);
    for (const approverId of approverIds) {
      if (approverId === submitterUserId) continue; // não notificar a si próprio
      this.notifications.createTimesheetSubmittedNotification(
        approverId, submitter.name, projectName, projectPublicId, weekStart.toISOString().slice(0, 10),
      ).catch(() => {});
    }
  }

  /**
   * "Editar semana" do próprio utilizador — reverte days SUBMITTED para DRAFT
   * (o utilizador desistiu da submissão antes do gestor agir).
   *
   * Não toca days APPROVED nem REJECTED. Cria audit log com action=REVERT,
   * scope=WEEK. Sem notificação a ninguém — é acção interna do user.
   */
  async unsubmitWeek(projectPublicId: string, requesting: JwtPayload, dto: SubmitWeekDto) {
    const project = await this.resolveProjectId(projectPublicId);
    const weekStart = this.parseISODate(dto.weekStart);
    this.assertWeekStart(weekStart);

    const result = await this.prisma.$transaction(async (tx) => {
      const week = await this.ensureWeek(tx, project.id, requesting.sub, weekStart);
      const days = await tx.timesheetDay.findMany({
        where: { weekId: week.id, status: TimesheetDayStatus.SUBMITTED },
        select: { id: true },
      });
      if (days.length === 0) {
        throw new AppException('NOTHING_TO_UNSUBMIT', HttpStatus.CONFLICT);
      }
      await tx.timesheetDay.updateMany({
        where: { id: { in: days.map((d) => d.id) } },
        data: {
          status: TimesheetDayStatus.DRAFT,
          rejectedById: null,
          rejectedAt: null,
          rejectionReason: null,
        },
      });
      // Limpar `submittedAt` se já não há nenhum dia submetido nem aprovado/rejeitado.
      // Mantemos a data se ainda houver decisões finais (audit trail).
      const remaining = await tx.timesheetDay.count({
        where: {
          weekId: week.id,
          status: { in: [TimesheetDayStatus.SUBMITTED, TimesheetDayStatus.APPROVED, TimesheetDayStatus.REJECTED] },
        },
      });
      if (remaining === 0) {
        await tx.timesheetWeek.update({ where: { id: week.id }, data: { submittedAt: null } });
      }
      await tx.timesheetApprovalLog.create({
        data: {
          weekId: week.id,
          actorId: requesting.sub,
          action: TimesheetLogAction.REVERT,
          scope: TimesheetLogScope.WEEK,
          scopeDate: weekStart,
        },
      });
      const newStatus = await this.recomputeWeekStatus(tx, week.id);
      return { status: newStatus, reverted: days.length };
    });

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Copiar semana
  // ─────────────────────────────────────────────────────────────────────────────

  async copyWeek(projectPublicId: string, userId: number, dto: CopyWeekDto) {
    const project = await this.resolveProjectId(projectPublicId);
    const fromStart = this.parseISODate(dto.fromWeekStart);
    const toStart = this.parseISODate(dto.toWeekStart);
    this.assertWeekStart(fromStart);
    this.assertWeekStart(toStart);

    // REQ-C09/C10: destino só DRAFT ou semana com dias em REJECTED (i.e., não APPROVED/PARTIAL/SUBMITTED).
    const destWeek = await this.prisma.timesheetWeek.findUnique({
      where: { projectId_userId_weekStart: { projectId: project.id, userId, weekStart: toStart } },
      select: { status: true },
    });
    if (destWeek && destWeek.status !== TimesheetWeekStatus.DRAFT && destWeek.status !== TimesheetWeekStatus.REJECTED) {
      throw new AppException('COPY_DESTINATION_LOCKED', HttpStatus.CONFLICT);
    }

    const source = await this.prisma.timesheetEntry.findMany({
      where: { projectId: project.id, userId, weekStart: fromStart },
      select: {
        taskId: true,
        workDate: true,
        hours: true,
        comment: true,
      },
    });
    if (source.length === 0) return { created: 0, skipped: 0 };

    const offsetDays = Math.round((toStart.getTime() - fromStart.getTime()) / (24 * 3600 * 1000));

    return this.prisma.$transaction(async (tx) => {
      const week = await this.ensureWeek(tx, project.id, userId, toStart);

      let created = 0;
      let skipped = 0;
      for (const e of source) {
        const newDate = this.addDays(e.workDate, offsetDays);

        // Conflito?
        const existing = await tx.timesheetEntry.findUnique({
          where: { uq_entry: { projectId: project.id, userId, taskId: e.taskId, workDate: newDate } },
          select: { id: true, day: { select: { status: true } } },
        });
        if (existing) {
          if (existing.day.status !== TimesheetDayStatus.DRAFT && existing.day.status !== TimesheetDayStatus.REJECTED) {
            skipped++;
            continue;
          }
          if (!dto.overwrite) {
            skipped++;
            continue;
          }
          // Overwrite — substitui hours/comment conforme modo
          if (dto.mode === CopyWeekMode.TASKS_ONLY) {
            // Manter linha mas zerar comment? Não — no modo TASKS_ONLY simplesmente apagamos a entry conflituante
            await tx.timesheetEntry.delete({ where: { id: existing.id } });
            skipped++; // contabilizar como skipped (nada novo criado)
            continue;
          }
          const newHours = e.hours;
          const newComment = dto.mode === CopyWeekMode.TASKS_HOURS_COMMENTS ? e.comment : null;
          await tx.timesheetEntry.update({
            where: { id: existing.id },
            data: { hours: newHours, comment: newComment },
          });
          created++;
          continue;
        }

        if (dto.mode === CopyWeekMode.TASKS_ONLY) {
          // Não cria entry — só faria sentido criar um "marker" de linha,
          // mas a grelha mostra linha com base nas entries presentes. REQ-G21:
          // se task não existe na grelha, é criada nova linha. No modo TASKS_ONLY
          // sem horas, não temos como "ter linha sem entries". Solução: cria com hours=0.10
          // não — REQ-D02 zero não permite.
          // Decisão pragmática: no modo TASKS_ONLY, não copia (manter consistência com REQ-D02).
          // Frontend deve usar este modo apenas para inspirar o utilizador a re-lançar.
          skipped++;
          continue;
        }

        const day = await this.ensureDay(tx, week.id, newDate);
        // Se day estiver bloqueado (improvável no destino editável), saltar.
        if (day.status !== TimesheetDayStatus.DRAFT && day.status !== TimesheetDayStatus.REJECTED) {
          skipped++;
          continue;
        }

        const comment = dto.mode === CopyWeekMode.TASKS_HOURS_COMMENTS ? e.comment : null;

        await tx.timesheetEntry.create({
          data: {
            projectId: project.id,
            userId,
            taskId: e.taskId,
            weekId: week.id,
            dayId: day.id,
            workDate: newDate,
            weekStart: toStart,
            hours: e.hours,
            comment,
          },
        });
        created++;
      }

      // Sem audit log para copy — não é uma transição de estado.
      return { created, skipped };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Vista mensal — macro-overview do gestor (Abril 2026)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Devolve a contagem por dia para a vista mensal do gestor.
   *
   * Modos:
   *  - **Agregado** (`userPublicId` omitido): para cada dia, contagem
   *    `filledCount/totalCount` e lista de utilizadores em falta.
   *  - **Individual** (`userPublicId` definido): para cada dia, `filled: bool`
   *    indicando se aquele user específico tem ≥1 lançamento nesse dia.
   *
   * Inclui o status de cada semana ISO 8601 visível para a coluna "SEMANA".
   * Respeita as datas do projecto: dias fora do `Project.startDate`/`endDate`
   * são marcados `outOfRange: true` (frontend renderiza com tracejado).
   */
  async getMonthCalendar(
    projectPublicId: string,
    monthIso: string,                   // 'YYYY-MM'
    userPublicId?: string,
  ) {
    if (!/^\d{4}-\d{2}$/.test(monthIso)) {
      throw new AppException('INVALID_MONTH', HttpStatus.BAD_REQUEST);
    }
    const [yearStr, monthStr] = monthIso.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (month < 1 || month > 12) {
      throw new AppException('INVALID_MONTH', HttpStatus.BAD_REQUEST);
    }

    const project = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { id: true, startDate: true, endDate: true },
    });
    if (!project) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);

    // Range visível: 6 semanas começando na segunda-feira da semana que
    // contém o dia 1 do mês. Total = 42 dias (alinhado com FullCalendar dayGridMonth).
    const monthStart = this.monthStartOf(year, month);
    const visibleStart = this.weekStartOf(monthStart);
    const visibleEnd = this.addDays(visibleStart, 42); // exclusive

    // Lista de membros do projecto (owner + ProjectMembers ACCEPTED + Team members)
    const members = await this.collectProjectMembers(project.id);
    const memberIds = members.map((m) => m.id);
    const memberMap = new Map(members.map((m) => [m.id, m]));

    // Modo individual? Resolve user e valida que faz parte da equipa.
    let targetUserId: number | null = null;
    if (userPublicId) {
      const u = await this.resolveUserId(userPublicId);
      targetUserId = u.id;
    }

    // Buscar todas as entries no range, agrupadas por (userId, workDate).
    // Usamos groupBy para eficiência — só precisamos de saber QUEM lançou e em QUE DIA.
    const entries = await this.prisma.timesheetEntry.groupBy({
      by: ['userId', 'workDate'],
      where: {
        projectId: project.id,
        userId: targetUserId !== null ? { equals: targetUserId } : { in: memberIds },
        workDate: { gte: visibleStart, lt: visibleEnd },
      },
    });

    // Soma total de horas no PROJECTO (não restrito ao mês) para o card de resumo:
    //  - Modo agregado: soma da equipa toda.
    //  - Modo individual: soma do user seleccionado.
    // Decimal devolvido pelo Prisma → convertido para number na resposta.
    const totalHoursAgg = await this.prisma.timesheetEntry.aggregate({
      where: {
        projectId: project.id,
        userId: targetUserId !== null ? { equals: targetUserId } : { in: memberIds },
      },
      _sum: { hours: true },
    });
    const totalHours = Number(totalHoursAgg._sum.hours ?? 0);

    // Indexar entries por workDate ISO
    const filledByDate = new Map<string, Set<number>>();
    for (const e of entries) {
      const iso = this.toIsoDate(e.workDate);
      let s = filledByDate.get(iso);
      if (!s) { s = new Set(); filledByDate.set(iso, s); }
      s.add(e.userId);
    }

    const todayIso = this.toIsoDate(new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
    )));

    const days: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 42; i++) {
      const d = this.addDays(visibleStart, i);
      const iso = this.toIsoDate(d);
      const dow = d.getUTCDay();
      const isWeekend = dow === 0 || dow === 6;
      const outOfRange = this.isOutOfProjectRange(d, project.startDate, project.endDate);
      const isFuture = iso > todayIso;
      const inMonth = d.getUTCMonth() === month - 1;

      const filledSet = filledByDate.get(iso) ?? new Set<number>();

      if (targetUserId !== null) {
        days.push({
          date: iso,
          inMonth,
          isWeekend,
          isFuture,
          outOfRange,
          filled: filledSet.has(targetUserId),
        });
      } else {
        const filledCount = filledSet.size;
        const totalCount = members.length;
        const missingUsers = members
          .filter((m) => !filledSet.has(m.id))
          .map((m) => ({ publicId: m.publicId, name: m.name, initials: this.initialsOf(m.name) }));
        days.push({
          date: iso,
          inMonth,
          isWeekend,
          isFuture,
          outOfRange,
          filledCount,
          totalCount,
          missingUsers,
        });
      }
    }

    // Resumo das 6 semanas — derivado dos dias.
    const weeks: Array<Record<string, unknown>> = [];
    for (let i = 0; i < 6; i++) {
      const wStart = this.addDays(visibleStart, i * 7);
      const wDays = days.slice(i * 7, i * 7 + 7);
      // Status da semana — só conta dias dentro do projecto, não-futuros, não-fim-de-semana.
      const operativeDays = wDays.filter((d) =>
        !d.outOfRange && !d.isWeekend && !d.isFuture,
      );
      const weekNumber = this.isoWeekNumber(wStart);
      const containsToday = wDays.some((d) => d.date === todayIso);

      let status: 'complete' | 'partial' | 'pending' | 'future' | 'out_of_range' | 'mixed';
      if (operativeDays.length === 0) {
        // Toda a semana fora do projecto / fim-de-semana / futura
        const allFuture = wDays.every((d) => d.isFuture || d.isWeekend || d.outOfRange);
        const allOutOfRange = wDays.every((d) => d.outOfRange || d.isWeekend);
        status = allOutOfRange ? 'out_of_range' : (allFuture ? 'future' : 'mixed');
      } else if (targetUserId !== null) {
        // Modo individual
        const filledOps = operativeDays.filter((d) => d.filled).length;
        if (filledOps === operativeDays.length) status = 'complete';
        else if (filledOps === 0) status = 'pending';
        else status = 'partial';
      } else {
        // Modo agregado
        const completeOps = operativeDays.filter((d) =>
          (d.filledCount as number) > 0 && (d.filledCount as number) === (d.totalCount as number),
        ).length;
        const pendingOps = operativeDays.filter((d) => (d.filledCount as number) === 0).length;
        if (completeOps === operativeDays.length) status = 'complete';
        else if (pendingOps === operativeDays.length) status = 'pending';
        else status = 'partial';
      }

      weeks.push({
        weekStart: this.toIsoDate(wStart),
        weekNumber,
        status,
        containsToday,
      });
    }

    return {
      project: {
        publicId: projectPublicId,
        startDate: project.startDate ? this.toIsoDate(project.startDate) : null,
        endDate: project.endDate ? this.toIsoDate(project.endDate) : null,
      },
      month: monthIso,
      visibleStart: this.toIsoDate(visibleStart),
      mode: targetUserId !== null ? 'individual' : 'aggregate',
      members: members.map((m) => ({ publicId: m.publicId, name: m.name, initials: this.initialsOf(m.name) })),
      days,
      weeks,
      totalHours,
    };
  }

  /** Helper: ISO 'YYYY-MM-DD' a partir de Date UTC. */
  private toIsoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /** Helper: dia está fora do range do projecto? */
  private isOutOfProjectRange(d: Date, start: Date | null, end: Date | null): boolean {
    if (start && d < this.stripTime(start)) return true;
    if (end && d > this.stripTime(end)) return true;
    return false;
  }

  private stripTime(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  /** ISO 8601 week number (semana 1 = a primeira com 4+ dias no ano). */
  private isoWeekNumber(d: Date): number {
    const target = new Date(d);
    target.setUTCHours(0, 0, 0, 0);
    target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
    const week1 = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((target.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getUTCDay() + 6) % 7)) / 7);
  }

  /** Lista membros do projecto (owner + ProjectMembers ACCEPTED + team members). */
  private async collectProjectMembers(
    projectId: number,
  ): Promise<Array<{ id: number; publicId: string; name: string }>> {
    const projectFull = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        owner: { select: { id: true, publicId: true, name: true } },
        members: {
          where: { status: 'ACCEPTED' },
          select: { user: { select: { id: true, publicId: true, name: true } } },
        },
        teams: {
          select: {
            team: {
              select: {
                members: { select: { user: { select: { id: true, publicId: true, name: true } } } },
              },
            },
          },
        },
      },
    });
    if (!projectFull) return [];

    const map = new Map<number, { id: number; publicId: string; name: string }>();
    if (projectFull.owner) map.set(projectFull.owner.id, projectFull.owner);
    for (const m of projectFull.members) if (m.user) map.set(m.user.id, m.user);
    for (const pt of projectFull.teams) {
      for (const tm of pt.team.members) if (tm.user) map.set(tm.user.id, tm.user);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Equipa & aprovações (project-scoped)
  // ─────────────────────────────────────────────────────────────────────────────

  async getTeam(projectPublicId: string, weekStartIso: string, statusFilter?: TimesheetWeekStatus) {
    const project = await this.resolveProjectId(projectPublicId);
    const weekStart = this.parseISODate(weekStartIso);
    this.assertWeekStart(weekStart);

    // Membros: owner + ProjectMember(ACCEPTED) + Team members.
    const projectFull = await this.prisma.project.findUnique({
      where: { id: project.id },
      select: {
        owner: { select: { id: true, publicId: true, name: true } },
        members: {
          where: { status: 'ACCEPTED' },
          select: { user: { select: { id: true, publicId: true, name: true } } },
        },
        teams: {
          select: {
            team: {
              select: {
                members: { select: { user: { select: { id: true, publicId: true, name: true } } } },
              },
            },
          },
        },
      },
    });
    if (!projectFull) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);

    const userMap = new Map<number, { id: number; publicId: string; name: string }>();
    if (projectFull.owner) userMap.set(projectFull.owner.id, projectFull.owner);
    for (const m of projectFull.members) if (m.user) userMap.set(m.user.id, m.user);
    for (const pt of projectFull.teams) for (const tm of pt.team.members) if (tm.user) userMap.set(tm.user.id, tm.user);

    const userIds = Array.from(userMap.keys());

    const weeks = await this.prisma.timesheetWeek.findMany({
      where: { projectId: project.id, userId: { in: userIds }, weekStart },
      select: { publicId: true, userId: true, status: true },
    });
    const weekByUser = new Map(weeks.map((w) => [w.userId, w]));

    // Total de horas por user nesta semana
    const totalsByUser = await this.prisma.timesheetEntry.groupBy({
      by: ['userId'],
      where: { projectId: project.id, userId: { in: userIds }, weekStart },
      _sum: { hours: true },
    });
    const totalMap = new Map(totalsByUser.map((t) => [t.userId, t._sum.hours ? Number(t._sum.hours) : 0]));

    let rows = userIds.map((uid) => {
      const u = userMap.get(uid)!;
      const w = weekByUser.get(uid);
      return {
        user:        { publicId: u.publicId, name: u.name, initials: this.initialsOf(u.name) },
        weekStart:   weekStart.toISOString().slice(0, 10),
        status:      (w?.status ?? TimesheetWeekStatus.DRAFT) as TimesheetWeekStatus,
        totalHours:  totalMap.get(uid) ?? 0,
        weekPublicId: w?.publicId ?? null,
      };
    });
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);

    const counts: Record<string, number> = {
      all: rows.length, SUBMITTED: 0, APPROVED: 0, REJECTED: 0, PARTIAL: 0, DRAFT: 0,
    };
    for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;

    return { rows, counts };
  }

  private initialsOf(name: string): string {
    return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  async approveDay(projectPublicId: string, actor: JwtPayload, dto: ApproveDayDto) {
    const project = await this.resolveProjectId(projectPublicId);
    const target = await this.resolveUserId(dto.userPublicId);
    const workDate = this.parseISODate(dto.workDate);
    const weekStart = this.weekStartOf(workDate);

    const result = await this.prisma.$transaction(async (tx) => {
      const week = await this.ensureWeek(tx, project.id, target.id, weekStart);
      const day = await this.ensureDay(tx, week.id, workDate);
      if (day.status !== TimesheetDayStatus.SUBMITTED) {
        throw new AppException('INVALID_DAY_STATUS', HttpStatus.CONFLICT);
      }
      await tx.timesheetDay.update({
        where: { id: day.id },
        data: { status: TimesheetDayStatus.APPROVED, approvedById: actor.sub, approvedAt: new Date(),
                rejectedById: null, rejectedAt: null, rejectionReason: null },
      });
      await tx.timesheetApprovalLog.create({
        data: { weekId: week.id, actorId: actor.sub, action: TimesheetLogAction.APPROVE,
                scope: TimesheetLogScope.DAY, scopeDate: workDate },
      });
      const newStatus = await this.recomputeWeekStatus(tx, week.id);
      return { weekId: week.id, status: newStatus };
    });

    this.notifyOnStatus(target.id, project.id, project.name, projectPublicId, weekStart, result.status, actor.sub)
      .catch((e) => this.logger.error('notifyOnStatus failed', e));
    return { status: result.status };
  }

  async approveWeek(projectPublicId: string, actor: JwtPayload, dto: ApproveWeekDto) {
    const project = await this.resolveProjectId(projectPublicId);
    const target = await this.resolveUserId(dto.userPublicId);
    const weekStart = this.parseISODate(dto.weekStart);
    this.assertWeekStart(weekStart);

    const result = await this.prisma.$transaction(async (tx) => {
      const week = await this.ensureWeek(tx, project.id, target.id, weekStart);
      const days = await tx.timesheetDay.findMany({
        where: { weekId: week.id, status: TimesheetDayStatus.SUBMITTED },
        select: { id: true },
      });
      if (days.length === 0) {
        throw new AppException('NOTHING_TO_APPROVE', HttpStatus.CONFLICT);
      }
      await tx.timesheetDay.updateMany({
        where: { id: { in: days.map((d) => d.id) } },
        data: { status: TimesheetDayStatus.APPROVED, approvedById: actor.sub, approvedAt: new Date() },
      });
      await tx.timesheetApprovalLog.create({
        data: { weekId: week.id, actorId: actor.sub, action: TimesheetLogAction.APPROVE,
                scope: TimesheetLogScope.WEEK, scopeDate: weekStart },
      });
      const newStatus = await this.recomputeWeekStatus(tx, week.id);
      return { weekId: week.id, status: newStatus };
    });

    this.notifyOnStatus(target.id, project.id, project.name, projectPublicId, weekStart, result.status, actor.sub)
      .catch((e) => this.logger.error('notifyOnStatus failed', e));
    return { status: result.status };
  }

  async approveMonth(projectPublicId: string, actor: JwtPayload, dto: ApproveMonthDto) {
    const project = await this.resolveProjectId(projectPublicId);
    const target = await this.resolveUserId(dto.userPublicId);
    const monthStart = this.monthStartOf(dto.year, dto.month);
    const monthEnd = this.monthEndOf(dto.year, dto.month);

    // Listar weeks que tocam este mês
    const weeks = await this.prisma.timesheetWeek.findMany({
      where: {
        projectId: project.id, userId: target.id,
        // Algum dia da semana dentro do mês
        days: { some: { workDate: { gte: monthStart, lte: monthEnd } } },
      },
      select: { id: true, weekStart: true },
    });
    if (weeks.length === 0) return { status: null, weeksTouched: 0 };

    const touchedWeekIds: number[] = [];
    for (const w of weeks) {
      await this.prisma.$transaction(async (tx) => {
        const days = await tx.timesheetDay.findMany({
          where: {
            weekId: w.id,
            status: TimesheetDayStatus.SUBMITTED,
            workDate: { gte: monthStart, lte: monthEnd },
          },
          select: { id: true },
        });
        if (days.length === 0) return;
        await tx.timesheetDay.updateMany({
          where: { id: { in: days.map((d) => d.id) } },
          data: { status: TimesheetDayStatus.APPROVED, approvedById: actor.sub, approvedAt: new Date() },
        });
        await tx.timesheetApprovalLog.create({
          data: { weekId: w.id, actorId: actor.sub, action: TimesheetLogAction.APPROVE,
                  scope: TimesheetLogScope.MONTH, scopeDate: monthStart },
        });
        const newStatus = await this.recomputeWeekStatus(tx, w.id);
        touchedWeekIds.push(w.id);
        // Notificar — fora da transação
        setImmediate(() => {
          this.notifyOnStatus(target.id, project.id, project.name, projectPublicId, w.weekStart, newStatus, actor.sub)
            .catch((e) => this.logger.error('notifyOnStatus failed', e));
        });
      });
    }

    return { status: null, weeksTouched: touchedWeekIds.length };
  }

  async rejectDay(projectPublicId: string, actor: JwtPayload, dto: RejectDayDto) {
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new AppException('REASON_REQUIRED', HttpStatus.BAD_REQUEST);
    }
    const project = await this.resolveProjectId(projectPublicId);
    const target = await this.resolveUserId(dto.userPublicId);
    const workDate = this.parseISODate(dto.workDate);
    const weekStart = this.weekStartOf(workDate);

    const result = await this.prisma.$transaction(async (tx) => {
      const week = await this.ensureWeek(tx, project.id, target.id, weekStart);
      const day = await this.ensureDay(tx, week.id, workDate);
      if (day.status !== TimesheetDayStatus.SUBMITTED) {
        throw new AppException('INVALID_DAY_STATUS', HttpStatus.CONFLICT);
      }
      await tx.timesheetDay.update({
        where: { id: day.id },
        data: {
          status: TimesheetDayStatus.REJECTED,
          rejectedById: actor.sub,
          rejectedAt: new Date(),
          rejectionReason: dto.reason.trim(),
          approvedById: null,
          approvedAt: null,
        },
      });
      await tx.timesheetApprovalLog.create({
        data: { weekId: week.id, actorId: actor.sub, action: TimesheetLogAction.REJECT,
                scope: TimesheetLogScope.DAY, scopeDate: workDate, reason: dto.reason.trim() },
      });
      const newStatus = await this.recomputeWeekStatus(tx, week.id);
      return { weekId: week.id, status: newStatus };
    });

    // Notificar user com TIMESHEET_REJECTED (sempre — REQ-N04 exige reason).
    const actorUser = await this.prisma.user.findUnique({ where: { id: actor.sub }, select: { name: true } });
    this.notifications
      .createTimesheetRejectedNotification(
        target.id, actorUser?.name ?? '', project.name, projectPublicId,
        workDate.toISOString().slice(0, 10), dto.reason.trim(),
      )
      .catch(() => {});

    return { status: result.status };
  }

  // Notifica APPROVED ou PARTIALLY_APPROVED conforme novo estado da semana.
  private async notifyOnStatus(
    submitterUserId: number,
    projectId: number,
    projectName: string,
    projectPublicId: string,
    weekStart: Date,
    weekStatus: TimesheetWeekStatus,
    actorId: number,
  ): Promise<void> {
    if (submitterUserId === actorId) return; // self-approve não notifica
    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { name: true } });
    const actorName = actor?.name ?? '';
    const weekStartIso = weekStart.toISOString().slice(0, 10);
    if (weekStatus === TimesheetWeekStatus.APPROVED) {
      this.notifications
        .createTimesheetApprovedNotification(submitterUserId, actorName, projectName, projectPublicId, weekStartIso)
        .catch(() => {});
    } else if (weekStatus === TimesheetWeekStatus.PARTIAL) {
      this.notifications
        .createTimesheetPartiallyApprovedNotification(submitterUserId, actorName, projectName, projectPublicId, weekStartIso)
        .catch(() => {});
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Editar aprovação/rejeição (revert) — Abril 2026
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Reverte todos os dias APPROVED/REJECTED da semana de volta para SUBMITTED,
   * permitindo ao gestor re-aprovar/re-rejeitar. Cria 1 linha em
   * TimesheetApprovalLog com action=REVERT, scope=WEEK.
   *
   * Dias DRAFT mantêm-se DRAFT (nunca foram submetidos).
   */
  async revertWeek(projectPublicId: string, actor: JwtPayload, dto: ApproveWeekDto) {
    const project = await this.resolveProjectId(projectPublicId);
    const target = await this.resolveUserId(dto.userPublicId);
    const weekStart = this.parseISODate(dto.weekStart);
    this.assertWeekStart(weekStart);

    const result = await this.prisma.$transaction(async (tx) => {
      const week = await this.ensureWeek(tx, project.id, target.id, weekStart);
      const days = await tx.timesheetDay.findMany({
        where: {
          weekId: week.id,
          status: { in: [TimesheetDayStatus.APPROVED, TimesheetDayStatus.REJECTED] },
        },
        select: { id: true },
      });
      if (days.length === 0) {
        throw new AppException('NOTHING_TO_REVERT', HttpStatus.CONFLICT);
      }
      await tx.timesheetDay.updateMany({
        where: { id: { in: days.map((d) => d.id) } },
        data: {
          status: TimesheetDayStatus.SUBMITTED,
          approvedById: null,
          approvedAt: null,
          rejectedById: null,
          rejectedAt: null,
          rejectionReason: null,
        },
      });
      await tx.timesheetApprovalLog.create({
        data: {
          weekId: week.id,
          actorId: actor.sub,
          action: TimesheetLogAction.REVERT,
          scope: TimesheetLogScope.WEEK,
          scopeDate: weekStart,
        },
      });
      const newStatus = await this.recomputeWeekStatus(tx, week.id);
      return { weekId: week.id, status: newStatus, reverted: days.length };
    });

    return { status: result.status, reverted: result.reverted };
  }

  /**
   * Reverte todos os dias APPROVED/REJECTED do mês indicado (1 user) para SUBMITTED.
   * Cria 1 TimesheetApprovalLog por week tocada (scope=MONTH, scopeDate=1º do mês).
   */
  async revertMonth(projectPublicId: string, actor: JwtPayload, dto: ApproveMonthDto) {
    const project = await this.resolveProjectId(projectPublicId);
    const target = await this.resolveUserId(dto.userPublicId);
    const monthStart = this.monthStartOf(dto.year, dto.month);
    const monthEnd = this.monthEndOf(dto.year, dto.month);

    const weeks = await this.prisma.timesheetWeek.findMany({
      where: {
        projectId: project.id, userId: target.id,
        days: { some: { workDate: { gte: monthStart, lte: monthEnd } } },
      },
      select: { id: true, weekStart: true },
    });
    if (weeks.length === 0) return { weeksTouched: 0 };

    let touched = 0;
    for (const w of weeks) {
      await this.prisma.$transaction(async (tx) => {
        const days = await tx.timesheetDay.findMany({
          where: {
            weekId: w.id,
            status: { in: [TimesheetDayStatus.APPROVED, TimesheetDayStatus.REJECTED] },
            workDate: { gte: monthStart, lte: monthEnd },
          },
          select: { id: true },
        });
        if (days.length === 0) return;
        await tx.timesheetDay.updateMany({
          where: { id: { in: days.map((d) => d.id) } },
          data: {
            status: TimesheetDayStatus.SUBMITTED,
            approvedById: null,
            approvedAt: null,
            rejectedById: null,
            rejectedAt: null,
            rejectionReason: null,
          },
        });
        await tx.timesheetApprovalLog.create({
          data: { weekId: w.id, actorId: actor.sub, action: TimesheetLogAction.REVERT,
                  scope: TimesheetLogScope.MONTH, scopeDate: monthStart },
        });
        await this.recomputeWeekStatus(tx, w.id);
        touched++;
      });
    }

    return { weeksTouched: touched };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Audit log
  // ─────────────────────────────────────────────────────────────────────────────

  async getLog(
    projectPublicId: string,
    requesting: JwtPayload,
    targetUserPublicId?: string,
    fromIso?: string,
    toIso?: string,
  ) {
    const project = await this.resolveProjectId(projectPublicId);

    let targetUserId: number | undefined;
    if (targetUserPublicId) {
      const tu = await this.resolveUserId(targetUserPublicId);
      targetUserId = tu.id;
    }

    // Próprio user pode ver o seu log; outros exigem TIMESHEET_APPROVE.
    if (targetUserId && targetUserId !== requesting.sub) {
      const can = await this.perms.can(project.id, requesting.sub, ProjectAction.TIMESHEET_APPROVE, requesting.profileCode);
      if (!can) throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }

    const where: Prisma.TimesheetApprovalLogWhereInput = {
      week: {
        projectId: project.id,
        ...(targetUserId ? { userId: targetUserId } : {}),
      },
    };
    if (fromIso || toIso) {
      where.createdAt = {};
      if (fromIso) (where.createdAt as Prisma.DateTimeFilter).gte = this.parseISODate(fromIso);
      if (toIso) (where.createdAt as Prisma.DateTimeFilter).lte = this.parseISODate(toIso);
    }

    const logs = await this.prisma.timesheetApprovalLog.findMany({
      where,
      select: {
        publicId: true, action: true, scope: true, scopeDate: true, reason: true, createdAt: true,
        actor: { select: { publicId: true, name: true } },
        week: { select: { weekStart: true, user: { select: { publicId: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return logs.map((l) => ({
      publicId:  l.publicId,
      action:    l.action,
      scope:     l.scope,
      scopeDate: l.scopeDate.toISOString().slice(0, 10),
      reason:    l.reason,
      createdAt: l.createdAt.toISOString(),
      actor:     l.actor,
      target:    l.week.user,
      weekStart: l.week.weekStart.toISOString().slice(0, 10),
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Global (cross-project)
  // ─────────────────────────────────────────────────────────────────────────────

  async globalGetMy(
    userId: number,
    filters: { weekStart?: string; projectPublicId?: string; status?: TimesheetWeekStatus },
  ) {
    const where: Prisma.TimesheetWeekWhereInput = { userId };
    if (filters.weekStart) where.weekStart = this.parseISODate(filters.weekStart);
    if (filters.projectPublicId) {
      const p = await this.resolveProjectId(filters.projectPublicId);
      where.projectId = p.id;
    }
    if (filters.status) where.status = filters.status;

    const weeks = await this.prisma.timesheetWeek.findMany({
      where,
      select: {
        publicId: true, status: true, weekStart: true, submittedAt: true,
        project: { select: { publicId: true, name: true } },
        entries: { select: { hours: true } },
      },
      orderBy: { weekStart: 'desc' },
      take: 200,
    });

    return weeks.map((w) => ({
      weekPublicId:  w.publicId,
      project:       w.project,
      weekStart:     w.weekStart.toISOString().slice(0, 10),
      status:        w.status,
      submittedAt:   w.submittedAt?.toISOString() ?? null,
      totalHours:    w.entries.reduce((s, e) => s + (e.hours.toNumber ? e.hours.toNumber() : Number(e.hours)), 0),
    }));
  }

  async globalHasApprovalAccess(user: JwtPayload): Promise<{ hasAccess: boolean }> {
    if (user.profileCode === 'PLATFORM_ADMIN') return { hasAccess: true };
    const projectIds = await this.perms.findProjectIdsWithAction(user.sub, ProjectAction.TIMESHEET_APPROVE);
    return { hasAccess: projectIds.length > 0 };
  }

  async globalGetPendingApprovals(
    user: JwtPayload,
    filters: { weekStart?: string; projectPublicId?: string; userPublicId?: string; status?: TimesheetWeekStatus },
  ) {
    const projectIds = user.profileCode === 'PLATFORM_ADMIN'
      ? null   // admin vê tudo; null = sem filtro de projecto
      : await this.perms.findProjectIdsWithAction(user.sub, ProjectAction.TIMESHEET_APPROVE);

    const where: Prisma.TimesheetWeekWhereInput = {
      // SUBMITTED ou PARTIAL — qualquer estado com algo a aprovar.
      status: { in: [TimesheetWeekStatus.SUBMITTED, TimesheetWeekStatus.PARTIAL] },
    };
    if (projectIds !== null) where.projectId = { in: projectIds };
    if (filters.projectPublicId) {
      const p = await this.resolveProjectId(filters.projectPublicId);
      where.projectId = p.id;
    }
    if (filters.weekStart) where.weekStart = this.parseISODate(filters.weekStart);
    if (filters.status) where.status = filters.status;
    if (filters.userPublicId) {
      const u = await this.resolveUserId(filters.userPublicId);
      where.userId = u.id;
    }

    const weeks = await this.prisma.timesheetWeek.findMany({
      where,
      select: {
        publicId: true, status: true, weekStart: true,
        project: { select: { publicId: true, name: true } },
        user:    { select: { publicId: true, name: true } },
        entries: { select: { hours: true } },
      },
      orderBy: [{ weekStart: 'desc' }, { id: 'asc' }],
      take: 200,
    });

    return weeks.map((w) => ({
      weekPublicId: w.publicId,
      project:      w.project,
      user:         { publicId: w.user.publicId, name: w.user.name, initials: this.initialsOf(w.user.name) },
      weekStart:    w.weekStart.toISOString().slice(0, 10),
      status:       w.status,
      totalHours:   w.entries.reduce((s, e) => s + (e.hours.toNumber ? e.hours.toNumber() : Number(e.hours)), 0),
    }));
  }

  async globalApproveWeek(actor: JwtPayload, dto: GlobalApproveWeekDto) {
    const project = await this.resolveProjectId(dto.projectPublicId);
    // Validar permissão neste projecto (controller global não tem ProjectPermissionGuard)
    const can = await this.perms.can(project.id, actor.sub, ProjectAction.TIMESHEET_APPROVE, actor.profileCode);
    if (!can) throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);

    return this.approveWeek(dto.projectPublicId, actor, { userPublicId: dto.userPublicId, weekStart: dto.weekStart });
  }

  async globalRejectWeek(actor: JwtPayload, dto: GlobalRejectWeekDto) {
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new AppException('REASON_REQUIRED', HttpStatus.BAD_REQUEST);
    }
    const project = await this.resolveProjectId(dto.projectPublicId);
    const can = await this.perms.can(project.id, actor.sub, ProjectAction.TIMESHEET_APPROVE, actor.profileCode);
    if (!can) throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);

    const target = await this.resolveUserId(dto.userPublicId);
    const weekStart = this.parseISODate(dto.weekStart);
    this.assertWeekStart(weekStart);

    const result = await this.prisma.$transaction(async (tx) => {
      const week = await this.ensureWeek(tx, project.id, target.id, weekStart);
      const days = await tx.timesheetDay.findMany({
        where: { weekId: week.id, status: TimesheetDayStatus.SUBMITTED },
        select: { id: true },
      });
      if (days.length === 0) {
        throw new AppException('NOTHING_TO_REJECT', HttpStatus.CONFLICT);
      }
      await tx.timesheetDay.updateMany({
        where: { id: { in: days.map((d) => d.id) } },
        data: {
          status: TimesheetDayStatus.REJECTED,
          rejectedById: actor.sub,
          rejectedAt: new Date(),
          rejectionReason: dto.reason.trim(),
          approvedById: null,
          approvedAt: null,
        },
      });
      await tx.timesheetApprovalLog.create({
        data: {
          weekId: week.id,
          actorId: actor.sub,
          action: TimesheetLogAction.REJECT,
          scope: TimesheetLogScope.WEEK,
          scopeDate: weekStart,
          reason: dto.reason.trim(),
        },
      });
      const newStatus = await this.recomputeWeekStatus(tx, week.id);
      return { weekId: week.id, status: newStatus };
    });

    const actorUser = await this.prisma.user.findUnique({ where: { id: actor.sub }, select: { name: true } });
    this.notifications
      .createTimesheetRejectedNotification(
        target.id, actorUser?.name ?? '', project.name, dto.projectPublicId,
        weekStart.toISOString().slice(0, 10), dto.reason.trim(),
      )
      .catch(() => {});

    return { status: result.status };
  }
}
