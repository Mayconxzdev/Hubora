import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/ui/SEO';

export function NotFound() {
  return (
    <div className="hub-page">
      <SEO
        title="Página não encontrada"
        description="A rota solicitada não existe no Hubora."
      />
      <section className="hub-empty-state mx-auto max-w-2xl py-16 text-center sm:py-24">
        <SearchX aria-hidden="true" size={42} />
        <p className="hub-section-eyebrow mt-5">Erro 404</p>
        <h1 className="hub-page-title mt-2">Página não encontrada</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--hub-muted)] sm:text-base">
          Este endereço não corresponde a uma área do Hubora. Volte ao início para continuar navegando.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-transparent bg-[var(--hub-brand)] px-4 py-2.5 text-sm font-bold text-[var(--hub-brand-contrast)] shadow-[0_10px_24px_rgba(114,92,255,0.18)] transition hover:-translate-y-0.5 hover:bg-[var(--hub-brand-strong)] focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden="true" size={17} />
          Voltar para o início
        </Link>
      </section>
    </div>
  );
}
