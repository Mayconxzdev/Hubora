import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Plus, Trash2 } from 'lucide-react';
import { featureRepository } from '@/services/featureRepository';
import { localRepository } from '@/services/localRepository';
import type { ConsumptionEvent, Goal } from '@/types';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';

export function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<ConsumptionEvent[]>([]);
  const [title, setTitle] = useState('Concluir obras em 2026');
  const [target, setTarget] = useState(24);
  const load = () => void featureRepository.goals.list().then(setGoals);
  useEffect(load, []);
  useEffect(() => {
    const refreshEvents = () => { void localRepository.getConsumptionEvents(10_000).then(setEvents); };
    refreshEvents();
    const unsubscribe = localRepository.subscribeConsumptionEvents(refreshEvents);
    return () => { unsubscribe(); };
  }, []);
  const days = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400000;
    return Array.from({ length: 84 }, (_, index) => {
      const dayStart = now - (83 - index) * dayMs;
      const dayEnd = dayStart + dayMs;
      const active = events.some((e) => e.occurredAt >= dayStart && e.occurredAt < dayEnd);
      return { index, active };
    });
  }, [events]);

  const create = async () => {
    const normalizedTitle = title.trim();
    if (normalizedTitle.length < 3 || normalizedTitle.length > 120 || !Number.isInteger(target) || target < 1 || target > 10_000) return;
    const now = Date.now();
    await featureRepository.goals.put({ id: crypto.randomUUID(), title: normalizedTitle, metric: 'items', target, current: 0, startAt: new Date(new Date().getFullYear(), 0, 1).getTime(), endAt: new Date(new Date().getFullYear() + 1, 0, 1).getTime(), restDaysAllowed: true, createdAt: now, updatedAt: now });
    load();
  };

  const validGoal = title.trim().length >= 3
    && title.trim().length <= 120
    && Number.isInteger(target)
    && target >= 1
    && target <= 10_000;

  const currentFor = (goal: Goal) => {
    if (goal.metric !== 'items') return goal.current;
    return new Set(events
      .filter((event) => event.kind === 'completed' && event.occurredAt >= goal.startAt && event.occurredAt < goal.endAt)
      .map((event) => event.entryId)).size;
  };

  return (
    <div className="hub-page">
      <SEO title="Metas e hábitos" description="Metas pessoais sem gamificação excessiva." />
      <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><CalendarCheck2 size={14} /> Ritmo sustentável</div><h1 className="hub-page-title">Metas e hábitos</h1><p className="hub-page-subtitle">Acompanhe objetivos pessoais sem punir dias de descanso e sem transformar entretenimento em obrigação.</p></div></header>
      <section className="hub-panel p-5 sm:p-6"><div className="grid gap-3 md:grid-cols-[1fr_10rem_auto] md:items-end"><label className="text-sm font-bold text-[var(--hub-text-strong)]" htmlFor="goal-title">Nome da meta<input id="goal-title" className="hub-field mt-2" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label><label className="text-sm font-bold text-[var(--hub-text-strong)]" htmlFor="goal-target">Quantidade desejada<input id="goal-target" className="hub-field mt-2" type="number" min={1} max={10_000} value={target} onChange={(event) => setTarget(Number(event.target.value))} /></label><Button onClick={() => void create()} disabled={!validGoal}><Plus size={17}/> Criar meta</Button></div><p className="mt-3 text-xs text-[var(--hub-subtle)]">Use um nome de 3 a 120 caracteres e uma quantidade entre 1 e 10.000.</p></section>
      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map((goal) => { const current = currentFor(goal); const progress = Math.min(100, Math.round(current / goal.target * 100)); return <article key={goal.id} className="hub-panel p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-[var(--hub-text-strong)]">{goal.title}</h2><p className="mt-1 text-sm text-[var(--hub-muted)]">{current} de {goal.target} • descanso permitido</p></div><button className="hub-icon-button" onClick={() => void featureRepository.goals.delete(goal.id).then(load)} aria-label={`Excluir meta ${goal.title}`}><Trash2 size={17}/></button></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--hub-surface-3)]"><div className="h-full rounded-full bg-[var(--hub-brand)]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-right text-xs font-bold text-[var(--hub-brand)]">{progress}%</p></article>; })}
        {!goals.length && <div className="hub-empty-state lg:col-span-2">Crie sua primeira meta. O Hubora não cria streak apenas por abrir o app.</div>}
      </div>
      <section className="hub-panel p-5"><h2 className="text-lg font-black text-[var(--hub-text-strong)]">Heatmap das últimas 12 semanas</h2><p className="mt-1 text-sm text-[var(--hub-muted)]">Uma visão simples das sessões registradas.</p><div className="mt-5 grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2">{days.map((day) => <div key={day.index} className={`h-4 w-4 rounded-[4px] ${day.active ? 'bg-[var(--hub-brand)]' : 'bg-[var(--hub-surface-3)]'}`} />)}</div></section>
    </div>
  );
}
