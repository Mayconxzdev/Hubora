import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '@/components/layout/Sidebar';

describe('navegação adaptativa', () => {
  it('começa compacta e só revela os rótulos quando a pessoa pedir', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Sidebar pinned={false} onPinnedChange={vi.fn()} />
      </MemoryRouter>,
    );

    screen.getByRole('navigation', { name: /navegação principal/i });
    expect(screen.queryByText('Minha lista')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /expandir menu/i }));
    expect(screen.getByText('Minha lista')).toBeTruthy();
    expect(screen.getByText('Descobrir')).toBeTruthy();
  });
});
