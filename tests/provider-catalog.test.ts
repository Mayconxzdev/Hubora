import { describe, expect, it } from 'vitest';
import { PROVIDER_CATALOG, PROVIDER_CATEGORIES } from '@/data/providerCatalog';

describe('diretório universal de fontes', () => {
  it('cobre todas as categorias sem identificadores duplicados', () => {
    expect(PROVIDER_CATALOG).not.toHaveLength(0);
    expect(new Set(PROVIDER_CATALOG.map((item) => item.id)).size).toBe(PROVIDER_CATALOG.length);
    for (const category of PROVIDER_CATEGORIES.filter((item) => item.id !== 'all')) {
      expect(PROVIDER_CATALOG.some((item) => item.categories.includes(category.id as Exclude<typeof category.id, 'all'>))).toBe(true);
    }
  });

  it('distingue metadados, reprodução, arquivo, servidor e página externa sem launchers locais', () => {
    const modes = new Set(PROVIDER_CATALOG.map((item) => item.mode));
    expect([...modes]).toEqual(expect.arrayContaining(['metadata', 'downloadable-file', 'embedded-player', 'personal-server', 'external-page', 'manifest']));
    expect([...modes]).not.toContain('game-launcher');
    expect(PROVIDER_CATALOG.some((provider) => provider.capabilities.some((capability) => String(capability) === 'launch'))).toBe(false);
  });

  it('não expõe audiobooks como categoria ou provedor dedicado', () => {
    expect(PROVIDER_CATEGORIES.map((category) => category.id)).not.toContain('audiobooks');
    expect(PROVIDER_CATALOG.some((provider) => provider.categories.some((category) => String(category) === 'audiobooks'))).toBe(false);
    expect(PROVIDER_CATALOG.map((provider) => provider.id)).not.toEqual(expect.arrayContaining(['audiobookshelf', 'audible', 'librivox']));
  });
});
