// === SEED: translations ===
// seed v2.0 — lê directório translations/ (um ficheiro JSON por namespace)
// Claude: ler este ficheiro para tarefas relacionadas com traduções e internacionalização
// Dependências: 03-i18n.seed.js (locales devem existir antes das traduções)

// Cada ficheiro em translations/ tem o formato:
//   { locale → { key → value } }
// O namespace é derivado do nome do ficheiro (ex: common.json → namespace "common").
//
// Workflow de Export Seed (backoffice → git):
//   1. Backoffice /translations → "⬇ Exportar Seed" → guarda translations.json localmente
//   2. Copiar para backend/prisma/seeds/translations.json
//   3. docker exec awesome-project-app-backend node scripts/split-translations.js
//   4. Commit dos ficheiros em prisma/seeds/translations/ que mudaram
//   5. Apagar prisma/seeds/translations.json (artefacto temporário)

'use strict';

const fs   = require('fs');
const path = require('path');

const LOCALE_PATTERN     = /^[a-z]{2}(-[A-Z]{2})?$/;
const KNOWN_LOCALE_CODES = ['en', 'es', 'pt-PT', 'pt-BR'];
const TRANSLATIONS_DIR   = path.join(__dirname, 'translations');

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed(prisma) {
  // Remove registos corrompidos onde um código de locale foi gravado como namespace
  // (bug do seed v1.0 que tinha as variáveis locale/namespace trocadas no loop externo).
  const { count: orphanCount } = await prisma.translation.deleteMany({
    where: { namespace: { in: KNOWN_LOCALE_CODES } },
  });
  if (orphanCount > 0) {
    console.log(`  🧹 ${orphanCount} registo(s) com namespace inválido (locale-como-namespace) removidos.`);
  }

  const files = fs.readdirSync(TRANSLATIONS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  let total = 0;

  for (const file of files) {
    const namespace = path.basename(file, '.json');
    // Cada ficheiro: { locale → { key → value } }
    const localeMap  = JSON.parse(
      fs.readFileSync(path.join(TRANSLATIONS_DIR, file), 'utf8'),
    );

    for (const [locale, entries] of Object.entries(localeMap)) {
      if (!LOCALE_PATTERN.test(locale)) {
        console.warn(`  ⚠ ${file}: chave "${locale}" ignorada (não é um código de locale válido)`);
        continue;
      }
      for (const [key, value] of Object.entries(entries)) {
        await prisma.translation.upsert({
          where:  { locale_namespace_key: { locale, namespace, key } },
          create: { locale, namespace, key, value, status: 'APPROVED' },
          update: { value },
        });
        total++;
      }
    }
  }

  console.log(`✔ Translations: ${total} registos processados (${files.length} ficheiro(s))`);
}

module.exports = { seed };
