import { describe, expect, it } from 'vitest';
import { safeHtmlEmbedSource } from '@/pages/Reader';

describe('incorporação HTML do leitor', () => {
  it('aceita somente o endpoint embed do Internet Archive', () => {
    expect(safeHtmlEmbedSource('https://archive.org/embed/example-book')).toBe('https://archive.org/embed/example-book');
    expect(safeHtmlEmbedSource('https://www.archive.org/embed/example-book')).toBe('https://www.archive.org/embed/example-book');
  });

  it('rejeita páginas HTTPS arbitrárias e páginas que não são embeds', () => {
    expect(safeHtmlEmbedSource('https://example.test/embed/example-book')).toBeNull();
    expect(safeHtmlEmbedSource('https://archive.org/details/example-book')).toBeNull();
  });
});
