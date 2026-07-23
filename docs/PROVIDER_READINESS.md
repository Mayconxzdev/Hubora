# Matriz de prontidão dos provedores

A relação única e linha a linha das **88 fontes** está em `docs/PROVIDER_MATRIX.md` e `docs/PROVIDER_MATRIX.csv`. Este documento explica os estados e destaca os grupos operacionais.

Esta matriz separa **integração executável** de **fonte apenas catalogada**. O nome de uma fonte no diretório não significa que ela forneça busca, acesso ou reprodução dentro do Hubora.

## Estados usados

- **Implementado no código:** existe fluxo executável, validação e tratamento básico de erro. Ainda precisa de teste real após o deploy.
- **Configurável pelo usuário:** o conector existe, mas depende de servidor, token ou catálogo do próprio usuário.
- **Página externa:** o Hubora apenas encaminha para a origem oficial.
- **Diretório:** fonte pesquisada e documentada, sem adaptador operacional nesta versão.

## Integrações executáveis

| Provedor | Uso atual | Variável/configuração | Acesso interno permitido |
| --- | --- | --- | --- |
| TMDB | Filmes, séries, doramas, imagens, vídeos e disponibilidade comercial | `TMDB_API_KEY` ou `TMDB_API_READ_TOKEN` | Metadados e trailers oficiais; serviços comerciais abrem externamente |
| Jikan / MyAnimeList | Anime e mangá: busca e detalhes | Nenhuma | Metadados e trailers quando informados pela origem |
| AniList | Anime/mangá: busca, detalhes e identidade externa | Nenhuma | Metadados; não fornece episódios ou capítulos completos |
| Google Books | Livros, novels e quadrinhos: busca, detalhes, preview e arquivos declarados | `GOOGLE_BOOKS_API_KEY` | Somente preview incorporável ou EPUB/PDF realmente declarados em `accessInfo` |
| Open Library | Livros, edições e identidade | Nenhuma | Internet Archive somente quando `public_scan_b` comprova digitalização pública; empréstimos abrem externamente |
| Project Gutenberg | Busca OPDS e arquivos de domínio público | Nenhuma | EPUB/PDF/HTML/TXT disponibilizados pela própria origem |
| Internet Archive | Filmes e livros abertos | Nenhuma | Embed somente com evidência explícita de licença aberta; caso contrário, página externa |
| MangaDex | Busca, resolução de UUID, detalhes e capítulos públicos | Nenhuma | Capítulos disponibilizados pela API, sujeitos a idioma, regras e disponibilidade |
| IGDB | Jogos, plataformas, empresas e detalhes | `IGDB_CLIENT_ID` + `IGDB_CLIENT_SECRET` | Metadados; jogos abrem loja/launcher ou página oficial |
| FreeToGame | Fallback de jogos gratuitos | Nenhuma | Metadados e página oficial; não transforma o jogo em arquivo hospedado pelo Hubora |
| CheapShark | Busca de lojas/preços de jogos | Nenhuma | Links externos de lojas |
| Steam Store | Busca e detalhes públicos de loja | Nenhuma | Página/launcher externo |
| RAWG | Fallback complementar de jogos | `RAWG_API_KEY` opcional | Metadados; exige atribuição conforme o plano usado |
| trace.moe | Identificação de frame de anime | Nenhuma | Identificação; não fornece o episódio completo |
| TVmaze | Complemento de séries e episódios | Nenhuma | Metadados |
| YouTube | Trailers e vídeos oficiais incorporáveis | Nenhuma chave nesta implementação | Apenas IDs de vídeo retornados por provedores e autorizados a incorporar |

## Integrações pessoais configuráveis dentro do Hubora

Estas credenciais não devem ficar no Netlify. Elas são cadastradas em **Configurações → Integrações** e permanecem associadas à instalação do usuário.

| Integração | O que faz | Requisito |
| --- | --- | --- |
| Jellyfin | Navega pela biblioteca pessoal e abre mídia no servidor | URL HTTPS, CORS e token Jellyfin |
| Komga | Navega por mangás/quadrinhos pessoais | URL HTTPS, CORS e API key |
| Kavita | Navega por livros, mangás e quadrinhos pessoais | URL HTTPS, CORS e API key |
| OPDS | Lê catálogos pessoais ou autorizados | URL OPDS e autenticação quando necessária |
| Manifesto Hubora | Instala adaptador compatível com `hubora-provider/v1` | Manifesto HTTPS confiável |
| Manifesto Stremio | Pesquisa catálogos compatíveis | Manifesto HTTPS; streams continuam sujeitos à política de origem e direitos |

## Fontes que permanecem apenas como diretório ou página externa

A maior parte das fontes comerciais e comunitárias listadas em `src/data/providerCatalog.ts` ainda está em um destes estados. Exemplos: Netflix, Prime Video, Disney+, Max, Globoplay, Crunchyroll, Viki, WEBTOON, MANGA Plus, Kindle e lojas de jogos.

Elas não possuem uma API pública que entregue o catálogo completo para reprodução/leitura incorporada. O Hubora pode mostrar disponibilidade comprovada e abrir a página oficial, mas não pode fabricar um player.

Fontes comunitárias sem autorização clara não devem receber resolvedor automático. Para passarem a “implementado”, precisam de:

1. autorização e termos compatíveis;
2. adaptador isolado;
3. busca e identidade;
4. acesso real e validado;
5. tratamento de erro, indisponibilidade e mudança de domínio;
6. teste de contrato;
7. teste de ponta a ponta com obra real;
8. evidência reproduzível.

## Regra de produto

O progresso pertence ao usuário e à identidade da obra. Uma troca de provedor não pode apagar o progresso, mas a transferência só é segura quando os identificadores equivalentes foram realmente resolvidos.
