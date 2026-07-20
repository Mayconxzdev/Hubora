import { useEffect, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import type { MediaVideo, MediaVideoKind } from '@/types';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: MediaVideo[];
}

const KIND_LABELS: Record<MediaVideoKind, string> = {
  trailer: 'Trailer', teaser: 'Teaser', clip: 'Clipe', featurette: 'Bastidores',
  opening: 'Abertura', ending: 'Encerramento', gameplay: 'Gameplay', other: 'Vídeo',
};

export function TrailerModal({ isOpen, onClose, videos }: TrailerModalProps) {
  const [activeId, setActiveId] = useState(videos[0]?.id || '');
  const active = videos.find((video) => video.id === activeId) || videos[0];

  useEffect(() => {
    if (isOpen) setActiveId(videos[0]?.id || '');
  }, [isOpen, videos]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(calc(100vw-1rem),76rem)] max-w-none overflow-hidden bg-black p-0 sm:rounded-[1.8rem]">
        <DialogHeader className="border-white/10 bg-black/90 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
              <PlayCircle size={20} aria-hidden="true" />
            </span>
            <div>
              <DialogTitle className="text-white">Vídeos da obra</DialogTitle>
              <DialogDescription className="text-white/60">{videos.length} {videos.length === 1 ? 'vídeo fornecido' : 'vídeos fornecidos'} pela origem</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {videos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b border-white/10 bg-black px-4 py-3 sm:px-6" aria-label="Selecionar vídeo">
            {videos.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => setActiveId(video.id)}
                className={`min-w-48 rounded-xl border px-3 py-2 text-left transition ${video.id === active?.id ? 'border-[var(--hub-brand)] bg-[var(--hub-brand-soft)] text-white' : 'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:text-white'}`}
                aria-pressed={video.id === active?.id}
              >
                <span className="block text-[0.65rem] font-black uppercase tracking-[0.12em] text-[var(--hub-brand)]">{KIND_LABELS[video.kind]}{video.language ? ` • ${video.language.toUpperCase()}` : ''}</span>
                <span className="mt-1 block truncate text-sm font-bold">{video.name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="aspect-video w-full bg-black">
          {active ? (
            <iframe
              key={active.id}
              src={`${active.embedUrl}?autoplay=1&rel=0`}
              title={active.name}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : <div className="grid h-full place-items-center text-sm font-bold text-white/55">Nenhum vídeo incorporável informado.</div>}
        </div>
        {active && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black px-4 py-3 text-xs text-white/55 sm:px-6"><span>{KIND_LABELS[active.kind]} • {active.provider}{active.official ? ' • oficial' : ''}</span><strong className="text-white/80">{active.name}</strong></div>}
      </DialogContent>
    </Dialog>
  );
}
