# Hubora — contrato do produto

## Identidade

O Hubora é um hub pessoal brasileiro de cultura pop para descobrir, entender, organizar, acompanhar, ler e assistir obras usando catálogos e fontes autorizadas. Ele reúne nove categorias oficiais — Filmes, Séries, Doramas, Animes, Mangás, Quadrinhos, Livros, Novels e Jogos — e trata o Cofre Adulto como uma camada transversal de privacidade, nunca como uma décima categoria.

O produto é uma aplicação web instalável (PWA), responsiva e orientada primeiro ao uso real do proprietário. O endereço publicado não é promovido como serviço público, mas funciona como convite compartilhável: qualquer pessoa que possua o link pode usar o Hubora como convidado, criar uma conta ou entrar com Google. Repassar o link concede a mesma possibilidade de uso.

## Público e modos de uso

### Proprietário

Usa todo o produto, configura provedores e preferências, acompanha a própria biblioteca e valida a versão implantada. Não existe um privilégio implícito sobre dados de outras contas.

### Visitante

Entra sem cadastro. Biblioteca, preferências, histórico e progresso permanecem no navegador desse aparelho. Visitante não recebe sincronização entre aparelhos e deve ser avisado antes de limpar dados, trocar de navegador ou restaurar o dispositivo.

### Pessoa com conta

Cria conta por e-mail/senha ou autentica com Google quando o provedor estiver configurado. Seus dados são sincronizados pelo Supabase e isolados por `auth.uid()` através de RLS. Uma conta nunca pode ler ou alterar biblioteca, perfil, histórico, listas, metas ou notificações de outra.

## Modelo de acesso

- O link é um mecanismo de distribuição, não uma fronteira de segurança.
- A aplicação abre sem autenticação obrigatória.
- Cadastro público e modo convidado permanecem habilitados no deploy oficial.
- Google OAuth é apresentado como disponível somente quando configurado e comprovado no projeto Supabase.
- A allowlist histórica não bloqueia usuários comuns. Ela pode permanecer como mecanismo administrativo restrito ao `service_role` e para provisionamento E2E.
- Não existe descoberta pública de perfis, feed social ou compartilhamento automático de dados pessoais.
- Segredos, tokens, cookies e chaves administrativas nunca entram no bundle, em URLs, relatórios ou commits.

## Trabalho principal do usuário

1. Abrir o Hubora e decidir o que quer fazer agora: continuar, escolher algo curto, descobrir ou receber uma surpresa.
2. Navegar pelas nove categorias, pesquisar uma obra e compreender seus metadados e disponibilidade.
3. Abrir uma fonte autorizada interna ou externa com explicação honesta sobre formato, território, assinatura e limitações.
4. Adicionar a obra à biblioteca, definir estado, avaliação e progresso.
5. Retomar leitura, reprodução ou jogo e preservar progresso localmente ou na conta.
6. Consultar diário, lançamentos, metas, conexões, Wrapped, guia de franquias e recomendações sem expor itens do Cofre.

## Capacidades essenciais

- Busca global e busca por categoria com filtros, ordenação, paginação ou carregamento incremental.
- Detalhes canônicos com sinopse, datas, gêneros, pessoas/estúdios/editoras, temporadas, capítulos, volumes, plataformas, vídeos e disponibilidade conforme o domínio.
- Player seguro para URLs e formatos explicitamente permitidos, incluindo YouTube autorizado e HLS quando disponível.
- Leitores para Google Books, EPUB, PDF, MangaDex e outras fontes que realmente autorizem acesso.
- Biblioteca, listas, avaliação, progresso, diário, metas, lançamentos, notificações, Wrapped e conexões.
- Descobrir, Quick Pick, Vibe Search, Scene Search e Radar por texto, URL, imagem/OCR e vídeo quando a integração estiver habilitada.
- Fontes e provedores com capacidade, modo de acesso, autenticação necessária, saúde e última verificação descritos sem fingir integração.
- Temas claro e escuro, PT-BR e inglês, exportação/importação, backup local, PWA e funcionamento offline compatível com a fonte.

## Integridade e legalidade

- Catálogo, imagem, classificação, vídeo e disponibilidade vêm de dados reais ou de um estado vazio/fallback identificado.
- Filmes comerciais sem reprodução incorporável abrem o destino autorizado; o Hubora nunca simula que reproduziu uma obra.
- Hosts de streaming aprovados permanecem numa allowlist HTTPS exata, com sandbox e CSP coerentes. Adicionar hosts exige revisão de segurança e teste real; o redesign não remove hosts válidos apenas por estética.
- Não contornar DRM, assinatura, autenticação, bloqueio regional, anti-bot ou requisitos do provedor.
- Nenhuma compra, instalação de executável ou login automático em loja é realizado.
- Conteúdo adulto só entra no Cofre quando a fonte/modelo o classifica como adulto. Evidências gráficas permanecem desfocadas, redigidas ou não armazenadas.

## Personalidade

O Hubora é cinematográfico, preciso, reservado e útil. Ele se comporta como uma cabine pessoal de curadoria: o conteúdo tem protagonismo; a interface organiza decisões e desaparece durante leitura ou reprodução. A voz é direta, brasileira e honesta sobre o que está disponível.

## Anti-referências

- Não parecer landing page SaaS, painel administrativo genérico ou streaming fictício.
- Não usar gradiente violeta como decoração universal, glassmorphism em toda superfície, brilho neon ou sombras pesadas.
- Não transformar cada informação em card, badge ou modal.
- Não usar dados, capas, títulos, progresso, avaliações ou provedores fictícios do protótipo visual.
- Não esconder erro externo, indisponibilidade, assinatura ou falta de integração atrás de um `PASS` visual.
- Não reduzir as nove categorias nem apresentar o Cofre como categoria de catálogo.

## Plataforma

- `web`: React 19, TypeScript, Vite e Netlify.
- PWA responsiva para desktop, tablet e celular.
- Supabase opcional para autenticação e sincronização.
- Dados locais continuam úteis sem conta e, dentro dos limites do cache e das fontes, sem rede.

## Critério de conclusão

Uma função só está pronta quando existe implementação real, teste proporcional ao risco, execução reproduzível e evidência do efeito esperado. Presença de botão, iframe, card, status HTTP ou página sem exceção não comprova funcionamento. A release só recebe `VERIFIED RELEASE` quando todos os cenários obrigatórios locais e publicados estiverem em `PASS`; bloqueios externos ou de configuração permanecem declarados.
