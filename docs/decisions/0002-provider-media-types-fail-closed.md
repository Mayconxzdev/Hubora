# ADR-0002: Filtrar tipos externos fora do contrato de mídia

## Status

Aceito

## Data

2026-07-20

## Contexto

O protocolo de providers convertia qualquer tipo desconhecido para `movie`. Isso fazia um manifesto incompatível parecer suportado e podia classificar conteúdo incorretamente. Uma categoria fora do escopo também era convertida silenciosamente para `book`.

## Decisão

Manter uma allowlist explícita de aliases suportados. Tipos ausentes continuam usando `movie` apenas quando o provider omite o campo em um item compatível com o contrato legado; tipos presentes e desconhecidos são descartados do manifesto e dos resultados de busca.

O catálogo público contém somente filmes, séries, doramas, anime, livros, novels, mangá, quadrinhos e jogos.

## Alternativas consideradas

### Preservar fallback de qualquer string para filme

Rejeitada porque esconde incompatibilidade, polui identidade canônica e cria falsa evidência de suporte.

### Lançar erro para todo o manifesto se um tipo for desconhecido

Adiada. Um provider pode declarar tipos extras e ainda oferecer tipos válidos; filtrar permite degradação parcial sem ampliar o contrato.

## Consequências

- Manifestos com somente tipos desconhecidos permanecem configuráveis, porém com `mediaTypes` vazio.
- Itens de busca com tipo desconhecido não entram na biblioteca.
- Contract tests impedem a reintrodução do fallback silencioso.
- Uma futura versão do Provider SDK deve formalizar schema, warnings e health de compatibilidade.
