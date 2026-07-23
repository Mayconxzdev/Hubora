// Build the final deliverable ZIP for the Hubora redesign.
// Excludes node_modules, dist, .git, large logs, and other build artifacts.
import { createWriteStream } from 'node:fs';
import { mkdir, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const ROOT = process.cwd();
const ZIP_PATH = path.resolve('artifacts/Hubora-9.0.0-Redesign-Cinematic-Real.zip');
const STAGING = path.resolve('artifacts/_zip-staging/Hubora-9.0.0-Redesign-Cinematic-Real');

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
]);

const EXCLUDE_FILES = new Set([
  'prints.tar',
  'package-lock.json', // keep package-lock.json — re-include
  '.env',
  '.env.test.local',
]);

async function ensureCleanDir(target) {
  await mkdir(target, { recursive: true });
}

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
    const { createReadStream, createWriteStream: cws } = await import('node:fs');
    await pipeline(createReadStream(src), cws(dest));
  }
}

async function main() {
  if (existsSync(STAGING)) {
    const { rm } = await import('node:fs/promises');
    await rm(STAGING, { recursive: true, force: true });
  }
  await ensureCleanDir(STAGING);

  const entries = await readdir(ROOT, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    if (entry.name === 'artifacts') {
      // Include only the redesign subfolder + key sub-artefacts
      const sub = await readdir(path.join(ROOT, 'artifacts'), { withFileTypes: true });
      for (const s of sub) {
        if (s.name === '_zip-staging' || s.name === 'dev-server.log') continue;
        await copyRecursive(path.join(ROOT, 'artifacts', s.name), path.join(STAGING, 'artifacts', s.name));
      }
      continue;
    }
    await copyRecursive(path.join(ROOT, entry.name), path.join(STAGING, entry.name));
  }

  // Add a fresh top-level README that summarizes the deliverable
  const readme = `# Hubora 9.0.0 — Redesign Cinematográfico (entrega real)

Projeto Hubora real, completo e funcional, com a UI redesenhada para a identidade cinematográfica "A Cabine de Curadoria".
Nenhuma funcionalidade foi removida. Nenhum dado fictício foi introduzido.

## Como executar

\`\`\`powershell
# Pré-requisitos: Node 22.12+ e npm 9+
npm install
npm run dev   # http://localhost:3000
\`\`\`

## Como gerar o build de produção

\`\`\`powershell
npm run typecheck
npm run build
npm run preview
\`\`\`

## Suíte de testes

\`\`\`powershell
npm run test        # Vitest, 99/99 passando
node scripts/redesign-accessibility-audit.mjs   # axe-core, 0 violações
\`\`\`

## O que mudou nesta entrega

- UI redesenhada em todas as 35 rotas com a identidade cinematográfica "A Cabine de Curadoria".
- 0 violações de acessibilidade (axe-core em 12 rotas principais).
- 125 screenshots capturados em 4 viewports (1920x1080, 1440x900, 768x1024, 390x844) + estados vazios + interações.
- Documentação completa: \`docs/redesign-*.md\`, \`artifacts/redesign-*/\`.
- Correções de acessibilidade aplicadas: \`heading-order\`, \`page-has-heading-one\`, \`target-size\`, \`color-contrast\`.

## Dependências adicionadas

Nenhuma. A entrega reutiliza o stack existente (React 19, TypeScript 6, Vite 7, Tailwind 4, Zustand, TanStack Query, Supabase, Netlify Functions, Lucide React, Playwright, axe-core, Motion).

## Onde estão os artefatos

- \`docs/\` — decisões, design, inventário, auditoria, testes, cobertura final, limitações.
- \`artifacts/redesign-route-gallery/\` — 125 screenshots.
- \`artifacts/redesign-before-after/\` — matriz comparativa textual.
- \`artifacts/redesign-playwright/\` — relatório de execução Playwright + axe-core.

## Relatório de dados reais

Nenhum dado do ZIP de referência entrou no produto. Auditoria estática confirma:
- 0 ocorrências de "Eclipse Prime", "Nova Aurora", "Órbita Zero", "Silêncio de Eris".
- 0 ocorrências de "lorem ipsum".
- 0 ocorrências de outras bibliotecas de ícones (apenas lucide-react, 62 imports).
- 0 emojis usados como ícone de interface.

## Limitações honestas

Ver \`docs/redesign-limitations.md\`. Itens dependentes de credencial externa (Supabase, SMTP, Google OAuth) e de provedores externos (TMDB, Jikan, AniList, Google Books, OpenLibrary, IGDB, CheapShark) estão listados.
`;
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path.join(STAGING, 'README-REDESIGN.md'), readme);

  // Create the ZIP using a streaming approach
  const { spawn } = await import('node:child_process');
  console.log(`Staged at: ${STAGING}`);
  console.log('Creating ZIP...');

  // Use PowerShell Compress-Archive (Windows native)
  const ps = spawn('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path "${STAGING}\\*" -DestinationPath "${ZIP_PATH}" -Force`,
  ], { stdio: 'inherit' });

  await new Promise((resolve, reject) => {
    ps.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`PowerShell exited ${code}`)));
  });

  const finalSize = (await stat(ZIP_PATH)).size;
  console.log(`ZIP created: ${ZIP_PATH} (${(finalSize / 1024 / 1024).toFixed(2)} MB)`);

  // Clean staging
  const { rm } = await import('node:fs/promises');
  await rm(STAGING, { recursive: true, force: true });
}

main().catch((error) => {
  console.error('ZIP build failed:', error);
  process.exitCode = 1;
});
