import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'danger' | 'soft';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border text-sm font-bold tracking-[-0.01em] transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]',
        {
          'border-transparent bg-[var(--hub-brand)] text-[var(--hub-brand-contrast)] shadow-[0_10px_24px_rgba(114,92,255,0.18)] hover:-translate-y-0.5 hover:bg-[var(--hub-brand-strong)] hover:shadow-[0_14px_32px_rgba(114,92,255,0.24)]': variant === 'default',
          'border-[var(--hub-border)] bg-[var(--hub-surface-1)] text-[var(--hub-text)] shadow-[var(--hub-shadow-sm)] hover:-translate-y-0.5 hover:border-[var(--hub-border-strong)] hover:bg-[var(--hub-surface-2)]': variant === 'outline',
          'border-transparent bg-transparent text-[var(--hub-muted)] hover:bg-[var(--hub-surface-2)] hover:text-[var(--hub-text-strong)]': variant === 'ghost',
          'border-transparent bg-[var(--hub-accent)] text-[var(--hub-brand-contrast)] shadow-[0_10px_24px_rgba(114,92,255,0.14)] hover:-translate-y-0.5 hover:brightness-105': variant === 'secondary',
          'border-transparent bg-[var(--hub-danger)] text-white hover:-translate-y-0.5 hover:brightness-110': variant === 'danger',
          'border-[color-mix(in_srgb,var(--hub-brand)_24%,var(--hub-border))] bg-[var(--hub-brand-soft)] text-[color-mix(in_srgb,var(--hub-brand)_82%,var(--hub-text-strong))] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--hub-brand)_45%,var(--hub-border))]': variant === 'soft',
          'min-h-11 px-4 py-2.5': size === 'default',
          'min-h-9 rounded-[0.8rem] px-3 py-1.5 text-xs': size === 'sm',
          'min-h-13 rounded-[1rem] px-6 py-3 text-base': size === 'lg',
          'h-11 w-11 rounded-full p-0': size === 'icon',
        },
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { Button };
