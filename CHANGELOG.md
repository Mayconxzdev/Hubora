# Changelog

## 8.0.0 — 2026-07-20

### Direção e interface
- Home reconstruída para reduzir paralisia de escolha: um hero, uma decisão rápida e uma fileira principal brasileira.
- Navegação reduzida a três áreas no desktop e quatro no Android; oito categorias foram movidas para um seletor contextual.
- Temas refeitos em preto puro e branco puro, superfícies neutras, tipografia mais forte e violeta só nas ações.
- Configurações e fontes avançadas continuam disponíveis, mas não competem mais com o fluxo diário.

### Conteúdo e localização
- Catálogo inicial de filmes e séries misturado para o Brasil e textos revisados em PT-BR.
- Google Books solicita conteúdo em português; atribuição JustWatch exibida quando há provedores TMDB.
- Correção do adaptador de mangás, que usava o formato de anime.
- Correção das respostas de próximos livros e quadrinhos, antes tratadas como objetos em vez de listas.
- Área “Grátis agora” separa fontes abertas/autorizadas de conectores avançados.

### Decisão e desempenho percebido
- “Escolher por mim” reduzido de nove filtros para quatro situações; resultado limita-se a uma escolha e uma alternativa.
- Seções vazias não ocupam a Home e Continuar só aparece quando há progresso real.
- Player HLS permanece carregado sob demanda e o shell principal ficou menor.

### Qualidade e segurança
- 35 testes Vitest, 11 cenários Playwright aprovados e 1 cenário desktop ignorado por não se aplicar.
- Cobertura e2e para temas reais, matriz de rotas, navegação móvel, ausência de overflow e decisão rápida.
- Segredos continuam somente no servidor; credenciais enviadas em conversa não foram reutilizadas no pacote final.

## 7.0.0 — 2026-07-17

### Edição pessoal
- Removidos do fluxo principal comunidade, seguidores, comentários, Modo Duo, perfis públicos, podcasts e gamificação competitiva.
- Tela inicial simplificada em Continuar, Escolha de Hoje, Radar e Lançamentos.
- Insights, Wrapped, metas e grafo mantidos como recursos secundários.

### Conta e sincronização
- Login por Google ou e-mail com Supabase.
- Allowlist local e validação remota pela RPC `is_hubora_allowed_user`.
- Migração `003_hubora_personal_edition.sql` com políticas da edição pessoal.
- Base local-first preservada para uso offline de biblioteca e progresso.

### Radar e descoberta
- Radar organizado por print/imagem, descrição, link e vídeo curto.
- OCR local e consulta especializada ao trace.moe para cenas de anime.
- Resultados em candidatos com evidências, sem prometer identificação universal.

### Conteúdo e fontes
- Área de fontes abertas com Google Books, Open Library, Project Gutenberg e Internet Archive.
- Player para HTTPS/HLS/YouTube/embeds permitidos.
- Leitor para Google Books, EPUB, PDF e HTML quando a origem autoriza acesso e CORS.
- TVmaze adicionado como fallback para séries e episódios.
- Hubora Provider Protocol para provedores autorizados; magnet, torrent e HTTP remoto inseguro são recusados.

### Lançamentos e experiência
- Acompanhamento por obra e Function `refresh-releases` em lotes pequenos.
- Personalização de ordem das categorias sem poluir a navegação principal.
- Modo Maduro e Cofre Adulto mantidos privados por conta e por aparelho.

### Qualidade
- 13 arquivos de teste e 31 testes automatizados aprovados.
- TypeScript aprovado sem erros.
- Pacote distribuído sem `.env`, `node_modules`, `dist` ou chaves privadas.

## 6.0.0 — 2026-07-17

- Privacidade do Cofre e compartilhamentos reforçada.
- PIN migrado para PBKDF2-SHA-256 com salt e bloqueio progressivo.
- Share Target com imagens, backups automáticos e conectores de mídia pessoal.
