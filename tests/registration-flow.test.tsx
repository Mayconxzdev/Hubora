import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Register } from '@/pages/Register';
import { Login } from '@/pages/Login';
import { authService } from '@/services/auth';

vi.mock('@/services/auth', () => ({
  authService: {
    registerWithEmail: vi.fn(),
    loginWithGoogle: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderRegistration() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<p>Página inicial</p>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('cadastro por e-mail', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('explica a confirmação quando o Supabase não inicia uma sessão', async () => {
    vi.mocked(authService.registerWithEmail).mockResolvedValue({ requiresEmailConfirmation: true });
    renderRegistration();

    fireEvent.change(screen.getByPlaceholderText('voce@email.com'), { target: { value: 'pessoa@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('No mínimo 8 caracteres'), { target: { value: 'senha-segura-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar minha conta' }));

    expect((await screen.findByRole('status')).textContent).toContain('Confirme seu e-mail');
    expect(screen.getByText('pessoa@example.com')).toBeTruthy();
    expect(screen.queryByText('Página inicial')).toBeNull();
  });

  it('entra no produto quando o cadastro já retorna uma sessão', async () => {
    vi.mocked(authService.registerWithEmail).mockResolvedValue({ requiresEmailConfirmation: false });
    renderRegistration();

    fireEvent.change(screen.getByPlaceholderText('voce@email.com'), { target: { value: 'pessoa@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('No mínimo 8 caracteres'), { target: { value: 'senha-segura-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar minha conta' }));

    await waitFor(() => expect(screen.getByText('Página inicial')).toBeTruthy());
  });

  it('oferece criação ou entrada com Google na tela de cadastro', async () => {
    vi.mocked(authService.loginWithGoogle).mockResolvedValue(undefined);
    renderRegistration();

    fireEvent.click(screen.getByRole('button', { name: 'Continuar com Google' }));

    await waitFor(() => expect(authService.loginWithGoogle).toHaveBeenCalledOnce());
  });

  it('confirma no login que o endereço de e-mail foi validado', () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={['/login?confirmed=1']}>
          <Login />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(screen.getByRole('status').textContent).toContain('E-mail confirmado');
  });
});
