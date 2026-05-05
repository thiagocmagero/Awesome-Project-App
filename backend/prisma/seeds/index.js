// === SEED: index (orquestrador) ===
// Executa todos os seeds por ordem. Cada seed é idempotente (upsert).
// Para correr: node prisma/seeds/index.js (ou via npm run seed após actualizar package.json)

const { PrismaClient } = require('@prisma/client');
const { seed: seedUsers }        = require('./01-users.seed.js');
const { seed: seedPlans }        = require('./02-plans.seed.js');
const { seed: seedI18n }         = require('./03-i18n.seed.js');
const { seed: seedTranslations } = require('./99-translations.seed.js');

const seeds = [
  { name: '01-users',        fn: seedUsers },
  { name: '02-plans',        fn: seedPlans },
  { name: '03-i18n',         fn: seedI18n },
  { name: '99-translations', fn: seedTranslations },
];

async function main() {
  const prisma = new PrismaClient();
  console.log('🌱 A iniciar seed...');

  for (const s of seeds) {
    console.log(`\n[seed] a iniciar: ${s.name}`);
    try {
      await s.fn(prisma);
    } catch (err) {
      console.error(`[seed] ❌ falhou: ${s.name} —`, err.message);
      // continua para o próximo seed
    }
  }

  console.log('\n✅ Seed concluído.');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Seed falhou de forma fatal:', err);
  process.exit(1);
});
