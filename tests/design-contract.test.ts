import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve('src/index.css'), 'utf8');

describe('contrato visual canônico', () => {
  it('não aperta tipografia abaixo do limite de legibilidade', () => {
    const values = [...css.matchAll(/letter-spacing:\s*(-?\d*\.?\d+)em/g)].map((match) => Number(match[1]));
    expect(values.filter((value) => value < -0.04)).toEqual([]);
  });

  it('não usa faixa lateral grossa como acento de card', () => {
    expect(css).not.toMatch(/border-(?:left|right):\s*(?:[2-9]|\d{2,})px/i);
  });

  it('reserva a largura da navegação compacta no desktop', () => {
    expect(css).toMatch(/--hub-nav-offset:\s*var\(--hub-nav-compact\)/);
  });
});
