// === SEED: i18n ===
// Claude: ler este ficheiro para tarefas relacionadas com locales e idiomas disponíveis
// Dependências: nenhuma — este seed não depende de outros

// ─── Dados de referência ──────────────────────────────────────────────────────

// Locales built-in: nunca removíveis pelo admin (isBuiltIn: true)
// Adicionar novo idioma aqui + entradas em translations.json

const BUILTIN_LOCALES = [
  { code: 'pt-PT', name: 'Português (Portugal)', flag: 'portugal_flag.jpg', isActive: true, isBuiltIn: true, order: 0 },
  { code: 'pt-BR', name: 'Português (Brasil)',   flag: 'brazil_flag.jpg',   isActive: true, isBuiltIn: true, order: 1 },
  { code: 'en',    name: 'English',              flag: 'us_flag.jpg',       isActive: true, isBuiltIn: true, order: 2 },
  { code: 'es',    name: 'Español',              flag: 'spain_flag.jpg',    isActive: true, isBuiltIn: true, order: 3 },
];

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed(prisma) {
  for (const loc of BUILTIN_LOCALES) {
    await prisma.locale.upsert({
      where:  { code: loc.code },
      create: loc,
      update: {},  // preserva alterações do admin (ex: flag personalizada)
    });
  }
  console.log(`✔ Locales: ${BUILTIN_LOCALES.map((l) => l.code).join(', ')}`);
}

module.exports = { seed };

// Registos inseridos/atualizados:
//   Locales: 4 — pt-PT, pt-BR, en, es (upsert por code)
