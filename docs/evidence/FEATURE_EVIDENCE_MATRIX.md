# Matriz de evidências de funcionalidades

Estados permitidos: `NOT_STARTED`, `IMPLEMENTING`, `PARTIAL`, `BLOCKED`, `VERIFIED`.

`VERIFIED` exige integração, testes automatizados relevantes, fluxo real executado, artefato preservado, tratamento de erro documentado e nenhum bloqueador crítico conhecido para o escopo verificado.

| ID | Funcionalidade | Estado | Testes/artefatos atuais | Fluxo real | Bloqueadores para `VERIFIED` |
|---|---|---|---|---|---|
| SCOPE-001 | Remoção da categoria excluída | PARTIAL | 42/42 Vitest, incluindo filtro de registro legado; build/typecheck; 11/12 E2E; screenshots de Home, Providers e Personal Media | UI inspecionada em preview Vite local na porta exclusiva 43117 | Decisão sobre remoção futura do dado legado IndexedDB; o único skip E2E preexistente impede um gate totalmente limpo |
| CORE-001 | Shell/Home | PARTIAL | Smoke Chromium desktop/Pixel 7 e captura local | Página renderizada pelo smoke | Aplicar direção A/B; Firefox/WebKit/tablet/a11y/visual/console/network |
| LIB-001 | Biblioteca local | PARTIAL | Unitários predominantemente isolados | Não executado E2E nesta auditoria | CRUD/import/export/restore/upgrade real |
| SYNC-001 | Sync Supabase | BLOCKED | Código e migrations | Não executado contra projeto remoto | Credenciais/projeto de teste, RLS, realtime e conflitos |
| AUTH-001 | Autenticação | BLOCKED | Rotas existentes | Não executado | Projeto Supabase de teste e políticas aprovadas |
| PROV-001 | Provider protocol/registry | PARTIAL | Parser, catálogo estático e testes; magnet/infoHash/.torrent falham fechados | Não em origem externa real | ADR do protocolo, schema, egress seguro, timeout/retry/rate limit/contract/evidence tests |
| MEDIA-001 | Player web | PARTIAL | Componentes/HLS buildam; sessão local removida | Não executado com mídia real nesta fatia | Matriz de formatos/legenda/erro/PiP/casting |
| MEDIA-002 | Reader | PARTIAL | Leitor HTTPS e regras negativas; `NOVELS_VERTICAL.md` | Prévia restrita real do Internet Archive aberta no BookReader | EPUB/PDF/CBZ/CBR/OPDS/anotações; erro externo do embed; corpus hostil e browsers |
| COMP-001 | Remoção do subsistema local | VERIFIED | `COMPANION_REMOVAL.md`; 45/45 Vitest; burn-in E2E 65 pass/5 skips esperados e execução final 13 pass/1 skip; audit 0; screenshots | Superfícies desktop/Pixel 7 e redirect exercitados; player/streams HTTP local e LAN rejeitados | Dados legados preservados sem exclusão; migração opcional futura não reabre o runtime |
| PWA-001 | PWA install/offline/update | PARTIAL | Build Workbox | Não executado | Manifest único, cache correto e testes de instalação/offline/update |
| NOVEL-001 | Novels como domínio de primeira classe | PARTIAL | `NOVELS_VERTICAL.md`; 54/54 Vitest; build; 13 pass/1 skip E2E; 4 screenshots | Catálogo Open Library, detalhe e prévia restrita Internet Archive exercitados | Google/Netlify, providers adicionais, leitura integral, sync, tema claro, browsers e a11y |
| GAME-001 | Jogos manuais | PARTIAL | Scan/launcher removidos; lojas agora são páginas externas | Página abre no smoke | CRUD E2E dos estados desejado/possuído/instalado/jogando/concluído |
| DESIGN-001 | Direção visual A+B+C | IMPLEMENTING | `PRODUCT.md`, `DESIGN.md`, `DESIGN_SYSTEM.md`, `ACCESSIBILITY.md` | Referências aprovadas; UI ainda não migrada | Implementação incremental e evidência em claro/escuro/viewports |
| SEC-DEP-001 | Dependências sem advisory conhecido | VERIFIED | `npm audit`: 0; árvore válida; 701 assinaturas; SBOM regenerada | Instalação congelada local com scripts desativados | Revalidar a cada mudança de lock/release |

## Regra de atualização

Cada mudança de estado deve apontar para:

1. comando e saída preservada;
2. teste automatizado ou justificativa explícita;
3. artefato visual/runtime quando aplicável;
4. erros e limitações observados;
5. commit que introduziu a evidência.

## Artefatos da fatia SCOPE-001

- `output/playwright/category-removal/home.png`
- `output/playwright/category-removal/providers.png`
- `output/playwright/category-removal/personal-media.png`

Uma primeira tentativa de captura na porta 4173 foi rejeitada após inspeção por apontar para outro servidor local. Os três arquivos foram sobrescritos pelas capturas válidas obtidas na porta 43117; somente essas imagens entram como evidência.
