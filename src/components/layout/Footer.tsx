import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return <footer className="relative z-10 mt-16 border-t border-[var(--hub-border)] bg-[color-mix(in_srgb,var(--hub-surface-1)_88%,transparent)] px-4 py-8 backdrop-blur-xl">
    <div className="mx-auto flex max-w-[100rem] flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--hub-brand)] font-black text-black">H</div><div><strong className="block tracking-tight text-[var(--hub-text-strong)]">Hubora Personal</strong><p className="text-xs text-[var(--hub-subtle)]">Biblioteca privada, descoberta e progresso sincronizado.</p></div></div>
      <nav aria-label="Links do rodapé" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-bold text-[var(--hub-muted)]">
        <Link to="/providers" className="hover:text-[var(--hub-brand)]">Fontes</Link>
        <Link to="/personal-media" className="hover:text-[var(--hub-brand)]">Minha mídia</Link>
        <Link to="/privacy" className="hover:text-[var(--hub-brand)]">Privacidade</Link>
        <Link to="/terms" className="hover:text-[var(--hub-brand)]">Uso responsável</Link>
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--hub-brand)]">TMDB <ExternalLink size={11}/></a>
      </nav>
    </div>
    <div className="mx-auto mt-5 flex max-w-[100rem] flex-col gap-2 border-t border-[var(--hub-border)] pt-5 text-[0.7rem] text-[var(--hub-subtle)] sm:flex-row sm:items-center sm:justify-between"><p>© {currentYear} Hubora. Edição pessoal; não hospeda catálogos comerciais.</p><p className="inline-flex items-center gap-1.5"><ShieldCheck size={13}/> Seus dados privados permanecem vinculados à sua conta.</p></div>
  </footer>;
}
