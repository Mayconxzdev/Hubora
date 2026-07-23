import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, BookOpen, CheckCircle2, Clock3, Gamepad2, Star, TrendingUp } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { localRepository } from '@/services/localRepository';
import { useStore } from '@/store/useStore';
import type { ConsumptionEvent, UserMediaEntry } from '@/types';
import { cn } from '@/lib/utils';

function eventLabel(event: ConsumptionEvent, entry?: UserMediaEntry): string {
  const value = event.value;
  if (event.kind === 'completed') return 'Concluiu a obra';
  if (event.kind === 'rating') return `Avaliou com ${value} estrela${Number(value) === 1 ? '' : 's'}`;
  if (event.kind === 'status') return `Alterou o status para ${String(value)}`;
  if (event.kind === 'session') return `Registrou uma sessão${typeof value === 'number' ? ` de ${value} min` : ''}`;
  const type = entry?.mediaType;
  if (type === 'book') return `Avançou até a página ${value ?? 'registrada'}`;
  if (type === 'manga' || type === 'comic') return `Avançou até o capítulo/edição ${value ?? 'registrado'}`;
  if (type === 'game') return `Atualizou para ${value ?? 0} horas jogadas`;
  return `Avançou até o episódio ${value ?? 'registrado'}`;
}

function EventIcon({ event, entry }: { event: ConsumptionEvent; entry?: UserMediaEntry }) {
  if (event.kind === 'completed') return <CheckCircle2 size={18} className="text-green-400" />;
  if (event.kind === 'rating') return <Star size={18} className="text-yellow-400" />;
  if (entry?.mediaType === 'game') return <Gamepad2 size={18} className="text-cyan-400" />;
  if (['book', 'novel', 'manga', 'comic'].includes(entry?.mediaType || '')) return <BookOpen size={18} className="text-blue-400" />;
  return <TrendingUp size={18} className="text-purple-400" />;
}

export function Diary() {
  const [events, setEvents] = useState<ConsumptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const library = useStore((state) => state.library);

  useEffect(() => {
    let active = true;
    const reload = () => {
      void localRepository.getConsumptionEvents().then((items) => {
        if (active) setEvents(items);
      }).finally(() => active && setLoading(false));
    };
    reload();
    const unsubscribe = localRepository.subscribeConsumptionEvents(reload);
    return () => { active = false; unsubscribe(); };
  }, []);

  const filtered = useMemo(() => {
    let result = events;
    if (typeFilter !== 'all') {
      result = result.filter((e) => library[e.entryId]?.mediaType === typeFilter);
    }
    if (periodFilter !== 'all') {
      const now = Date.now();
      const ms = periodFilter === 'week' ? 7 * 86400000 : periodFilter === 'month' ? 30 * 86400000 : 365 * 86400000;
      result = result.filter((e) => e.occurredAt >= now - ms);
    }
    return result;
  }, [events, typeFilter, periodFilter, library]);

  const stats = useMemo(() => ({
    total: filtered.length,
    completed: filtered.filter((e) => e.kind === 'completed').length,
    ratings: filtered.filter((e) => e.kind === 'rating').length,
  }), [filtered]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, ConsumptionEvent[]>>((acc, event) => {
      const key = new Date(event.occurredAt).toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      });
      (acc[key] ||= []).push(event);
      return acc;
    }, {});
  }, [filtered]);

  return (
    <div className="hub-page mx-auto w-full max-w-5xl">
      <Helmet>
        <title>Diário Universal | Hubora</title>
        <meta name="description" content="Linha do tempo de tudo o que você assistiu, leu e jogou." />
      </Helmet>

      <header className="hub-page-header items-start">
        <div>
          <div className="hub-section-eyebrow"><Clock3 size={14} /> Sua linha do tempo</div>
          <h1 className="hub-page-title">Diário Universal</h1>
          <p className="hub-page-subtitle">Sua história de filmes, séries, leituras e jogos em uma única linha do tempo.</p>
        </div>
      </header>

      {/* Filtros e Stats */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-[var(--hub-border)] overflow-hidden">
          {[['all', 'Tudo'], ['movie', 'Filmes'], ['tv', 'Séries'], ['anime', 'Anime'], ['manga', 'Mangá'], ['book', 'Livros'], ['game', 'Jogos']].map(([id, label]) => (
            <button key={id} onClick={() => setTypeFilter(id)} className={cn('px-3 py-1.5 text-xs font-bold transition-all', typeFilter === id ? 'bg-[var(--hub-brand)] text-[var(--hub-brand-contrast)]' : 'text-[var(--hub-muted)] hover:text-white')}>{label}</button>
          ))}
        </div>
        <div className="flex rounded-xl border border-[var(--hub-border)] overflow-hidden">
          {[['all', 'Todo período'], ['week', 'Semana'], ['month', 'Mês'], ['year', 'Ano']].map(([id, label]) => (
            <button key={id} onClick={() => setPeriodFilter(id)} className={cn('px-3 py-1.5 text-xs font-bold transition-all', periodFilter === id ? 'bg-[var(--hub-brand)] text-[var(--hub-brand-contrast)]' : 'text-[var(--hub-muted)] hover:text-white')}>{label}</button>
          ))}
        </div>
        <span className="ml-auto text-xs font-bold text-[var(--hub-subtle)]">{stats.total} eventos • {stats.completed} conclusões • {stats.ratings} avaliações</span>
      </div>

      {loading ? (
        <div className="grid min-h-64 place-items-center"><div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--hub-brand-soft)] border-t-[var(--hub-brand)]" /></div>
      ) : filtered.length === 0 ? (
        <div className="hub-empty-state">
          <Activity className="mx-auto mb-4 text-[var(--hub-brand)]" size={38} />
          <h2 className="text-xl font-extrabold text-[var(--hub-text-strong)]">Seu diário começa no próximo progresso</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--hub-muted)]">Atualize um episódio, capítulo, página, hora jogada, nota ou status para criar o primeiro registro.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <section key={date}>
              <h2 className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[var(--hub-subtle)] capitalize">{date}</h2>
              <div className="space-y-3">
                {dayEvents.map((event) => {
                  const entry = library[event.entryId];
                  return (
                    <article key={event.id} className="hub-panel flex items-center gap-4 p-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)]">
                        <EventIcon event={event} entry={entry} />
                      </div>
                      <div className="min-w-0 flex-1">
                        {entry ? (
                          <Link to={`/details/${entry.mediaId || entry.id}`} className="truncate font-bold text-[var(--hub-text-strong)] hover:text-[var(--hub-brand)] transition-colors">{entry.title}</Link>
                        ) : (
                          <h3 className="truncate font-bold text-[var(--hub-text-strong)]">Obra removida da biblioteca</h3>
                        )}
                        <p className="text-sm text-[var(--hub-muted)]">{eventLabel(event, entry)}</p>
                      </div>
                      <time className="shrink-0 text-xs text-[var(--hub-subtle)]">{new Date(event.occurredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

    </div>
  );
}
