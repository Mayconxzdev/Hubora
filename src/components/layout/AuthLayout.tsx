import { ReactNode } from 'react';
import { BookOpen, Clapperboard, Gamepad2, Sparkles, Tv } from 'lucide-react';

const mediaTypes = [
  { icon: Clapperboard, label: 'Filmes' },
  { icon: Tv, label: 'Séries' },
  { icon: BookOpen, label: 'Leituras' },
  { icon: Gamepad2, label: 'Jogos' },
];

export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-var(--hub-header-height)-3rem)] overflow-hidden rounded-[1.7rem] border border-[var(--hub-border)] bg-[var(--hub-surface-1)] shadow-[var(--hub-shadow-lg)] lg:grid-cols-[minmax(0,1.08fr)_minmax(25rem,0.92fr)]">
      <div className="relative hidden overflow-hidden bg-black p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_8%,rgba(217,154,40,0.38),transparent_34%),radial-gradient(circle_at_90%_82%,rgba(229,191,120,0.14),transparent_34%),linear-gradient(145deg,#030303,#11100d_56%,#030303)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="relative">
          <span className="hub-chip border-white/14 bg-white/8 text-white"><Sparkles size={14} className="text-[var(--hub-brand)]" /> Seu universo de entretenimento</span>
          <h2 className="mt-7 max-w-2xl text-5xl font-black leading-[0.94] tracking-[-0.065em] xl:text-6xl">Tudo o que você assiste, lê e joga. Em uma só jornada.</h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/62">Biblioteca, progresso, diário, lançamentos e descobertas com foco no conteúdo — sem menus confusos ou excesso de informação.</p>
        </div>
        <div className="relative grid grid-cols-2 gap-3 xl:grid-cols-4">
          {mediaTypes.map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-[1.15rem] border border-white/10 bg-white/[0.065] p-4 backdrop-blur-xl">
              <Icon size={20} className="text-[var(--hub-brand)]" />
              <p className="mt-3 text-sm font-bold">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center p-5 sm:p-10 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="grid size-11 place-items-center rounded-2xl bg-[var(--hub-brand)] font-black text-[var(--hub-brand-contrast)]">H</div>
              <span className="text-xl font-black tracking-[-0.04em] text-[var(--hub-text-strong)]">Hubora</span>
            </div>
            <h1 className="text-3xl font-black tracking-[-0.05em] text-[var(--hub-text-strong)] sm:text-4xl">{title}</h1>
            <p className="mt-3 leading-relaxed text-[var(--hub-muted)]">{description}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
