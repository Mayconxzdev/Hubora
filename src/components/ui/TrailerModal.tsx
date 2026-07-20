import { PlayCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailerUrl: string | null;
}

export function TrailerModal({ isOpen, onClose, trailerUrl }: TrailerModalProps) {
  const autoplayUrl = trailerUrl
    ? `${trailerUrl}${trailerUrl.includes('?') ? '&' : '?'}autoplay=1`
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(calc(100vw-1rem),76rem)] max-w-none overflow-hidden bg-black p-0 sm:rounded-[1.8rem]">
        <DialogHeader className="border-white/10 bg-black/90 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
              <PlayCircle size={20} aria-hidden="true" />
            </span>
            <div>
              <DialogTitle className="text-white">Trailer</DialogTitle>
              <DialogDescription className="text-white/60">Reprodução em tela ampla</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="aspect-video w-full bg-black">
          {autoplayUrl ? (
            <iframe
              src={autoplayUrl}
              title="Trailer"
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
