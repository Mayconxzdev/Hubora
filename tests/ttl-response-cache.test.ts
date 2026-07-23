import { describe, expect, it, vi } from 'vitest';
import { TtlResponseCache } from '../src/server/ttlResponseCache';

describe('TtlResponseCache', () => {
  it('retorna uma resposta somente enquanto ela estiver válida', () => {
    const now = vi.fn(() => 1_000);
    const cache = new TtlResponseCache<string>(10_000, 2, now);

    cache.set('detalhes', 'conteúdo');
    expect(cache.get('detalhes')).toBe('conteúdo');

    now.mockReturnValue(11_001);
    expect(cache.get('detalhes')).toBeUndefined();
  });

  it('limita o número de entradas sem reter a mais antiga', () => {
    const cache = new TtlResponseCache<string>(10_000, 2, () => 1_000);

    cache.set('primeira', '1');
    cache.set('segunda', '2');
    cache.set('terceira', '3');

    expect(cache.get('primeira')).toBeUndefined();
    expect(cache.get('segunda')).toBe('2');
    expect(cache.get('terceira')).toBe('3');
  });
});
