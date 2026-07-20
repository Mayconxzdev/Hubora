import { Database, EyeOff, FileDown, HardDrive, LockKeyhole, ShieldCheck } from 'lucide-react';
import { SEO } from '@/components/ui/SEO';

const sections = [
  { icon: HardDrive, title: 'Dados locais', body: 'A biblioteca, preferências, cache e fila de sincronização são mantidos no IndexedDB do aparelho para que o núcleo continue funcionando sem internet. Backups JSON podem ser gerados nas Configurações.' },
  { icon: Database, title: 'Sincronização opcional', body: 'Quando o Supabase está configurado e você entra com Google ou e-mail, biblioteca, progresso, listas, eventos e preferências são sincronizados com sua conta. As políticas RLS limitam cada registro ao respectivo usuário.' },
  { icon: EyeOff, title: 'Modo Maduro e Cofre', body: 'O Cofre Adulto é ativado separadamente em cada aparelho. Itens são privados por padrão, screenshots adultos não são enviados à nuvem e conteúdo do Cofre não entra em cartões compartilháveis.' },
  { icon: LockKeyhole, title: 'Servidores pessoais', body: 'Credenciais de Jellyfin, Komga, Kavita, Audiobookshelf e OPDS são cifradas antes de serem persistidas localmente. Os arquivos permanecem no servidor de origem; o Netlify não recebe sua coleção.' },
  { icon: FileDown, title: 'Controle e portabilidade', body: 'Você pode exportar o banco pessoal, restaurar um backup, limpar dados locais e excluir dados sincronizados. O Hubora não vende informações pessoais e não contém perfil público ou comunidade.' },
];

export function Privacy() {
  return <div className="hub-page mx-auto max-w-4xl">
    <SEO title="Privacidade" description="Como o Hubora Personal armazena e sincroniza seus dados." />
    <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><ShieldCheck size={14}/> Privacidade por padrão</div><h1 className="hub-page-title">Seus dados continuam seus</h1><p className="hub-page-subtitle">O Hubora é local-first, não possui perfil público e sincroniza somente quando uma conta Supabase está configurada.</p></div></header>
    <div className="space-y-3">{sections.map(({ icon: Icon, title, body }) => <section key={title} className="hub-panel flex gap-4 p-5 sm:p-6"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--hub-brand-soft)] text-[var(--hub-brand)]"><Icon size={21}/></div><div><h2 className="font-black text-[var(--hub-text-strong)]">{title}</h2><p className="mt-2 text-sm leading-7 text-[var(--hub-muted)]">{body}</p></div></section>)}</div>
    <p className="mt-6 text-xs text-[var(--hub-subtle)]">Última atualização: 17 de julho de 2026.</p>
  </div>;
}
