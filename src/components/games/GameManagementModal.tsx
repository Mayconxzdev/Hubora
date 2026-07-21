import React, { useState } from 'react';
import { Gamepad2, Check, Clock, ExternalLink, ShieldCheck, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { MediaItem, UserMediaEntry } from '@/types';
import { useStore } from '@/store/useStore';
import { findLibraryEntry } from '@/services/identity';
import { toast } from 'sonner';

interface GameManagementModalProps {
  item: MediaItem;
  isOpen: boolean;
  onClose: () => void;
}

export function GameManagementModal({ item, isOpen, onClose }: GameManagementModalProps) {
  const library = useStore((state) => state.library);
  const addToLibrary = useStore((state) => state.addToLibrary);
  const updateLibraryItem = useStore((state) => state.updateLibraryItem);
  const existingEntry = findLibraryEntry(library, item);

  const [status, setStatus] = useState<UserMediaEntry['status']>(existingEntry?.status || 'planning');
  const [hoursPlayed, setHoursPlayed] = useState<number>(existingEntry?.progress?.hoursPlayed || 0);
  const [completionPercentage, setCompletionPercentage] = useState<number>(existingEntry?.progress?.completionPercentage || 0);
  const [isInstalled, setIsInstalled] = useState<boolean>(existingEntry?.progress?.isInstalled || false);
  const [isOwned, setIsOwned] = useState<boolean>(existingEntry?.progress?.isOwned || false);

  const handleSave = () => {
    const updatedProgress = {
      ...existingEntry?.progress,
      hoursPlayed: Number(hoursPlayed) || 0,
      completionPercentage: Math.min(100, Math.max(0, Number(completionPercentage) || 0)),
      isInstalled,
      isOwned,
    };

    if (existingEntry) {
      updateLibraryItem(existingEntry.id, {
        status,
        progress: updatedProgress,
      });
      toast.success(`Dados do jogo ${item.title} atualizados!`);
    } else {
      addToLibrary(item, status);
      toast.success(`${item.title} adicionado aos seus jogos!`);
    }
    onClose();
  };

  const getSteamUrl = () => {
    if (item.externalIds?.steam) {
      return `https://store.steampowered.com/app/${item.externalIds.steam}`;
    }
    return `https://store.steampowered.com/search/?term=${encodeURIComponent(item.title)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-slate-950 border-white/10 text-white rounded-3xl backdrop-blur-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Gamepad2 size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">{item.title}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Gestão manual de status, progresso e links de loja oficial.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status na Biblioteca */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Status nos seus jogos
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'planning', label: 'Wishlist / Backlog' },
                { id: 'consuming', label: 'Jogando' },
                { id: 'completed', label: 'Concluído' },
                { id: 'paused', label: 'Pausado' },
                { id: 'dropped', label: 'Abandonado' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatus(st.id as UserMediaEntry['status'])}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    status === st.id
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Marcas Manuais */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={isOwned}
                onChange={(e) => setIsOwned(e.target.checked)}
                className="rounded border-white/20 bg-slate-900 text-purple-500 focus:ring-purple-500"
              />
              <ShieldCheck size={16} className={isOwned ? 'text-green-400' : 'text-slate-500'} />
              Possuído na conta
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={isInstalled}
                onChange={(e) => setIsInstalled(e.target.checked)}
                className="rounded border-white/20 bg-slate-900 text-purple-500 focus:ring-purple-500"
              />
              <Gamepad2 size={16} className={isInstalled ? 'text-cyan-400' : 'text-slate-500'} />
              Instalado no PC/Console
            </label>
          </div>

          {/* Horas e Porcentagem */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Horas jogadas
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={hoursPlayed}
                  onChange={(e) => setHoursPlayed(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-purple-500/50"
                  placeholder="0"
                />
                <Clock size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Progresso % (Campanha)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={completionPercentage}
                onChange={(e) => setCompletionPercentage(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-purple-500/50"
                placeholder="0%"
              />
            </div>
          </div>

          {/* Links de Loja Oficial */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Lojas Oficiais (Allowlist HTTPS)
            </label>
            <div className="flex flex-wrap gap-2">
              <a
                href={getSteamUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:border-purple-500/50 hover:text-white transition-colors"
              >
                <span>Steam</span>
                <ExternalLink size={12} className="text-slate-400" />
              </a>
              <a
                href={`https://store.epicgames.com/browse?q=${encodeURIComponent(item.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:border-purple-500/50 hover:text-white transition-colors"
              >
                <span>Epic Games</span>
                <ExternalLink size={12} className="text-slate-400" />
              </a>
              <a
                href={`https://www.gog.com/en/games?query=${encodeURIComponent(item.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 hover:border-purple-500/50 hover:text-white transition-colors"
              >
                <span>GOG</span>
                <ExternalLink size={12} className="text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
