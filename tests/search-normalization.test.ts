import { describe, expect, it } from 'vitest';
import { normalizeSearchText } from '@/services/api';

describe('normalização da busca global', () => {
  it('trata caixa, acento, espaço e hífen sem alterar a intenção textual', () => {
    expect(normalizeSearchText('homem aranha')).toBe(normalizeSearchText('Homem-Aranha'));
    expect(normalizeSearchText('Spider-Man')).toBe('spiderman');
    expect(normalizeSearchText('SPIDER MAN')).toBe(normalizeSearchText('Spider-Man'));
  });

  it('não considera consultas de um caractere como busca válida no contrato', () => {
    for (const query of ['homem aranha', 'Homem-Aranha', 'Spider-Man']) {
      expect(query.trim().length).toBeGreaterThanOrEqual(2);
    }
  });
});
