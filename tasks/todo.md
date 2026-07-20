# Tarefas

## Fatia atual — remover categoria excluída

- [x] Adicionar testes negativos de catálogo e protocolo.
- [x] Demonstrar RED com os testes no comportamento antigo.
- [x] Remover categoria, provedores dedicados, integração, UI e documentação.
- [x] Fazer tipos externos desconhecidos falharem fechados.
- [x] Executar suite completa, typecheck e build.
- [x] Executar E2E e inspeção browser da Home/Providers/Personal Media.
- [ ] Registrar evidência e commit atômico.
- [ ] Decidir migração de registros legados da integração removida no IndexedDB.

## Próxima fatia de alto risco

- [ ] Reproduzir flakiness do teste Companion em repetição controlada.
- [ ] Especificar política fail-closed para launch, fetch e torrent/debrid.
- [ ] Adicionar testes de abuso antes da correção.
- [ ] Desativar superfícies críticas até o Companion Tauri existir.

## Arquitetura

- [ ] Entrevista mínima de produto/design exigida por Impeccable.
- [ ] ADR do monorepo e hosts.
- [ ] ADR de identidade canônica.
- [ ] ADR de provider SDK/runner.
- [ ] ADR de sync/conflitos/backup.

## Validação futura

- [ ] Projeto Supabase de teste e validação RLS/realtime.
- [ ] Matriz Playwright Chromium/Firefox/WebKit e viewports.
- [ ] Acessibilidade e regressão visual.
- [ ] Testes PWA install/offline/update.
- [ ] SBOM e scanners quando ferramentas aprovadas estiverem disponíveis.
