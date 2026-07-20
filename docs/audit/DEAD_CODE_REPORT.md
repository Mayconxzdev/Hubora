# Relatório inicial de código morto e superfícies a remover

Status: inventário `VERIFIED`; primeira remoção executada e validada em 2026-07-20. A tabela preserva o plano que orientou a fatia; a evidência final está em `docs/evidence/COMPANION_REMOVAL.md`.

## Remoção aprovada: Companion

| Superfície | Evidência | Ação |
|---|---|---|
| servidor | `companion/server.mjs` | remover integralmente |
| instalação | `companion/install-windows.ps1`, `start-companion.cmd` | remover |
| documentação | `companion/README.md` | remover |
| pacote público | `public/companion/Hubora-Companion-Windows.zip` | remover |
| cliente web | `src/services/companion.ts` | remover |
| teste | `tests/companion.test.ts` | substituir por testes negativos de ausência |
| providers UI | `src/pages/Providers.tsx` | remover pareamento, cache, endpoint e download |
| player | `src/pages/Player.tsx` | remover sessão/cache/progresso do Companion; preservar player web |
| settings | `src/pages/Settings.tsx` | remover debrid/WebTorrent/segredos do Companion |
| protocolo | `src/services/providerProtocol.ts` | remover magnet como vídeo web e textos “processado pelo Companion” |
| dependência | `webtorrent` e grafo transitivo | remover de package/lock e reauditar |
| estilos | seletores `hub-companion-*` em `src/index.css` | remover depois da UI |
| docs | README, deploy, limits e relatórios históricos | corrigir ou arquivar como histórico claramente marcado |

## Mídia pessoal local/servidores

`src/pages/PersonalMedia.tsx` e a navegação de “Minha mídia” foram removidas; `/personal-media` agora redireciona para `/sources`. `src/services/personalMedia.ts` foi mantido apenas como adapter opcional de servidores pessoais já catalogados — não como fluxo principal nem requisito do Hubora. Jellyfin/Kavita/Komga/OPDS permanecem candidatos opcionais na matriz, sem alegação de verificação.

Antes de excluir dados persistidos, é necessário localizar as chaves IndexedDB/localStorage e decidir entre exportar, migrar ou abandonar explicitamente. Código pode ser removido sem apagar silenciosamente dados do usuário.

## Jogos locais

`src/server/gameController.ts` e os trechos de launcher/scan do Companion foram removidos. A página de jogos mantém catálogo, metadados e estados informados pelo usuário.

## Rotas/redirecionamentos legados

`/community` e `/duo` apenas redirecionam para Home. Não são falha funcional, mas devem ser avaliadas como migração de URL ou removidas quando não houver histórico público a preservar.

## Código potencialmente obsoleto a confirmar

- `public/manifest.json` duplica o manifesto gerado pelo plugin PWA.
- Relatórios `RELATORIO-HUBORA-6.0.md` e `RELATORIO-HUBORA-9.0.md` descrevem estados antigos e não podem ser documentação operacional atual.
- `FEATURES-AND-LIMITS.md` e `NETLIFY_DEPLOY.md` promovem o Companion.
- `getUniversalVideoStreams` cria opções incorporadas para resolvedores sem health/evidência individual; deve ser substituído pelo registry, não apenas renomeado.
- Capacidades declaradas em `providerCatalog.ts` podem ser promocionais quando não há adapter/contract test correspondente.

## Sequência segura

1. Especificar ausência do Companion e comportamento web/Stremio esperado.
2. Criar testes negativos e de player web.
3. Remover UI e imports.
4. Remover servidor/pacote/dependência.
5. Atualizar documentação e SBOM.
6. Executar install, audit, typecheck, suíte completa, build e E2E.
7. Inventariar dados legados sem apagá-los.
