import { ArrowRight, BookOpen, Film, Gamepad2, Network, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MediaItem } from '@/types';
import { getCrossMediaSearchContext } from '@/services/franchiseContext';

function mediaLabel(type: MediaItem['mediaType']): string {
  const map: Record<string, string> = { movie: 'Filme', tv: 'Série', series: 'Série', drama: 'Dorama', anime: 'Anime', manga: 'Mangá', comic: 'Quadrinho', book: 'Livro', novel: 'Novel', game: 'Jogo' };
  return map[type] || 'Mídia';
}

export function MediaPassport({ item }: { item: MediaItem }) {
  const connections = item.connections || [];
  const people = [...(item.authors || []), ...(item.developers || []), ...(item.publishers || []), ...(item.cast || []).slice(0, 3).map((person) => person.name)].filter(Boolean);
  const relationLabels = connections.slice(0, 5).map((connection) => connection.targetTitle || connection.label);
  const signals = [...new Set([...relationLabels, ...people])].slice(0, 6);
  const crossMediaContext = getCrossMediaSearchContext(item);

  return <section className="hub-panel mt-8 overflow-hidden p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="hub-section-eyebrow"><Sparkles size={14}/> Caminhos entre mídias</div><h2 className="text-2xl font-black text-[var(--hub-text-strong)]">Passaporte Multimídia</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--hub-muted)]">Conecte esta obra a adaptações, continuações, criadores e outros formatos sem misturar versões diferentes.</p></div>
      <span className="hub-chip shrink-0">{mediaLabel(item.mediaType)}</span>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <Link to={`/guide?q=${encodeURIComponent(item.title)}`} className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4 transition hover:border-[var(--hub-border-strong)]"><Film size={20} className="text-[var(--hub-brand)]"/><strong className="mt-3 block text-sm text-[var(--hub-text-strong)]">Ordem da franquia</strong><small className="mt-1 block text-xs leading-relaxed text-[var(--hub-muted)]">Veja a ordem por lançamento e marque o que já consumiu.</small></Link>
      <Link to="/connections" className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4 transition hover:border-[var(--hub-border-strong)]"><Network size={20} className="text-[var(--hub-brand)]"/><strong className="mt-3 block text-sm text-[var(--hub-text-strong)]">Grafo de conexões</strong><small className="mt-1 block text-xs leading-relaxed text-[var(--hub-muted)]">Explore autores, estúdios, elenco, gêneros e obras relacionadas.</small></Link>
      {crossMediaContext ? (
        <Link to={`/discover?q=${encodeURIComponent(crossMediaContext.query)}&context=tmdb-collection&collection=${encodeURIComponent(crossMediaContext.label)}`} className="rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4 transition hover:border-[var(--hub-border-strong)]"><Gamepad2 size={20} className="text-[var(--hub-brand)]"/><strong className="mt-3 block text-sm text-[var(--hub-text-strong)]">Explorar outros formatos</strong><small className="mt-1 block text-xs leading-relaxed text-[var(--hub-muted)]">Busca por “{crossMediaContext.query}” a partir da coleção TMDB confirmada. Cada resultado continua identificado pelo seu próprio provedor.</small></Link>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4"><Gamepad2 size={20} className="text-[var(--hub-muted)]"/><strong className="mt-3 block text-sm text-[var(--hub-text-strong)]">Outros formatos indisponíveis</strong><small className="mt-1 block text-xs leading-relaxed text-[var(--hub-muted)]">Esta fonte não informou uma coleção ou relação de franquia verificável. O Hubora não cria vínculos entre formatos só por títulos parecidos.</small></div>
      )}
    </div>

    {signals.length > 0 && <div className="mt-5 border-t border-[var(--hub-border)] pt-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--hub-subtle)]">Conexões encontradas</p><div className="mt-3 flex flex-wrap gap-2">{signals.map((signal) => <span key={signal} className="hub-chip"><BookOpen size={13}/>{signal}<ArrowRight size={12}/></span>)}</div></div>}
  </section>;
}
