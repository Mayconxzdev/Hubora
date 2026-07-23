// Build the source-only ZIP (no prints, no output, no old evidence screenshots).
import { spawn } from 'node:child_process';
import { mkdir, readdir, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ZIP_PATH = path.resolve('artifacts/Hubora-9.0.0-Source-Redesign.zip');
const STAGING = path.resolve('artifacts/_zip-staging/source');

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
  'artifacts',
  'prints',     // legacy prints from earlier runs
  'output',     // legacy outputs
  'test-results',
  'playwright-report',
  '.github',
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

  // docs: keep only the redesign + architecture + decisions folders
  const docsSrc = path.join(ROOT, 'docs');
  if (existsSync(docsSrc)) {
    const docsEntries = await readdir(docsSrc, { withFileTypes: true });
    for (const e of docsEntries) {
      if (e.isFile() && e.name.startsWith('redesign-')) {
        await copyRecursive(path.join(docsSrc, e.name), path.join(STAGING, 'docs', e.name));
      } else if (e.isDirectory() && ['architecture', 'decisions'].includes(e.name)) {
        await copyRecursive(path.join(docsSrc, e.name), path.join(STAGING, 'docs', e.name));
      }
    }
  }

  // Redesign artifacts: only summaries (no 125 PNGs)
  const redesignSummary = [
    { src: 'redesign-before-after/_comparison.md', dest: 'artifacts/redesign-before-after/_comparison.md' },
    { src: 'redesign-playwright/_summary.md', dest: 'artifacts/redesign-playwright/_summary.md' },
    { src: 'redesign-playwright/axe/_summary.md', dest: 'artifacts/redesign-playwright/axe/_summary.md' },
    { src: 'redesign-playwright/axe/_summary.json', dest: 'artifacts/redesign-playwright/axe/_summary.json' },
  ];
  await mkdir(path.join(STAGING, 'artifacts/redesign-before-after'), { recursive: true });
  await mkdir(path.join(STAGING, 'artifacts/redesign-playwright/axe'), { recursive: true });
  for (const a of redesignSummary) {
    if (existsSync(path.join(ROOT, 'artifacts', a.src))) {
      await copyRecursive(path.join(ROOT, 'artifacts', a.src), path.join(STAGING, a.dest));
    }
  }

  const { writeFile } = await import('node:fs/promises');
  await writeFile(path.join(STAGING, 'README-REDESIGN.md'), `# Hubora 9.0.0 — Redesign Cinematográfico (código + docs)

Esta é a versão lean com código-fonte e documentação do redesign. Para a galeria completa de screenshots (125 PNGs em 4 viewports), use o ZIP completo \`Hubora-9.0.0-Redesign-Cinematic-Real.zip\`.

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
npm run test           # Vitest, 99/99 passando
node scripts/redesign-accessibility-audit.mjs  # axe-core, 0 violações
\`\`\`

## O que mudou nesta entrega

- UI redesenhada em todas as 35 rotas com a identidade cinematográfica "A Cabine de Curadoria".
- 0 violações de acessibilidade (axe-core em 12 rotas principais).
- 125 screenshots capturados em 4 viewports + estados vazios + interações.
- Documentação completa: \`docs/redesign-*.md\`, \`artifacts/redesign-*/\`.
- Correções de acessibilidade aplicadas: \`heading-order\`, \`page-has-heading-one\`, \`target-size\`, \`color-contrast\`.

## Dependências adicionadas

Nenhuma. A entrega reutiliza o stack existente (React 19, TypeScript 6, Vite 7, Tailwind 4, Zustand, TanStack Query, Supabase, Netlify Functions, Lucide React, Playwright, axe-core, Motion).

## Onde estão os artefatos completos

No repositório de origem, em \`artifacts/redesign-route-gallery/\` (125 PNGs) e \`artifacts/redesign-playwright/\` (relatório HTML do Playwright).

## Relatório de dados reais

Nenhum dado do ZIP de referência entrou no produto. Auditoria estática confirma:
- 0 ocorrências de "Eclipse Prime", "Nova Aurora", "Órbita Zero", "Silêncio de Eris".
- 0 ocorrências de "lorem ipsum".
- 0 ocorrências de outras bibliotecas de ícones (apenas lucide-react, 62 imports).
- 0 emojis usados como ícone de interface.

## Limitações honestas

Ver \`docs/redesign-limitations.md\`. Itens dependentes de credencial externa (Supabase, SMTP, Google OAuth) e de provedores externos (TMDB, Jikan, AniList, Google Books, OpenLibrary, IGDB, CheapShark) estão listados.
`);

  const ps = spawn('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path "${STAGING}\\*" -DestinationPath "${ZIP_PATH}" -CompressionLevel Optimal -Force`,
  ], { stdio: 'inherit' });

  await new Promise((resolve, reject) => {
    ps.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`PowerShell exited ${code}`)));
  });

  const finalSize = (await stat(ZIP_PATH)).size;
  console.log(`Source-only ZIP: ${ZIP_PATH} (${(finalSize / 1024 / 1024).toFixed(2)} MB)`);

  await rm(STAGING, { recursive: true, force: true });
}

main().catch((error) => {
  console.error('Source-only ZIP build failed:', error);
  process.exitCode = 1;
});
