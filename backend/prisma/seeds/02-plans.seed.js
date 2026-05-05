// === SEED: plans ===
// Claude: ler este ficheiro para tarefas relacionadas com planos, limites, feature flags e atribuição de planos
// Dependências: 01-users.seed.js (utilizadores devem existir para a atribuição de plano default)

// ─── Dados de referência ──────────────────────────────────────────────────────

const PLANS = [
  {
    code: 'BASICO',
    name: 'Básico',
    description: 'Plano gratuito por defeito para todos os novos utilizadores',
    isDefault: true,
    limits: [
      { limitKey: 'max_projects',   limitValue: 3,   description: 'Número máximo de projetos' },
      { limitKey: 'max_teams',      limitValue: 3,   description: 'Número máximo de equipas' },
      { limitKey: 'max_members',    limitValue: 10,  description: 'Número máximo de pessoas' },
      { limitKey: 'max_tasks',      limitValue: 50,  description: 'Número máximo de tarefas' },
      { limitKey: 'max_storage_mb', limitValue: 500, description: 'Storage em MB' },
      { limitKey: 'max_api_calls',  limitValue: -1,  description: 'Chamadas API (ilimitado)' },
      { limitKey: 'max_holidays',   limitValue: 3,   description: 'Número máximo de listas de feriados' },
    ],
    pricing: [
      { billingCycle: 'MONTHLY', basePrice: 0, trialDays: 0 },
    ],
  },
];

const FEATURE_FLAGS = [
  {
    key: 'gantt_view',
    label: 'Gráfico Gantt',
    description: 'Visualização do gráfico Gantt no planeamento de projetos',
    enabledGlobally: false,
  },
  {
    key: 'multi_holiday',
    label: 'Feriados por Projeto',
    description: 'Permite criar listas de feriados para associar aos projetos',
    enabledGlobally: false,
  },
  // Nota (Abril 2026): a flag `board_view` foi removida juntamente com o tab
  // Kanban / Aw-Kanban. Reintroduzir aqui quando o futuro componente Board
  // for adicionado (ver `docs/claude/future-board.md`).
  {
    key: 'calendar_view',
    label: 'Calendário',
    description: 'Vista de calendário por projecto (eventos, reuniões, lembretes)',
    enabledGlobally: false,
  },
  {
    key: 'timesheet_view',
    label: 'Timesheet',
    description: 'Registo semanal de horas por membro (vista do projeto + área global)',
    enabledGlobally: false,
  },
];

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed(prisma) {
  // Planos + limites + pricing
  for (const p of PLANS) {
    const plan = await prisma.plan.upsert({
      where:  { code: p.code },
      update: {},  // nunca sobrescrever — admin pode ter alterado
      create: { code: p.code, name: p.name, description: p.description, isDefault: p.isDefault },
    });

    for (const limit of p.limits) {
      await prisma.planLimit.upsert({
        where:  { planId_limitKey: { planId: plan.id, limitKey: limit.limitKey } },
        update: {},  // nunca sobrescrever
        create: { planId: plan.id, ...limit },
      });
    }

    for (const pricing of p.pricing) {
      await prisma.planPricing.upsert({
        where:  { planId_billingCycle: { planId: plan.id, billingCycle: pricing.billingCycle } },
        update: {},  // nunca sobrescrever
        create: { planId: plan.id, ...pricing },
      });
    }

    console.log(`✔ Plan: ${p.code} (${p.limits.length} limits, ${p.pricing.length} pricing)`);
  }

  // Feature flags + associação ao plano Básico (disabled por omissão)
  const basicoPlan = await prisma.plan.findUnique({ where: { code: 'BASICO' } });

  for (const ff of FEATURE_FLAGS) {
    const flag = await prisma.featureFlag.upsert({
      where:  { key: ff.key },
      update: {},  // nunca sobrescrever
      create: ff,
    });

    if (basicoPlan) {
      await prisma.planFeatureFlag.upsert({
        where:  { planId_featureFlagId: { planId: basicoPlan.id, featureFlagId: flag.id } },
        update: {},  // nunca sobrescrever
        create: { planId: basicoPlan.id, featureFlagId: flag.id, enabled: false },
      });
    }

    console.log(`✔ FeatureFlag: ${ff.key} (enabledGlobally: ${ff.enabledGlobally})`);
  }

  // Atribuir plano default a utilizadores sem plano activo
  const defaultPlan = await prisma.plan.findFirst({ where: { isDefault: true } });
  if (!defaultPlan) {
    console.log('⚠ Nenhum plano default encontrado — skip atribuição.');
    return;
  }

  const usersWithoutPlan = await prisma.user.findMany({
    where:  { userPlans: { none: { isActive: true } } },
    select: { id: true },
  });

  for (const user of usersWithoutPlan) {
    await prisma.userPlan.create({
      data: { userId: user.id, planId: defaultPlan.id, isActive: true },
    });
  }

  if (usersWithoutPlan.length > 0) {
    console.log(`✔ Plano default atribuído a ${usersWithoutPlan.length} utilizador(es) existente(s)`);
  } else {
    console.log('✔ Todos os utilizadores já têm plano atribuído');
  }
}

module.exports = { seed };

// Registos inseridos/atualizados:
//   Plans        : 1 — BASICO (upsert por code)
//   PlanLimits   : 7 — max_projects, max_teams, max_members, max_tasks, max_storage_mb, max_api_calls, max_holidays
//   PlanPricing  : 1 — MONTHLY
//   FeatureFlags : 3 — gantt_view, multi_holiday, calendar_view, timesheet_view (upsert por key)
//   PlanFeatureFlags: 4 (upsert por planId+featureFlagId)
//   UserPlan     : N (create apenas para users sem plano activo)
