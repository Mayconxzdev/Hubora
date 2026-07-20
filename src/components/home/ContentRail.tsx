import { useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MediaItem } from '@/types';
import { MediaCard } from '@/components/ui/MediaCard';
import { Button } from '@/components/ui/Button';

interface ContentRailProps {
  title: string;
  eyebrow?: string;
  description?: string;
  icon?: LucideIcon;
  items?: MediaItem[];
  loading?: boolean;
  href?: string;
  emptyText?: string;
  aspect?: 'poster' | 'video';
}

export function ContentRail({ title, eyebrow, description, icon: Icon, items = [], loading = false, href, emptyText = 'Nada disponível agora.', aspect = 'poster' }: ContentRailProps) {
  const navigate = useNavigate();
  const railRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: -1 | 1) => {
    railRef.current?.scrollBy({ left: direction * Math.max(420, railRef.current.clientWidth * 0.72), behavior: 'smooth' });
  };

  return (
    <section className="hub-section">
      <div className="hub-section-heading">
        <div className="min-w-0">
          {eyebrow && <div className="hub-section-eyebrow">{Icon && <Icon size={14} />}{eyebrow}</div>}
          <h2 className="hub-section-title">{title}</h2>
          {description && <p className="hub-section-description">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            <button className="hub-icon-button h-10 w-10" onClick={() => scroll(-1)} aria-label={`Voltar em ${title}`}><ChevronLeft size={18} /></button>
            <button className="hub-icon-button h-10 w-10" onClick={() => scroll(1)} aria-label={`Avançar em ${title}`}><ChevronRight size={18} /></button>
          </div>
          {href && <Button variant="ghost" size="sm" onClick={() => navigate(href)}>Ver tudo <ArrowRight size={15} /></Button>}
        </div>
      </div>

      {loading ? (
        <div className="hub-scroll-rail scrollbar-hide" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, index) => <div className="hub-scroll-item" key={index}><MediaCard isLoading aspect={aspect} /></div>)}
        </div>
      ) : items.length ? (
        <div ref={railRef} className="hub-scroll-rail scrollbar-hide" tabIndex={0} aria-label={title}>
          {items.slice(0, 14).map((item, index) => <div className="hub-scroll-item" key={`${item.mediaType}-${item.id}-${index}`}><MediaCard item={item} aspect={aspect} priority={index < 4} /></div>)}
        </div>
      ) : (
        <div className="hub-empty-state"><p>{emptyText}</p></div>
      )}
    </section>
  );
}
