import { useState } from 'react';
import { ExternalLink, LoaderCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PdfReaderProps {
  source: string;
  title: string;
  officialUrl?: string;
}

export function PdfReader({ source, title, officialUrl }: PdfReaderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(100);

  // Use Mozilla PDF.js viewer for reliable PDF rendering
  const pdfViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(source)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
            <ZoomOut size={15} />
          </Button>
          <span className="text-xs font-bold text-[var(--hub-muted)] w-12 text-center">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(200, z + 25))}>
            <ZoomIn size={15} />
          </Button>
        </div>
        {officialUrl && (
          <Button variant="outline" size="sm" onClick={() => window.open(officialUrl, '_blank', 'noopener,noreferrer')}>
            <ExternalLink size={15} /> Abrir origem
          </Button>
        )}
      </div>

      {error ? (
        <div className="grid min-h-[50vh] place-items-center rounded-3xl border border-[var(--hub-border)] bg-[var(--hub-surface-1)] p-8 text-center">
          <div>
            <p className="text-lg font-black text-[var(--hub-text-strong)]">PDF não incorporável</p>
            <p className="mt-2 text-sm text-[var(--hub-muted)]">A origem não permite leitura incorporada. Use o botão abaixo para abrir diretamente.</p>
            <Button className="mt-4" onClick={() => window.open(source, '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={16} /> Abrir PDF diretamente
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-[var(--hub-border)] bg-black">
          {loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--hub-surface-1)]">
              <div className="text-center">
                <LoaderCircle className="animate-spin text-[var(--hub-brand)] mx-auto mb-3" size={34} />
                <p className="text-sm font-bold text-[var(--hub-muted)]">Carregando PDF...</p>
              </div>
            </div>
          )}
          <iframe
            src={pdfViewerUrl}
            title={title}
            className="h-[75vh] w-full"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
            referrerPolicy="no-referrer"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      )}
    </div>
  );
}
