// === SEED: users ===
// Claude: ler este ficheiro para tarefas relacionadas com utilizadores, perfis e níveis
// Dependências: nenhuma — este seed não depende de outros

const bcrypt = require('bcrypt');

// ─── Dados de referência ──────────────────────────────────────────────────────

const PROFILES = [
  { code: 'PLATFORM_ADMIN',   label: 'Platform Admin',        description: 'Gere utilizadores, perfis, equipas, projetos e associações globais' },
  { code: 'BASIC_USER',       label: 'Utilizador Básico',     description: 'Utilizador com workspace próprio isolado' },
  { code: 'PRO_USER',         label: 'Utilizador Pro',        description: 'Utilizador pro com funcionalidades avançadas' },
  { code: 'ENTERPRISE_USER',  label: 'Utilizador Enterprise', description: 'Utilizador enterprise com suporte dedicado' },
];

const USER_LEVELS = [
  { code: 'JUNIOR',    label: 'Junior',    order: 1 },
  { code: 'MID',       label: 'Mid',       order: 2 },
  { code: 'SENIOR',    label: 'Senior',    order: 3 },
  { code: 'LEAD',      label: 'Lead',      order: 4 },
  { code: 'PRINCIPAL', label: 'Principal', order: 5 },
];

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed(prisma) {
  // Perfis de acesso
  for (const p of PROFILES) {
    await prisma.profile.upsert({
      where:  { code: p.code },
      update: { label: p.label, description: p.description, status: 'ACTIVE' },
      create: p,
    });
  }
  console.log(`✔ Profiles: ${PROFILES.map((p) => p.code).join(', ')}`);

  // Níveis de seniority
  for (const l of USER_LEVELS) {
    await prisma.userLevel.upsert({
      where:  { code: l.code },
      update: { label: l.label, order: l.order },
      create: l,
    });
  }
  console.log(`✔ UserLevels: ${USER_LEVELS.map((l) => l.code).join(', ')}`);

  // Utilizador admin (via variáveis de ambiente)
  const email    = process.env.APP_ADMIN_EMAIL;
  const name     = process.env.APP_ADMIN_NAME;
  const password = process.env.APP_ADMIN_PASSWORD;

  if (!email || !name || !password) {
    console.log('⚠ APP_ADMIN_* não definidas — seed do admin ignorado.');
    return;
  }

  const platformAdminProfile = await prisma.profile.findUnique({ where: { code: 'PLATFORM_ADMIN' } });
  if (!platformAdminProfile) throw new Error('Profile PLATFORM_ADMIN não encontrado após upsert.');

  const passwordHash = await bcrypt.hash(password, 10);
  const existing     = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data:  { name, passwordHash, profileId: platformAdminProfile.id, status: 'ACTIVE' },
    });
    console.log(`✔ Admin atualizado: ${email}`);
  } else {
    await prisma.user.create({
      data: { email, name, passwordHash, profileId: platformAdminProfile.id, status: 'ACTIVE' },
    });
    console.log(`✔ Admin criado: ${email}`);
  }
}

module.exports = { seed };

// Registos inseridos/atualizados:
//   Profiles  : 4 (upsert por code)
//   UserLevels: 5 (upsert por code)
//   Admin user: 1 (create ou update por email)
