# Hubora 8.0 — relatório da reconstrução

## Resultado

O Hubora agora funciona como um assistente pessoal de cultura pop, não como um painel de catálogo. A regra da interface é: mostrar primeiro o que ajuda a agir e deixar organização avançada para quando for solicitada.

O fluxo diário passou a ser:

1. continuar algo que já está em andamento, quando existir;
2. receber uma escolha rápida quando você não quer pesquisar;
3. descobrir um título em PT-BR;
4. abrir uma fonte autorizada ou marcar na lista.

## Diagnóstico global do projeto recebido

- A navegação expunha muitas áreas com o mesmo peso, incluindo recursos de gestão que raramente ajudam na decisão imediata.
- A Home repetia descoberta, tendências, categorias e biblioteca, criando a mesma paralisia de um catálogo infinito.
- A decisão rápida exigia escolhas demais antes de entregar um resultado.
- O escuro era azul-arroxeado e o claro era acinzentado; a cor da marca aparecia em grandes superfícies.
- Funções pessoais e de catálogo se misturavam: biblioteca, radar, diário, lançamentos, fontes e comunidade competiam pela atenção.
- Havia inconsistências concretas nas fontes: mangás eram adaptados como anime; próximos livros/quadrinhos eram lidos com um formato de resposta incorreto; livros não priorizavam português.
- A disponibilidade brasileira de filmes e séries não estava explícita no início.
- As configurações ficavam inutilizáveis sem login mesmo no modo local de teste.

## O que mudou

### Início

- Um hero substitui o dashboard.
- Sem biblioteca em andamento, a mensagem é “Menos procura. Mais histórias.”
- “Escolher por mim” recebe o mesmo peso de Descobrir.
- “Continuar” só aparece quando existe progresso real.
- Uma única fileira mistura filmes e séries populares para o Brasil.
- “Grátis agora” e “Minha lista” ficam como próximos passos contextuais.
- Lançamentos só ocupam espaço quando a fonte retorna dados.

### Navegação

- Desktop: Início, Descobrir e Minha lista.
- Android: Início, Descobrir, Minha lista e Buscar.
- Filmes, séries, animes, mangás, doramas, livros, quadrinhos e jogos continuam a um toque no seletor de categorias.
- Configurações ficam no rodapé da barra, sem competir com a tarefa principal.

### Design

- Fundo escuro: preto puro (`#000000`).
- Fundo claro: branco puro (`#ffffff`).
- Cartões neutros; imagens das obras fornecem a cor do catálogo.
- Violeta reservado a foco, seleção e chamada principal.
- Remoção do grid decorativo e dos gradientes coloridos de fundo.
- Hierarquia tipográfica e espaços ampliados para leitura rápida.
- Estados vazios curtos e acionáveis.

### Descoberta e decisão

- Três modos com linguagem direta: Buscar, Lembro de uma cena e Quero uma sugestão.
- “Escolher por mim” pergunta apenas a situação: Da minha lista, Continuar, Algo rápido ou Surpreenda-me.
- O resultado evita outra grade: uma escolha principal e, no máximo, uma alternativa.
- Filtros de mangá e quadrinhos foram incluídos e filtros avançados da biblioteca ficam recolhidos.

### Brasil e conteúdo real

- TMDB usa `pt-BR` e região `BR` para filmes, séries e provedores.
- Google Books solicita livros em português; Open Library permanece como fallback.
- Anime e mangá usam Jikan/AniList, com adaptadores separados.
- Jogos usam IGDB pelo backend e fontes públicas/fallbacks existentes.
- “Onde assistir” mostra a atribuição JustWatch exigida pelos dados de provedores do TMDB.
- Google Books Embedded Viewer, arquivos autorizados e fontes abertas podem abrir no leitor interno.
- Jellyfin, Kavita, Komga, OPDS e URLs HTTPS autorizadas continuam disponíveis como fontes pessoais.

## Por que não foram adicionados torrents ou scraping de streaming

O modelo do Stremio foi usado como referência de arquitetura — manifesto, catálogo, metadados, streams e legendas — mas não como autorização para redistribuir obras. O Hubora aceita provedores próprios/autorizados e recusa magnet links, arquivos `.torrent`, HTTP remoto inseguro e scraping de plataformas comerciais.

Isso mantém o projeto publicável no Netlify e evita transformar um hub pessoal em um agregador de cópias sem licença. Quando uma plataforma não permite incorporação, o Hubora abre a origem oficial.

## Fontes oficiais consultadas

- Stremio Addon SDK: https://stremio.github.io/stremio-addon-sdk/
- TMDB — Watch Providers: https://developer.themoviedb.org/reference/movie-watch-providers
- IGDB API: https://api-docs.igdb.com/
- Google Books Embedded Viewer: https://developers.google.com/books/docs/viewer/developers_guide
- Open Library APIs: https://openlibrary.org/developers/api
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- AniList API v2: https://anilist.gitbook.io/anilist-apiv2-docs

## Arquitetura de credenciais

### Públicas no build

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- opções `VITE_` de comportamento da interface

### Somente no servidor/Netlify Functions

- `SUPABASE_SECRET_KEY`
- `TMDB_API_KEY` ou `TMDB_API_READ_TOKEN`
- `IGDB_CLIENT_ID` e `IGDB_CLIENT_SECRET`
- chaves opcionais Google Books e RAWG

Os segredos enviados na conversa devem ser tratados como comprometidos. Eles não foram incorporados ao frontend nem ao pacote final. Revogue-os e cadastre substitutos no painel do Netlify antes do deploy.

## Validação executada

- TypeScript sem erros.
- 14 arquivos e 35 testes Vitest aprovados.
- Build Vite/PWA de produção aprovado.
- 11 cenários Playwright aprovados; 1 cenário específico de Android ignorado no projeto desktop.
- Matriz das áreas principais em desktop e Android.
- Escuro verificado como `rgb(0, 0, 0)` e claro como `rgb(255, 255, 255)`.
- Menu Android com quatro destinos e sem overflow horizontal da página.
- Inspeção visual de Home escura, Home clara, Descobrir e Home no perfil Pixel 7.

O aviso de tamanho do `hls.js` é não bloqueante: o player HLS está separado e só é carregado quando usado.

## Antes de publicar

1. Rotacione Supabase secret, TMDB e IGDB/Twitch.
2. Configure as novas credenciais no painel do Netlify conforme `NETLIFY_DEPLOY.md`.
3. Execute as três migrations no Supabase.
4. Inclua somente seu e-mail em `private.allowed_emails`.
5. Cadastre a URL final nos redirects do Supabase/Google OAuth.
6. Faça o primeiro login e valide a sincronização PC ↔ Android.
