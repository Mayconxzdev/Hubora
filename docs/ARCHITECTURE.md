# Arquitetura do Hubora 7.1

## Princípios

1. **Local-first:** a ação é confirmada no dispositivo antes da rede.
2. **Nuvem opcional:** conta e sincronização ampliam o produto, mas não bloqueiam o uso local.
3. **Identidade explícita:** IDs incluem provedor, tipo de mídia e ID externo.
4. **Descoberta explicável:** ranking por regras e metadados; nenhuma resposta gerada por modelo.
5. **Privacidade por padrão:** biblioteca e listas são privadas, protegidas por RLS.

## Fluxo de gravação

```text
UI -> Zustand -> Dexie/IndexedDB -> sync_outbox -> Supabase/PostgreSQL
```

A interface não aguarda a rede. Operações que falham permanecem na outbox com contagem de tentativas e são repetidas ao recuperar sessão/conectividade.

## Identidade e deduplicação

Uma entrada de biblioteca usa:

```text
<provider>:<media_type>:<provider_id>
```

Exemplos:

```text
tmdb:movie:438631
anilist:anime:11061
igdb:game:1942
openlibrary:book:OL45804W
```

O `workFingerprint` ajuda a sugerir possíveis equivalências, mas não mescla automaticamente obras de provedores diferentes. Isso evita unir por engano remakes, edições, temporadas ou adaptações.

## Persistência local

Dexie organiza:

- `libraryEntries`
- `customLists`
- `consumptionEvents`
- `syncOutbox`
- `profiles`
- `metadata`

O Diário Universal deriva de `consumptionEvents`, preservando histórico em vez de manter somente o progresso atual.

## Nuvem

Supabase fornece Auth, PostgreSQL, Realtime e RLS. O cliente usa apenas chave publicável. Segredos de provedores externos ficam nas Netlify Functions e no proxy local de desenvolvimento; TMDB não é mais chamado com credencial pelo navegador.

## Descoberta sem IA

A consulta é convertida em intenção estruturada: tipo de mídia, gêneros, humores, temas, ritmo, duração, país e exclusões. O ranking combina afinidade, qualidade, popularidade, novidade e penalidades, retornando motivos legíveis ao usuário.

## Testes

- Vitest: regras de identidade, descoberta e repositório local.
- fake-indexeddb: persistência offline em ambiente de teste.
- Playwright: smoke test de navegação em navegador real.
- GitHub Actions: instalação limpa, typecheck, testes, build e smoke test.
