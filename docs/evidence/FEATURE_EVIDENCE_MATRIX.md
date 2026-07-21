# Matriz de evidências de funcionalidades

Estados permitidos: `NOT_STARTED`, `IMPLEMENTING`, `PARTIAL`, `BLOCKED`, `VERIFIED`.

`VERIFIED` exige integração, testes automatizados relevantes, fluxo real executado, artefato preservado, tratamento de erro documentado e nenhum bloqueador crítico conhecido para o escopo verificado.

| ID | Funcionalidade | Estado | Testes/artefatos atuais | Fluxo real | Bloqueadores para `VERIFIED` |
|---|---|---|---|---|---|
| CONTRACT-001 | Media Presentation Registry Central por Categoria | VERIFIED | 64/64 Vitest (`tests/media-presentation-contract.test.ts`), `skills-lock.json`, `CLEAN_INSTALL_REPORT.md` | Registra e aplica os contratos das 9 mídias principais (filmes, séries, doramas, animes, mangás, quadrinhos, livros, novels e jogos) sem condicionais dispersas | Nenhum |
| SCOPE-001 | Remoção da categoria excluída | PARTIAL | 64/64 Vitest, incluindo filtro de registro legado; build/typecheck; screenshots de Home, Providers e Personal Media | UI inspecionada em preview Vite local | Decisão sobre dados legados IndexedDB |
| CORE-001 | Shell/Home | PARTIAL | Smoke Chromium desktop/Pixel 7 e captura local | Página renderizada pelo smoke | Firefox/WebKit/a11y/visual |
| LIB-001 | Biblioteca local | PARTIAL | Unitários isolados | Não executado E2E nesta auditoria | CRUD/import/export real |
| SYNC-001 | Sync Supabase | BLOCKED | Código e migrations | Não executado contra projeto remoto | Credenciais/projeto de teste, RLS, realtime e conflitos |
| AUTH-001 | Autenticação | BLOCKED | Rotas existentes | Não executado | Projeto Supabase de teste |
| PROV-001 | Provider protocol/registry | PARTIAL | Parser, catálogo estático e testes | Origem externa real | ADR do protocolo |
| MEDIA-001 | Player web | PARTIAL | Componentes/HLS buildam | Não executado com mídia real nesta fatia | Matriz de formatos/legenda/erro |
| MEDIA-002 | Reader | PARTIAL | Leitor HTTPS e regras negativas; `NOVELS_VERTICAL.md` | Prévia restrita real do Internet Archive | EPUB/PDF/CBZ/CBR/OPDS |
| DETAIL-VIDEO-001 | Vídeos reais nos detalhes | PARTIAL | `DETAIL_VIDEOS.md`; normalização, lista, segurança e UI testadas | Jikan → YouTube reproduzido no modal | Browsers/a11y/tema claro |
| COMP-001 | Remoção do subsistema local | VERIFIED | `COMPANION_REMOVAL.md`; 64/64 Vitest; audit 0; screenshots | Superfícies desktop/Pixel 7 e redirect exercitados | Nenhum |
| PWA-001 | PWA install/offline/update | PARTIAL | Build Workbox | Não executado | Manifest único, cache correto |
| NOVEL-001 | Novels como domínio de primeira classe | VERIFIED | `NOVELS_VERTICAL.md`; 64/64 Vitest; build; 13 pass/1 skip E2E | Catálogo Open Library, detalhe e prévia restrita Internet Archive | Nenhum |
| GAME-001 | Jogos manuais | PARTIAL | Scan/launcher removidos; lojas agora são páginas externas | Página abre no smoke | CRUD E2E dos estados desejado/possuído/instalado/jogando/concluído |
| SEC-DEP-001 | Dependências sem advisory conhecido | VERIFIED | `npm audit`: 0; 701 assinaturas; SBOM regenerada | Instalação congelada local com scripts desativados | Revalidar a cada mudança de lock/release |

## Regra de atualização

Cada mudança de estado deve apontar para:

1. comando e saída preservada;
2. teste automatizado ou justificativa explícita;
3. artefato visual/runtime quando aplicável;
4. erros e limitações observados;
5. commit que introduziu a evidência.
