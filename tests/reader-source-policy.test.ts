import { describe, expect, it } from 'vitest';
import { parseAllowedReaderSource, readerProxyUrl } from '@/config/readerSources';

describe('política de fontes do leitor', () => {
  it('aceita EPUB/PDF HTTPS somente de bibliotecas autorizadas', () => {
    const epub = 'https://www.gutenberg.org/cache/epub/5200/pg5200-images-3.epub';
    expect(parseAllowedReaderSource(epub)?.toString()).toBe(epub);
    expect(parseAllowedReaderSource('https://ia801605.us.archive.org/item/book.pdf')?.hostname).toBe('ia801605.us.archive.org');
    expect(readerProxyUrl(epub)).toContain('/api/reader-source?url=');
  });

  it('rejeita protocolos, credenciais, portas, hosts parecidos e formatos arbitrários', () => {
    for (const source of [
      'http://www.gutenberg.org/book.epub',
      'https://user:pass@www.gutenberg.org/book.epub',
      'https://www.gutenberg.org:444/book.epub',
      'https://evilgutenberg.org/book.epub',
      'https://archive.org.evil.example/book.pdf',
      'https://www.gutenberg.org/script.html',
    ]) expect(parseAllowedReaderSource(source)).toBeNull();
  });
});
