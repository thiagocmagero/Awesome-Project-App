// split-translations.js
// Lê prisma/seeds/translations.json (Format A: namespace → locale → key → value)
// e distribui por um ficheiro JSON por namespace em prisma/seeds/translations/.
//
// Uso:
//   node scripts/split-translations.js
//
// Workflow após Export Seed no backoffice:
//   1. Guardar o translations.json descarregado em backend/prisma/seeds/translations.json
//   2. Correr dentro do container: docker exec awesome-project-app-backend node scripts/split-translations.js
//   3. Commit dos ficheiros alterados em prisma/seeds/translations/

'use strict';

const fs   = require('fs');
const path = require('path');

const LOCALE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/;

const src = path.resolve(__dirname, '../prisma/seeds/translations.json');
const dst = path.resolve(__dirname, '../prisma/seeds/translations');

if (!fs.existsSync(src)) {
  console.error(`❌  Ficheiro não encontrado: ${src}`);
  console.error('    Coloca o translations.json exportado do backoffice em prisma/seeds/translations.json e volta a correr.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(src, 'utf8'));
fs.mkdirSync(dst, { recursive: true });

let fileCount = 0;

for (const [outerKey, innerObj] of Object.entries(data)) {
  // Ignorar blocos Format B (locale como chave exterior — ex: "en", "pt-BR")
  if (LOCALE_PATTERN.test(outerKey)) {
    console.log(`  ⤷ ignorado: "${outerKey}" (bloco locale — Format B redundante)`);
    continue;
  }

  // Format A: outerKey = namespace, innerObj = { locale → { key → value } }
  const namespace = outerKey;
  const file = path.join(dst, `${namespace}.json`);
  fs.writeFileSync(file, JSON.stringify(innerObj, null, 2) + '\n', 'utf8');
  console.log(`  ✔ ${namespace}.json`);
  fileCount++;
}

console.log(`\n✔ Split concluído: ${fileCount} ficheiro(s) em prisma/seeds/translations/`);
console.log('  Podes agora apagar prisma/seeds/translations.json e fazer commit dos ficheiros gerados.');
