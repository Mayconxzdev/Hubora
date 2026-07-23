import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('contrato das novas chaves Supabase', () => {
  for (const file of ['server.ts', 'netlify/functions/health-full.mts']) {
    it(`${file} usa a chave de aplicação no cabeçalho apikey sem fingir que é JWT`, () => {
      const source = readFileSync(resolve(file), 'utf8');
      const probeBlock = source.slice(source.indexOf('async function probeSupabaseSchema'), source.indexOf('async function probeSupabaseSchema') + 1_100);
      expect(probeBlock).toContain('apikey: key');
      expect(probeBlock).not.toContain('Authorization: `Bearer ${key}`');
    });
  }
});
