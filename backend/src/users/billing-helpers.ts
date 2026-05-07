import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Phase 7 — agora só escreve Subscription (UserPlan removido do schema).
 *
 * Aceita tanto `PrismaService` como `Prisma.TransactionClient` — usar dentro
 * da mesma transacção que cria o User para garantir atomicidade.
 */

export type PrismaLike = PrismaClient | Prisma.TransactionClient;

/**
 * Cria Subscription default (status=ACTIVE, plano `isDefault=true`) para um
 * utilizador recém-criado. Idempotente via upsert — se já existir (ex.:
 * backfill ou re-registo), mantém-se intacto.
 *
 * Não faz nada se não existir plano default activo (sistema mal seedado).
 */
export async function createDefaultBilling(
  client: PrismaLike,
  userId: number,
): Promise<void> {
  const defaultPlan = await client.plan.findFirst({
    where: { isDefault: true, planStatus: 'ACTIVE' },
    select: { id: true },
  });
  if (!defaultPlan) return;

  const now = new Date();
  const farFuture = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // ~100y
  await client.subscription.upsert({
    where: { userId },
    create: {
      userId,
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
 * um convite project-level (fluxo legado). Garantia: a partir da Phase 3,
 * cada ProjectMember(ACCEPTED) tem o seu WorkspaceMember espelho, sem o owner
 * ter de tomar acção explícita na nova UI.
 *
 * Skip:
 * - self-ownership (owner não é membro do próprio workspace).
 * - (ownerId, email) já existente — preserva estado prévio (ex.: backfill).
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

  // invitedById é nullable em WorkspaceMember (cascade-safety). Quando o
  // inviter já não existe, recai-se para o ownerId como autor da membership.
  const invitedById = args.invitedById ?? args.ownerId;

  await client.workspaceMember.upsert({
    where: { ownerId_email: { ownerId: args.ownerId, email: args.email } },
    create: {
      ownerId: args.ownerId,
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
