import type { ReactNode } from 'react';
import { BookmarkCheck, Boxes, Cloud, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CATEGORY_NAVIGATION } from '@/config/navigation';

const capabilities = [
  { icon: Search, title: 'Encontre', description: 'Pesquise obras, cenas e fontes em nove categorias.' },
  { icon: BookmarkCheck, title: 'Acompanhe', description: 'Guarde status, avaliação, progresso e histórico.' },
  { icon: Cloud, title: 'Sincronize se quiser', description: 'Conta é opcional; convidado continua no próprio aparelho.' },
] as const;

export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-var(--hub-header-height)-3rem)] w-full max-w-7xl overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)] lg:grid-cols-[minmax(0,1.05fr)_minmax(25rem,0.95fr)]">
      <section className="relative hidden border-r border-[var(--hub-border)] bg-black p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14" aria-label="O que você pode fazer no Hubora">
        <div>
          <Link to="/" className="inline-flex min-h-11 items-center gap-3 rounded-xl" aria-label="Hubora — voltar ao início">
            <span className="grid size-11 place-items-center rounded-xl bg-white text-black"><Boxes size={21} strokeWidth={2.4} /></span>
            <span className="text-lg font-extrabold tracking-[-0.03em]">Hubora</span>
          </Link>

          <h2 className="mt-14 max-w-2xl text-5xl font-black leading-[0.98] tracking-[-0.04em] xl:text-6xl">
            Seu universo cultural, organizado para a próxima escolha.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 xl:text-lg">
            Descubra, entenda, acompanhe, leia e assista por fontes reais — sem perder o ponto onde parou.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {capabilities.map(({ icon: Icon, title: capabilityTitle, description: capabilityDescription }) => (
              <div key={capabilityTitle} className="min-w-0">
                <Icon size={20} className="text-[var(--hub-brand)]" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-bold">{capabilityTitle}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/58">{capabilityDescription}</p>
              </div>
            ))}
          </div>
        </div>

        <nav className="mt-12 flex flex-wrap gap-2" aria-label="Categorias disponíveis">
          {CATEGORY_NAVIGATION.map(({ label, path, icon: Icon }) => (
            <Link key={path} to={path} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/12 px-3 text-xs font-semibold text-white/70 transition-colors hover:border-white/24 hover:text-white">
              <Icon size={14} aria-hidden="true" /> {label}
            </Link>
          ))}
        </nav>
      </section>

      <main id="hub-auth-content" tabIndex={-1} className="flex items-center justify-center p-5 sm:p-10 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="mb-8 inline-flex min-h-11 items-center gap-3 rounded-xl lg:hidden" aria-label="Hubora — voltar ao início">
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--hub-text-strong)] text-[var(--hub-bg)]"><Boxes size={20} strokeWidth={2.4} /></span>
              <span className="text-xl font-black tracking-[-0.03em] text-[var(--hub-text-strong)]">Hubora</span>
            </Link>
            <h1 className="text-3xl font-black leading-tight tracking-[-0.04em] text-[var(--hub-text-strong)] sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-[65ch] leading-relaxed text-[var(--hub-muted)]">{description}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
