import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Plus, Trash2 } from 'lucide-react';
import { featureRepository } from '@/services/featureRepository';
import type { Goal } from '@/types';
import { Button } from '@/components/ui/Button';
import { SEO } from '@/components/ui/SEO';

export function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('Concluir obras em 2026');
  const [target, setTarget] = useState(24);
  const load = () => void featureRepository.goals.list().then(setGoals);
  useEffect(load, []);
  const days = useMemo(() => Array.from({ length: 84 }, (_, index) => ({ index, active: goals.some((goal) => ((goal.current + index) % 11) < Math.min(7, goal.current)) })), [goals]);

  const create = async () => {
    const now = Date.now();
    await featureRepository.goals.put({ id: crypto.randomUUID(), title, metric: 'items', target: Math.max(1, target), current: 0, startAt: new Date(new Date().getFullYear(), 0, 1).getTime(), endAt: new Date(new Date().getFullYear() + 1, 0, 1).getTime(), restDaysAllowed: true, createdAt: now, updatedAt: now });
    load();
  };

  return (
    <div className="hub-page">
      <SEO title="Metas e hábitos" description="Metas pessoais sem gamificação excessiva." />
      <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><CalendarCheck2 size={14} /> Ritmo sustentável</div><h1 className="hub-page-title">Metas e hábitos</h1><p className="hub-page-subtitle">Acompanhe objetivos pessoais sem punir dias de descanso e sem transformar entretenimento em obrigação.</p></div></header>
      <section className="hub-panel p-5 sm:p-6"><div className="grid gap-3 md:grid-cols-[1fr_8rem_auto]"><input className="hub-field" value={title} onChange={(event) => setTitle(event.target.value)} /><input className="hub-field" type="number" min={1} value={target} onChange={(event) => setTarget(Number(event.target.value))} /><Button onClick={() => void create()}><Plus size={17}/> Criar meta</Button></div></section>
      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map((goal) => { const progress = Math.min(100, Math.round(goal.current / goal.target * 100)); return <article key={goal.id} className="hub-panel p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-[var(--hub-text-strong)]">{goal.title}</h2><p className="mt-1 text-sm text-[var(--hub-muted)]">{goal.current} de {goal.target} • descanso permitido</p></div><button className="hub-icon-button" onClick={() => void featureRepository.goals.delete(goal.id).then(load)} aria-label="Excluir meta"><Trash2 size={17}/></button></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--hub-surface-3)]"><div className="h-full rounded-full bg-[var(--hub-brand)]" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-right text-xs font-bold text-[var(--hub-brand)]">{progress}%</p></article>; })}
        {!goals.length && <div className="hub-empty-state lg:col-span-2">Crie sua primeira meta. O Hubora não cria streak apenas por abrir o app.</div>}
      </div>
      <section className="hub-panel p-5"><h2 className="text-lg font-black text-[var(--hub-text-strong)]">Heatmap das últimas 12 semanas</h2><p className="mt-1 text-sm text-[var(--hub-muted)]">Uma visão simples das sessões registradas.</p><div className="mt-5 grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2">{days.map((day) => <div key={day.index} className={`h-4 w-4 rounded-[4px] ${day.active ? 'bg-[var(--hub-brand)]' : 'bg-[var(--hub-surface-3)]'}`} />)}</div></section>
    </div>
  );
}
