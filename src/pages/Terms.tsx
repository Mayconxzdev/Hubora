import { ExternalLink, FileCheck2, Scale, Server, TriangleAlert } from 'lucide-react';
import { SEO } from '@/components/ui/SEO';

const sections = [
  { icon: FileCheck2, title: 'Finalidade pessoal', body: 'O Hubora organiza metadados, progresso e preferências. Ele não concede direitos sobre filmes, séries, livros, mangás, quadrinhos, jogos ou arquivos de terceiros.' },
  { icon: Server, title: 'Conteúdo e integrações', body: 'Reprodução e leitura internas dependem de URLs HTTPS autorizadas, previews incorporáveis, itens gratuitos ou arquivos de servidores pessoais aos quais você possui acesso. A origem continua responsável pela disponibilidade e pelas permissões.' },
  { icon: TriangleAlert, title: 'Limites técnicos', body: 'APIs podem ficar indisponíveis, alterar resultados ou impor limites. Reconhecimento por print e descrição apresenta candidatos e confiança, não garantia universal. O Hubora preserva o núcleo local quando uma fonte externa falha.' },
  { icon: Scale, title: 'Uso responsável', body: 'Provedores com magnet, torrent, DRM contornado, HTTP inseguro ou distribuição não autorizada são recusados. Use somente conteúdos e servidores que você tenha permissão para acessar.' },
];

export function Terms() {
  return <div className="hub-page mx-auto max-w-4xl">
    <SEO title="Uso responsável" description="Condições e limites da edição pessoal do Hubora." />
    <header className="hub-page-header items-start"><div><div className="hub-section-eyebrow"><Scale size={14}/> Uso responsável</div><h1 className="hub-page-title">O que o Hubora faz — e o que não faz</h1><p className="hub-page-subtitle">Uma central pessoal de descoberta e acompanhamento, não um hospedeiro de catálogos comerciais.</p></div></header>
    <div className="space-y-3">{sections.map(({ icon: Icon, title, body }) => <section key={title} className="hub-panel flex gap-4 p-5 sm:p-6"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--hub-brand-soft)] text-[var(--hub-brand)]"><Icon size={21}/></div><div><h2 className="font-black text-[var(--hub-text-strong)]">{title}</h2><p className="mt-2 text-sm leading-7 text-[var(--hub-muted)]">{body}</p></div></section>)}</div>
    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--hub-border)] bg-[var(--hub-surface-2)] p-4 text-xs leading-6 text-[var(--hub-muted)]"><ExternalLink className="mt-0.5 shrink-0 text-[var(--hub-brand)]" size={17}/><p>Ao abrir uma fonte externa, aplicam-se os termos, a região e as regras daquela plataforma. O Hubora exibe a origem sempre que possível.</p></div>
    <p className="mt-6 text-xs text-[var(--hub-subtle)]">Última atualização: 17 de julho de 2026.</p>
  </div>;
}
