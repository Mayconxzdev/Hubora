import { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock3, Edit2, Heart, Library, Save, Settings, User, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SEO } from '@/components/ui/SEO';

export function Profile() {
  const { user, getLibraryItems, updateUser } = useStore();
  const library = getLibraryItems();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');

  const stats = useMemo(() => {
    const completed = library.filter((entry) => entry.status === 'completed').length;
    const consuming = library.filter((entry) => entry.status === 'consuming').length;
    const favorites = library.filter((entry) => entry.isFavorite).length;
    const minutes = library.reduce((total, entry) => {
      if (entry.mediaType === 'movie' && (entry.status === 'completed' || entry.progress.watched)) return total + (entry.media.runtime || 120);
      if (entry.mediaType === 'tv') return total + (entry.progress.currentEpisode || 0) * 45;
      if (entry.mediaType === 'anime') return total + (entry.progress.currentEpisode || 0) * 23;
      if (entry.mediaType === 'game') return total + (entry.progress.hoursPlayed || 0) * 60;
      return total;
    }, 0);
    const genres = library.flatMap((entry) => entry.media.genres || []).reduce<Record<string, number>>((acc, genre) => { acc[genre] = (acc[genre] || 0) + 1; return acc; }, {});
    return { completed, consuming, favorites, hours: Math.round(minutes / 60), topGenres: Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 5) };
  }, [library]);

  if (!user) return <div className="hub-page"><SEO title="Minha conta"/><div className="hub-empty-state"><User size={34}/><p>Entre na sua conta para acessar a sincronização pessoal.</p><Link to="/login"><Button className="mt-4">Entrar</Button></Link></div></div>;

  const save = () => {
    const next = name.trim();
    if (!next) return;
    updateUser({ name: next }); setEditing(false); toast.success('Conta atualizada.');
  };

  return <div className="hub-page mx-auto max-w-5xl">
    <SEO title="Minha conta" description="Conta, sincronização e resumo pessoal do Hubora." />
    <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><User size={14}/> Conta privada</div><h1 className="hub-page-title">Minha conta</h1><p className="hub-page-subtitle">Seu perfil serve apenas para sincronizar a biblioteca entre PC e Android. Não existe perfil público.</p></div><Link to="/settings"><Button variant="outline"><Settings size={17}/> Configurações</Button></Link></header>

    <section className="hub-panel p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--hub-border)] bg-[var(--hub-surface-3)]">{user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover"/> : <User size={38}/>}</div><div className="min-w-0 flex-1">{editing ? <div className="flex max-w-lg gap-2"><Input value={name} onChange={(event) => setName(event.target.value)} autoFocus/><Button onClick={save}><Save size={16}/> Salvar</Button><Button variant="ghost" onClick={() => { setEditing(false); setName(user.name); }}><X size={16}/></Button></div> : <><h2 className="truncate text-2xl font-black text-[var(--hub-text-strong)]">{user.name}</h2><p className="mt-1 text-sm text-[var(--hub-muted)]">{user.email}</p><Button size="sm" variant="ghost" className="mt-3" onClick={() => setEditing(true)}><Edit2 size={15}/> Alterar nome</Button></>}</div></div></section>

    <section className="hub-section"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{([
      ['Biblioteca', library.length, Library], ['Em andamento', stats.consuming, Clock3], ['Concluídos', stats.completed, CheckCircle2], ['Favoritos', stats.favorites, Heart], ['Horas estimadas', stats.hours, BarChart3],
    ] as Array<[string, number, typeof Library]>).map(([label, value, Icon]) => <article key={String(label)} className="hub-panel p-5"><Icon className="text-[var(--hub-brand)]" size={20}/><strong className="mt-4 block text-3xl font-black text-[var(--hub-text-strong)]">{String(value)}</strong><span className="text-xs font-bold uppercase tracking-wider text-[var(--hub-subtle)]">{String(label)}</span></article>)}</div></section>

    <section className="hub-section"><div className="hub-section-heading"><div><div className="hub-section-eyebrow">Seu uso real</div><h2 className="hub-section-title">Gêneros mais presentes</h2></div><Link to="/insights"><Button variant="ghost">Abrir Insights</Button></Link></div>{stats.topGenres.length ? <div className="flex flex-wrap gap-2">{stats.topGenres.map(([genre, count]) => <span key={genre} className="hub-chip">{genre} • {count}</span>)}</div> : <div className="hub-empty-state">Adicione obras para formar seu perfil de gosto.</div>}</section>
  </div>;
}
