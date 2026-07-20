import React from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { MediaCard } from '@/components/ui/MediaCard';
import { VirtualGrid } from '@/components/ui/VirtualGrid';
import { MediaItem } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface SectionPageLayoutProps {
  title: string;
  subtitle?: string;
  isLoading: boolean;
  isError?: boolean;
  error?: Error | null;
  items: MediaItem[];
  children?: React.ReactNode;
  footer?: React.ReactNode;
  hideEmptyState?: boolean;
  emptyMessage?: React.ReactNode;
  extraHeaderActions?: React.ReactNode;
}

export function SectionPageLayout({ title, subtitle, isLoading, isError, error, items, children, footer, hideEmptyState, emptyMessage, extraHeaderActions }: SectionPageLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="hub-page">
      <header className="hub-page-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="hub-section-eyebrow">Catálogo Hubora</div>
          <h1 className="hub-page-title">{title}</h1>
          {subtitle && <p className="hub-page-subtitle">{subtitle}</p>}
        </div>
        {extraHeaderActions && <div className="flex-shrink-0">{extraHeaderActions}</div>}
      </header>

      {children}

      {isError ? (
        <div className="hub-empty-state border-red-500/25 bg-red-500/6">
          <div>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-[1rem] bg-red-500/10 text-red-500"><AlertCircle size={26} /></span>
            <h3 className="mt-4 text-xl font-extrabold text-[var(--hub-text-strong)]">Não foi possível carregar agora</h3>
            <p className="mx-auto mt-2 max-w-lg leading-relaxed text-[var(--hub-muted)]">{error?.message || 'A fonte externa não respondeu. Seus dados salvos continuam disponíveis.'}</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 2xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => <MediaCard key={index} isLoading />)}
        </div>
      ) : items.length === 0 && !hideEmptyState ? (
        <div className="hub-empty-state">
          {emptyMessage || <div><Inbox className="mx-auto text-[var(--hub-subtle)]" size={34} /><p className="mt-4 font-bold text-[var(--hub-text-strong)]">{t('section.empty')}</p><p className="mt-1 text-sm">{t('section.empty.desc')}</p></div>}
        </div>
      ) : items.length > 0 ? (
        <>
          <VirtualGrid items={items} />
          {footer}
        </>
      ) : null}
    </div>
  );
}
