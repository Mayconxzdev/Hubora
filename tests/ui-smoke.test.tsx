import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '@/App';
import { huboraDb } from '@/lib/db';

describe('interface principal', () => {
  beforeEach(async () => {
    await huboraDb.delete();
    await huboraDb.open();
    window.history.pushState({}, '', '/login');
  });

  it('abre a rota de login sem erro fatal', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /entrar no hubora/i })).toBeTruthy();
  });
});
