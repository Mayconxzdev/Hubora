import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Radar OCR content security policy', () => {
  it('permite somente o CDN exato usado pelo worker, núcleo e idiomas do Tesseract', () => {
    const server = readFileSync('server.ts', 'utf8');
    const netlify = readFileSync('netlify.toml', 'utf8');

    expect(server).toContain("'https://cdn.jsdelivr.net'");
    expect(netlify).toContain(
      "script-src 'self' 'wasm-unsafe-eval' https://www.google.com https://books.google.com https://cdn.jsdelivr.net",
    );
    expect(netlify).toContain("worker-src 'self' blob: https://cdn.jsdelivr.net");

    const scriptSrc = server.match(/scriptSrc:\s*\[([\s\S]*?)\]/)?.[1] || '';
    const workerSrc = server.match(/workerSrc:\s*\[([\s\S]*?)\]/)?.[1] || '';
    expect(scriptSrc).toContain("'wasm-unsafe-eval'");
    expect(scriptSrc).toContain("'https://cdn.jsdelivr.net'");
    expect(workerSrc).toContain("'blob:'");
    expect(workerSrc).toContain("'https://cdn.jsdelivr.net'");
  });
});
