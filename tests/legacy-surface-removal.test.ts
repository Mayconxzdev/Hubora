import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('remoção do Companion e da execução local', () => {
  it('não distribui servidor, instalador, pacote ou cliente do Companion', () => {
    for (const relativePath of [
      'companion/server.mjs',
      'companion/install-windows.ps1',
      'companion/start-companion.cmd',
      'public/companion/Hubora-Companion-Windows.zip',
      'src/services/companion.ts',
      'tests/companion.test.ts',
    ]) {
      expect(existsSync(resolve(root, relativePath)), relativePath).toBe(false);
    }
  });

  it('não inclui WebTorrent ou serviços de mídia/launcher locais no runtime', () => {
    const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies).not.toHaveProperty('webtorrent');
    for (const relativePath of [
      'src/pages/PersonalMedia.tsx',
      'src/server/gameController.ts',
    ]) {
      expect(existsSync(resolve(root, relativePath)), relativePath).toBe(false);
    }
  });

  it('não anuncia Companion, debrid ou mídia local nas superfícies do produto', () => {
    for (const relativePath of [
      'src/App.tsx',
      'src/pages/Providers.tsx',
      'src/pages/Player.tsx',
      'src/pages/Settings.tsx',
      'src/pages/Sources.tsx',
      'server.ts',
      'README.md',
      'docs/legacy/FEATURES-AND-LIMITS.md',
      'docs/architecture/NETLIFY_DEPLOY.md',
    ]) {
      const source = readFileSync(resolve(root, relativePath), 'utf8');
      expect(source, relativePath).not.toMatch(/companion|real-debrid|torbox|webtorrent|gameController/i);
    }
  });
});
