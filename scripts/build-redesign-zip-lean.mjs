// Build a lean ZIP without screenshots for quick download/transfer.
import { spawn } from 'node:child_process';
import { mkdir, readdir, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ZIP_PATH = path.resolve('artifacts/Hubora-9.0.0-Redesign-Cinematic-Real-Lean.zip');
const STAGING = path.resolve('artifacts/_zip-staging/Hubora-9.0.0-Redesign-Cinematic-Real-Lean');

const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
  '.git',
  '_zip-staging',
  '.playwright',
  '.qoder',
  '.impeccable',
  '.agents',
  'Hubora_Redesign_Cinematografico_Completo',
  'artifacts', // skip — we curate what goes in
]);

const EXCLUDE_FILES = new Set([
  'prints.tar',
  '.env',
  '.env.test.local',
  'dev-server.log',
]);

async function copyRecursive(src, dest) {
  const stats = await stat(src);
  if (stats.isDirectory()) {
    const base = path.basename(src);
    if (EXCLUDE_DIRS.has(base)) return;
    await mkdir(dest, { recursive: true });
    const entries = await readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      await copyRecursive(path.join(src, entry.name), path.join(dest, entry.name));
    }
  } else {
    if (EXCLUDE_FILES.has(path.basename(src))) return;
    await mkdir(path.dirname(dest), { recursive: true });
    const { createReadStream, createWriteStream } = await import('node:fs');
    await new Promise((resolve, reject) => {
      createReadStream(src).pipe(createWriteStream(dest).on('finish', resolve).on('error', reject));
    });
  }
}

async function main() {
  if (existsSync(STAGING)) {
    await rm(STAGING, { recursive: true, force: true });
  }
  await mkdir(STAGING, { recursive: true });

  const entries = await readdir(ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    await copyRecursive(path.join(ROOT, entry.name), path.join(STAGING, entry.name));
  }

  // Add docs/redesign-* only (not the entire docs tree)
  const docsSrc = path.join(ROOT, 'docs');
  if (existsSync(docsSrc)) {
    const all = await readdir(docsSrc, { withFileTypes: true });
    for (const e of all) {
      if (e.isFile() && e.name.startsWith('redesign-')) {
        await copyRecursive(path.join(docsSrc, e.name), path.join(STAGING, 'docs', e.name));
      } else if (e.isDirectory()) {
        // keep architecture and decisions folders
        if (['architecture', 'decisions', 'evidence', 'audit'].includes(e.name)) {
          await copyRecursive(path.join(docsSrc, e.name), path.join(STAGING, 'docs', e.name));
        }
      }
    }
  }

  // Add only the "playwright summary" + "axe summary" + "before-after" from artifacts
  // (no screenshots — they're huge)
  const artifactsToInclude = [
    { src: 'redesign-playwright/_summary.md', dest: 'artifacts/redesign-playwright/_summary.md' },
    { src: 'redesign-playwright/axe/_summary.md', dest: 'artifacts/redesign-playwright/axe/_summary.md' },
    { src: 'redesign-playwright/axe/_summary.json', dest: 'artifacts/redesign-playwright/axe/_summary.json' },
    { src: 'redesign-before-after/_comparison.md', dest: 'artifacts/redesign-before-after/_comparison.md' },
  ];
  await mkdir(path.join(STAGING, 'artifacts/redesign-playwright/axe'), { recursive: true });
  await mkdir(path.join(STAGING, 'artifacts/redesign-before-after'), { recursive: true });
  for (const a of artifactsToInclude) {
    if (existsSync(path.join(ROOT, 'artifacts', a.src))) {
      await copyRecursive(path.join(ROOT, 'artifacts', a.src), path.join(STAGING, a.dest));
    }
  }

  // README pointer to the full artifact set
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path.join(STAGING, 'README-REDESIGN.md'), `# Hubora 9.0.0 — Redesign Cinematográfico (entrega lean)

Esta é a versão lean do ZIP: código-fonte + documentação + relatórios. Screenshots e a galeria visual completa permanecem em \`artifacts/redesign-route-gallery/\` no repositório (ZIP completo: \`Hubora-9.0.0-Redesign-Cinematic-Real.zip\`).

## Como executar

\`\`\`powershell
npm install
npm run dev
# abrir http://localhost:3000
\`\`\`

## Como gerar o build de produção

\`\`\`powershell
npm run typecheck
npm run build
npm run preview
\`\`\`

## Suíte de testes

\`\`\`powershell
npm run test
node scripts/redesign-accessibility-audit.mjs
\`\`\`

## Dependências adicionadas

Nenhuma. O redesign reutilizou o stack existente.

## Onde estão os artefatos completos

Os artefatos completos (screenshots 125 PNGs em 4 viewports, relatório HTML do Playwright) estão em:

- \`artifacts/redesign-route-gallery/\` (não incluído neste ZIP lean)
- \`artifacts/redesign-playwright/\` (sumário incluso)
- \`artifacts/redesign-before-after/\` (matriz textual inclusa)

No ZIP completo (\`Hubora-9.0.0-Redesign-Cinematic-Real.zip\`) esses diretórios estão incluídos integralmente.
`);

  // Create the ZIP using PowerShell
  const ps = spawn('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path "${STAGING}\\*" -DestinationPath "${ZIP_PATH}" -CompressionLevel Optimal -Force`,
  ], { stdio: 'inherit' });

  await new Promise((resolve, reject) => {
    ps.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`PowerShell exited ${code}`)));
  });

  const finalSize = (await stat(ZIP_PATH)).size;
  console.log(`Lean ZIP created: ${ZIP_PATH} (${(finalSize / 1024 / 1024).toFixed(2)} MB)`);

  await rm(STAGING, { recursive: true, force: true });
}

main().catch((error) => {
  console.error('Lean ZIP build failed:', error);
  process.exitCode = 1;
});
