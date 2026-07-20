import { MediaItem } from '@/types';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Check, Plus, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { getMediaI18n } from '@/lib/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useStore } from '@/store/useStore';
import { findLibraryEntry } from '@/services/identity';
import { LibraryStatusModal } from '@/components/library/LibraryStatusModal';
import { useState } from 'react';

interface HeroProps {
  item: MediaItem;
}

const TYPE_LABELS: Record<MediaItem['mediaType'], string> = {
  movie: 'Filme', tv: 'Série', anime: 'Anime', manga: 'Mangá', comic: 'Quadrinho', book: 'Livro', novel: 'Novel', game: 'Jogo',
};

export function Hero({ item }: HeroProps) {
  const { t } = useTranslation();
  const i18n = getMediaI18n(t);
  const library = useStore((state) => state.library);
  const reduceMotion = useReducedMotion();
  const [modalOpen, setModalOpen] = useState(false);
  const entry = findLibraryEntry(library, item);

  if (!item) return null;

  const year = item.releaseDate?.slice(0, 4);
  const rating = item.voteAverage && item.voteAverage > 0 ? item.voteAverage.toFixed(1) : null;

  return (
    <section className="hub-hero group" aria-label={`Destaque: ${i18n.displayTitle(item)}`}>
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={reduceMotion ? undefined : { scale: 1.025 }}
        transition={{ duration: 12, ease: 'linear' }}
      >
        <OptimizedImage
          src={item.backdropPath || item.posterPath || '/icons/hubora-512.png'}
          alt=""
          className="h-full w-full"
        />
      </motion.div>

      <motion.div
        className="hub-hero-content"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="hub-hero-kicker">
          <span>{TYPE_LABELS[item.mediaType]}</span>
          {year && <><span aria-hidden="true">•</span><span>{year}</span></>}
          {rating && <><span aria-hidden="true">•</span><span className="inline-flex items-center gap-1"><Star size={13} className="fill-[var(--hub-brand)] text-[var(--hub-brand)]" /> {rating}</span></>}
        </div>

        <h1 className="hub-hero-title">{i18n.displayTitle(item)}</h1>
        <p className="hub-hero-description">{i18n.displayOverview(item) || 'Descubra, organize e acompanhe esta obra no seu universo pessoal de entretenimento.'}</p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link to={`/details/${item.id}`}>
            <Button size="lg" className="bg-white text-black shadow-[0_14px_34px_rgba(0,0,0,0.32)] hover:bg-white/90">
              Ver detalhes <ArrowRight size={18} />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="border-white/18 bg-black/34 text-white backdrop-blur-xl hover:bg-white/12 hover:text-white" onClick={() => setModalOpen(true)}>
            {entry ? <Check size={18} /> : <Plus size={18} />} {entry ? 'Na biblioteca' : 'Minha lista'}
          </Button>
        </div>
      </motion.div>

      <LibraryStatusModal item={item} isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
