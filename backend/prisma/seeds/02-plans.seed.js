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
      { limitKey: 'max_licensed_seats', limitValue: 0, description: 'Seats LICENSED incluídos no plano (BASIC = 0)' },
      { limitKey: 'max_uploads_count', limitValue: 100, description: 'Número máximo de ficheiros activos' },
      { limitKey: 'max_upload_size_mb', limitValue: 25, description: 'Tamanho máximo por upload (MB)' },
    ],
    pricing: [
      { billingCycle: 'MONTHLY', basePrice: 0, trialDays: 0, pricePerExtraSeat: null, currency: 'EUR' },
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
  {
    key: 'upload',
    label: 'Uploads de Ficheiros',
    description: 'Permite anexar ficheiros a tarefas e ao projecto. Bytes guardados em bucket privado.',
    enabledGlobally: false,
  },
  {
    key: 'upload_secured',
    label: 'Uploads Protegidos',
    description: 'Verifica novos uploads via AWS GuardDuty Malware Protection. Depende da flag upload.',
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

  const usersWithoutSub = await prisma.user.findMany({
    where:  { subscription: null },
    select: { id: true },
  });

  const now = new Date();
  const farFuture = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
  for (const user of usersWithoutSub) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: defaultPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: now,
        currentPeriodEnd: farFuture,
        extraSeats: 0,
      },
    });
  }

  if (usersWithoutSub.length > 0) {
    console.log(`✔ Subscription default criada para ${usersWithoutSub.length} utilizador(es) existente(s)`);
  } else {
    console.log('✔ Todos os utilizadores têm subscription');
  }

  // PlatformLimits singleton (id=1) — garante allowlists iniciais sensatas
  // para a feature `upload`. PLATFORM_ADMIN pode editar via /settings/limits.
  //
  // Notas importantes ao escolher defaults:
  // - O `file-type` detecta apenas formatos com magic bytes / file signatures
  //   reconhecíveis. Formatos baseados em texto puro (txt, csv, md, html, json,
  //   svg, js, ts) NÃO são detectáveis e o backend rejeita-os com
  //   UNRECOGNIZED_FILE_TYPE — não vale a pena pôr na lista.
  // - SVG é deliberadamente excluído (XSS via <script> embebido).
  // - Executáveis (exe, dll, bat, sh, msi, jar, apk) ficam fora por segurança.
  // - Cada extensão tem que ter o MIME correspondente que `file-type` devolve;
  //   se um upload válido for rejeitado, a mensagem de erro mostra qual o MIME
  //   rejeitado e o admin pode acrescentar via UI sem mexer no seed.
  const DEFAULT_MIMES = [
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'application/rtf',
    // Imagens
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/x-icon',
    'image/avif',
    'image/heic',
    // Áudio
    'audio/mpeg',
    'audio/mp4',
    'audio/x-wav',
    'audio/ogg',
    'audio/x-flac',
    // Vídeo
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-matroska',
    'video/x-msvideo',
    // Arquivos / compressão
    'application/zip',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
    'application/x-tar',
    'application/gzip',
  ];
  // Extensões canónicas devolvidas por `file-type` para os MIMEs acima.
  // Nota: JPEG → 'jpg' (não 'jpeg'); ICO → 'ico'; admins podem adicionar
  // 'jpeg' como alias mas o file-type só retorna 'jpg'.
  const DEFAULT_EXTENSIONS = [
    // Documentos
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'odt', 'ods', 'odp', 'rtf',
    // Imagens
    'png', 'jpg', 'webp', 'gif', 'bmp', 'tiff', 'ico', 'avif', 'heic',
    // Áudio
    'mp3', 'm4a', 'wav', 'ogg', 'flac',
    // Vídeo
    'mp4', 'webm', 'mov', 'mkv', 'avi',
    // Arquivos / compressão
    'zip', '7z', 'rar', 'tar', 'gz',
  ];

  // Sets antigos seeded em versões anteriores — usados pelo backfill abaixo
  // para detectar instalações que ainda têm o default original e fazer
  // upgrade automático sem sobrescrever customizações do admin.
  const LEGACY_DEFAULT_EXTENSIONS = new Set([
    'pdf', 'png', 'jpg', 'webp', 'gif',
    'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'zip',
  ]);
  const LEGACY_DEFAULT_MIMES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
  ]);
  const isLegacyDefault = (current, legacySet) =>
    Array.isArray(current) &&
    current.length === legacySet.size &&
    current.every((v) => legacySet.has(v));
  const existingLimits = await prisma.platformLimits.findUnique({ where: { id: 1 } });
  if (!existingLimits) {
    await prisma.platformLimits.create({
      data: {
        id: 1,
        // maxTaskBusinessDays e maxUploadSizeMb usam defaults do schema (1300 e 50)
        allowedMimeTypes: DEFAULT_MIMES,
        allowedFileExtensions: DEFAULT_EXTENSIONS,
      },
    });
    console.log(
      `✔ PlatformLimits singleton criado com ${DEFAULT_MIMES.length} MIME types e ${DEFAULT_EXTENSIONS.length} extensões`,
    );
  } else {
    // Backfill / upgrade automático:
    // - Lista vazia → popula com defaults novos (instância criada antes do field existir).
    // - Lista igual ao default antigo (LEGACY) → upgrade para o novo default expandido.
    // - Lista customizada pelo admin → não sobrescrever, deixar como está.
    const currentExt = Array.isArray(existingLimits.allowedFileExtensions)
      ? existingLimits.allowedFileExtensions
      : [];
    const currentMime = Array.isArray(existingLimits.allowedMimeTypes)
      ? existingLimits.allowedMimeTypes
      : [];

    const updates = {};
    if (currentExt.length === 0 || isLegacyDefault(currentExt, LEGACY_DEFAULT_EXTENSIONS)) {
      updates.allowedFileExtensions = DEFAULT_EXTENSIONS;
    }
    if (currentMime.length === 0 || isLegacyDefault(currentMime, LEGACY_DEFAULT_MIMES)) {
      updates.allowedMimeTypes = DEFAULT_MIMES;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.platformLimits.update({ where: { id: 1 }, data: updates });
      const parts = [];
      if (updates.allowedFileExtensions) parts.push(`${DEFAULT_EXTENSIONS.length} extensões`);
      if (updates.allowedMimeTypes) parts.push(`${DEFAULT_MIMES.length} MIME types`);
      console.log(`✔ PlatformLimits: upgrade automático para defaults novos (${parts.join(', ')})`);
    } else {
      console.log('✔ PlatformLimits singleton com customizações do admin — não sobrescrito');
    }
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
