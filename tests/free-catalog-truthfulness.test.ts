import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('catálogo gratuito honesto', () => {
  const source = readFileSync(resolve('netlify/functions/free-catalog.mts'), 'utf8');

  it('só incorpora cópias da Open Library marcadas como digitalização pública', () => {
    expect(source).toContain('ia && doc.public_scan_b');
  });

  it('exige evidência explícita de licença aberta antes de incorporar vídeo do Internet Archive', () => {
    expect(source).toContain('hasOpenLicense');
    expect(source).toContain('Verificar acesso e licença na origem');
  });
});
