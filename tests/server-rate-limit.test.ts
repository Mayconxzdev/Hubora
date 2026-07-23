import { describe, expect, it } from 'vitest';
import {
  API_RATE_LIMIT_WINDOW_MS,
  DEFAULT_API_RATE_LIMIT_PER_MINUTE,
  resolveApiRateLimit,
} from '../src/server/rateLimits';

describe('limite global das APIs do Hubora', () => {
  it('permite a carga normal das telas compostas sem remover a proteção global', () => {
    expect(API_RATE_LIMIT_WINDOW_MS).toBe(60_000);
    expect(DEFAULT_API_RATE_LIMIT_PER_MINUTE).toBe(600);
    expect(resolveApiRateLimit(undefined)).toBe(600);
  });

  it('rejeita valores inválidos e restringe overrides a uma faixa segura', () => {
    expect(resolveApiRateLimit('invalid')).toBe(600);
    expect(resolveApiRateLimit('1')).toBe(120);
    expect(resolveApiRateLimit('999999')).toBe(5_000);
    expect(resolveApiRateLimit('900')).toBe(900);
  });
});
