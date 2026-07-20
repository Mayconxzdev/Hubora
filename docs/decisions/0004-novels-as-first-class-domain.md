# ADR 0004 — Novels como domínio de primeira classe

- Estado: aceito
- Data: 2026-07-20

## Contexto

Novels apareciam no produto apenas como filtro ou rótulo de livros. Isso
contradizia o escopo aprovado de nove categorias com a mesma prioridade e
quebrava identidade, navegação, progresso, backup, busca, detalhes e acesso.

Google Books e Open Library oferecem metadados gratuitos, mas catálogo não é
sinônimo de leitura integral. Um item do Internet Archive também pode ser
aberto, restrito, emprestável ou somente uma prévia. A interface não pode
rotular todas essas situações como “grátis” ou “ler completo”.

## Decisão

1. `novel` é um `MediaType` próprio em toda a aplicação.
2. `/novels` possui descoberta, busca, filtros e navegação próprias.
3. Google Books é acessado por `/api/google-books`. Uma chave gratuita opcional
   fica somente no servidor em `GOOGLE_BOOKS_API_KEY`; o frontend nunca recebe a
   chave.
4. Open Library é o fallback público quando Google Books falha ou não retorna
   itens.
5. Acesso interno só aparece quando a resposta da origem declara uma prévia,
   arquivo ou edição incorporável.
6. A disponibilidade da edição Open Library é consultada antes do rótulo:
   `full` pode ser “Ler” e gratuito; `restricted`, `borrow` ou desconhecido são
   descritos como prévia, empréstimo ou disponibilidade, sem selo gratuito.
7. O leitor web aceita somente HTTPS. HTTP local/LAN, `magnet:` e protocolos
   locais falham fechados.
8. Música não é uma categoria nem um bloco global dos detalhes; a seção vazia
   de trilha sonora foi removida.

## Consequências

- Novels deixam de ser reclassificadas como livros em biblioteca, progresso,
  backup, busca e detalhes.
- Livros e quadrinhos também passam a usar o proxy seguro do Google Books.
- A aplicação continua útil quando Google Books está sem quota, mas o fallback
  pode ter menos capas, traduções ou metadados.
- Esta decisão cria uma fatia vertical real, não comprova todos os providers de
  novels nem a prontidão global do Hubora.

## Gates para ampliar além de `PARTIAL`

- chave gratuita Google Books configurada e validada no ambiente Netlify;
- providers oficiais/comunitários avaliados individualmente;
- leitura completa, prévia, empréstimo, indisponibilidade e erro exercitados
  com corpus controlado;
- autenticação/sincronização/progresso remoto validados;
- Firefox, WebKit, acessibilidade e tema claro aprovados.
