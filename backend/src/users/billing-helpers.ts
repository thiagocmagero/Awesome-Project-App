import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Helpers para criar dados billing/workspace-member após criação de User.
 * Aceitam tanto `PrismaService` como `Prisma.TransactionClient` — usar dentro
 * da mesma transacção que cria o User para garantir atomicidade.
 */

export type PrismaLike = PrismaClient | Prisma.TransactionClient;

/**
 * Cria Subscription default (status=ACTIVE, plano `isDefault=true`) para o
 * workspace default de um utilizador recém-criado. Idempotente via upsert.
 *
 * Pré-requisito: o Workspace já tem que existir (criar antes de chamar).
 */
export async function createDefaultBilling(
  client: PrismaLike,
  userId: number,
): Promise<void> {
  const workspace = await client.workspace.findUnique({
    where: { ownerId: userId },
    select: { id: true },
  });
  if (!workspace) return;

  const defaultPlan = await client.plan.findFirst({
    where: { isDefault: true, planStatus: 'ACTIVE' },
    select: { id: true },
  });
  if (!defaultPlan) return;

  const now = new Date();
  const farFuture = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // ~100y
  await client.subscription.upsert({
    where: { workspaceId: workspace.id },
    create: {
      workspaceId: workspace.id,
      planId: defaultPlan.id,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      currentPeriodStart: now,
      currentPeriodEnd: farFuture,
      extraSeats: 0,
    },
    update: {}, // nunca sobrescrever — se já existir, mantém estado actual
  });
}

/**
 * Cria/actualiza WorkspaceMember(BASIC, ACCEPTED) quando um utilizador aceita
 * um convite project-level. Garantia: cada ProjectMember(ACCEPTED) tem o seu
 * WorkspaceMember espelho.
 *
 * Skip:
 * - self-ownership (owner não é membro do próprio workspace).
 * - (workspace, email) já existente — preserva estado prévio (ex.: backfill).
 */
export async function upsertWorkspaceMemberFromProjectAccept(
  client: PrismaLike,
  args: {
    ownerId: number;
    userId: number;
    email: string;
    name: string | null;
    /** Pode ser null se o inviter foi entretanto removido (FK SetNull). */
    invitedById: number | null;
  },
): Promise<void> {
  if (args.ownerId === args.userId) return;

  const ownerWorkspace = await client.workspace.findUnique({
    where: { ownerId: args.ownerId },
    select: { id: true },
  });
  if (!ownerWorkspace) return;

  // invitedById é nullable em WorkspaceMember (cascade-safety). Quando o
  // inviter já não existe, recai-se para o ownerId como autor da membership.
  const invitedById = args.invitedById ?? args.ownerId;

  await client.workspaceMember.upsert({
    where: { workspaceId_email: { workspaceId: ownerWorkspace.id, email: args.email } },
    create: {
      workspaceId: ownerWorkspace.id,
      userId: args.userId,
      email: args.email,
      name: args.name,
      memberType: 'BASIC',
      status: 'ACCEPTED',
      invitedById,
      acceptedAt: new Date(),
    },
    update: {
      // Se existia como INVITED ou sem userId linkado, completar agora.
      // Não mexer em memberType (pode ter sido promovido para LICENSED).
      userId: args.userId,
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  });
}
