import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isToday, isTomorrow, parseISO } from 'date-fns';
import { useStore } from '@/store/useStore';
import { notificationService } from '@/services/notifications';
import type { HuboraNotification } from '@/types';

export function Notifications() {
  const user = useStore((state) => state.user);
  const library = useStore((state) => state.library);
  const [isOpen, setIsOpen] = useState(false);
  const [remote, setRemote] = useState<HuboraNotification[]>([]);

  const refresh = () => { if (user) void notificationService.list().then(setRemote).catch(() => setRemote([])); };
  useEffect(() => { refresh(); if (!user) return; return notificationService.subscribe(user.uid, refresh); }, [user?.uid]);

  const local = useMemo<HuboraNotification[]>(() => {
    const items: HuboraNotification[] = [];
    for (const entry of Object.values(library)) {
      if (!entry.isTrackedRelease) continue;
      const next = entry.media.nextEpisodeToAir;
      if (next?.airDate) {
        try { const date = parseISO(next.airDate); if (isToday(date) || isTomorrow(date)) items.push({ id: `local-${entry.id}-${next.airDate}`, userId: user?.uid || 'local', entryId: entry.id, kind: 'release', title: entry.title, body: `${isToday(date) ? 'Novo episódio hoje' : 'Novo episódio amanhã'}: T${next.seasonNumber} E${next.episodeNumber}`, url: `/details/${entry.media.id}`, payload: {}, createdAt: date.getTime() }); } catch { /* invalid source date */ }
      }
      if (entry.status === 'planning' && entry.media.releaseDate) {
        try { const date = parseISO(entry.media.releaseDate); if (isToday(date)) items.push({ id: `local-release-${entry.id}`, userId: user?.uid || 'local', entryId: entry.id, kind: 'release', title: entry.title, body: 'Lançamento previsto para hoje.', url: `/details/${entry.media.id}`, payload: {}, createdAt: date.getTime() }); } catch { /* invalid source date */ }
      }
    }
    return items;
  }, [library, user?.uid]);

  const notifications = [...remote, ...local.filter((item) => !remote.some((remoteItem) => remoteItem.entryId === item.entryId && remoteItem.body === item.body))].sort((a, b) => b.createdAt - a.createdAt);
  const unread = notifications.filter((item) => !item.readAt).length;
  const openNotification = (item: HuboraNotification) => { setIsOpen(false); if (!item.id.startsWith('local-')) void notificationService.markRead(item.id).then(refresh); };
  const markAll = () => void Promise.all(remote.filter((item) => !item.readAt).map((item) => notificationService.markRead(item.id))).then(refresh);

  return <div className="relative"><button onClick={() => setIsOpen((value) => !value)} className="relative grid h-10 w-10 place-items-center rounded-full text-[var(--hub-muted)] transition hover:bg-[var(--hub-surface-3)] hover:text-[var(--hub-text-strong)]" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ''}`}><Bell size={20}/>{unread > 0 && <span className="absolute right-1 top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--hub-brand)] px-1 text-[0.6rem] font-black text-black">{Math.min(unread, 9)}</span>}</button>{isOpen && <><button className="fixed inset-0 z-40 cursor-default" onClick={() => setIsOpen(false)} aria-label="Fechar notificações"/><div className="absolute right-0 z-50 mt-2 w-[min(90vw,23rem)] overflow-hidden rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)] shadow-2xl"><div className="flex items-center justify-between border-b border-[var(--hub-border)] p-4"><div><h3 className="font-black text-[var(--hub-text-strong)]">Atualizações</h3><p className="text-xs text-[var(--hub-subtle)]">Somente obras que você escolheu acompanhar.</p></div>{remote.some((item) => !item.readAt) && <button onClick={markAll} className="hub-chip"><CheckCheck size={14}/> Ler todas</button>}</div><div className="max-h-[26rem] overflow-y-auto">{notifications.length === 0 ? <div className="p-8 text-center text-sm text-[var(--hub-muted)]">Nenhuma atualização. Ative “Acompanhar esta obra” na biblioteca.</div> : notifications.map((item) => <Link key={item.id} to={item.url || (item.entryId ? `/library` : '/releases')} onClick={() => openNotification(item)} className={`block border-b border-[var(--hub-border)] p-4 transition hover:bg-[var(--hub-surface-2)] ${item.readAt ? 'opacity-65' : ''}`}><p className="font-bold text-[var(--hub-text-strong)]">{item.title}</p><p className="mt-1 text-xs leading-relaxed text-[var(--hub-muted)]">{item.body}</p><time className="mt-2 block text-[0.65rem] text-[var(--hub-subtle)]">{new Date(item.createdAt).toLocaleString('pt-BR')}</time></Link>)}</div></div></>}</div>;
}
