import { Info, ShieldCheck, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { MediaItem } from '@/types';
import { normalizeText } from '@/services/identity';

export function DetailsInsight({ item }: { item: MediaItem }) {
  const { user, library } = useStore();
  const itemText = normalizeText([item.title, item.overview, ...(item.genres || [])].filter(Boolean).join(' '));
  const favoriteGenres = user?.preferences.favoriteGenres || [];
  const dislikedGenres = user?.preferences.dislikedGenres || [];
  const matches = favoriteGenres.filter((genre) => itemText.includes(normalizeText(genre)));
  const conflicts = dislikedGenres.filter((genre) => itemText.includes(normalizeText(genre)));
  const similarFavorite = Object.values(library).find((entry) =>
    (entry.isFavorite || (entry.rating || 0) >= 8) &&
    entry.media.genres?.some((genre) => item.genres?.some((candidate) => normalizeText(candidate) === normalizeText(genre))),
  );

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 p-5 rounded-2xl flex items-start gap-4">
      <Sparkles className="text-purple-400 flex-shrink-0 mt-1" size={24} />
      <div className="flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-bold text-purple-300 uppercase tracking-widest">Compatibilidade explicável</h4>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-1"><ShieldCheck size={12} /> sem IA</span>
        </div>
        <p className="text-slate-200 leading-relaxed font-medium">
          {matches.length
            ? `Esta obra combina com seus interesses em ${matches.join(', ')}.`
            : 'Ainda não há preferências suficientes para afirmar uma correspondência forte.'}
          {similarFavorite ? ` Ela compartilha gêneros com “${similarFavorite.title}”, que você marcou positivamente.` : ''}
          {conflicts.length ? ` Atenção: também contém ${conflicts.join(', ')}, que aparecem entre os gêneros que você evita.` : ''}
        </p>
        <p className="text-xs text-slate-400 flex gap-2"><Info size={14} className="mt-0.5 flex-shrink-0" /> O veredito usa apenas suas preferências e metadados visíveis do catálogo.</p>
      </div>
    </div>
  );
}
