# Registro inicial de riscos

Escala: impacto e probabilidade em `Baixo`, `Médio`, `Alto`, `Crítico`.

| ID | Risco | Impacto | Probabilidade | Evidência | Tratamento proposto | Estado |
|---|---|---|---|---|---|---|
| SEC-001 | Companion aceita caminho absoluto e o envia a `cmd.exe /c start` | Crítico | Alto | `companion/server.mjs` | Remover shell; launcher allowlist por aplicativo/ID; canonicalização; testes de abuso | Aberto |
| SEC-002 | Fetch do Companion aceita URL influenciada pelo usuário sem DNS pinning, bloqueio de IP privado e revalidação de redirect | Crítico | Alto | `companion/server.mjs` | Allowlist/proxy por provider, resolver todos os IPs, bloquear ranges privados, `redirect: error`, egress policy | Aberto |
| SEC-003 | Chaves de debrid e token de pareamento persistidos em `config.json` | Alto | Alto | `companion/server.mjs` | Migrar para Tauri Stronghold/Windows Credential Manager; rotação e migração segura | Aberto |
| SEC-004 | Token TorBox pode aparecer em query string | Alto | Médio | `companion/server.mjs` | Authorization header e redaction de logs/URLs | Aberto |
| SEC-005 | Pareamento público por código curto permite cadastrar nova origin | Alto | Médio | endpoint de pair permite origin desconhecida | Confirmação local explícita, limite agressivo, TTL, binding de dispositivo e auditoria | Aberto |
| SEC-006 | Vulnerabilidade `high` em `webtorrent`/`ip` | Alto | Alto | `npm audit --json`, GHSA-2p57-rm9w-gvfp | Remover ou isolar WebTorrent; não aceitar downgrade sugerido; revisar alcance e alternativa | Bloqueador |
| SEC-007 | CSP ampla (`connect-src https: wss:` e `frame-src https:`) | Alto | Médio | `netlify.toml` | CSP por hosts/capacidades e nonces/hashes; testes de headers | Aberto |
| SEC-008 | Express devolve `error.message` interno ao cliente | Médio | Médio | `server.ts` | Erro público estável + correlation ID; detalhe somente no log seguro | Aberto |
| LEG-001 | Torrent/debrid não exige prova de licença/open-content | Crítico | Alto | Companion e protocolo existentes | Gate de proveniência/licença; desativado por padrão; políticas auditáveis | Bloqueador |
| DATA-001 | Local-first e Supabase não têm evidência de conflito determinístico multi-device | Alto | Alto | testes atuais predominantemente mockados | Modelo de revisão, idempotência, outbox, replay e testes concorrentes | Aberto |
| DATA-002 | Remoção de categoria pode deixar integração antiga no IndexedDB | Médio | Médio | schema Dexie v5 | Migração revisada com backup/quarentena ou remoção confirmada | Decisão pendente |
| PWA-001 | Fallback offline retorna HTML para GET não-navegação | Alto | Alto | `src/sw.ts` | Estratégias por classe de recurso e testes offline reais | Aberto |
| PWA-002 | Manifest duplicado e metadados de instalação incompletos | Médio | Alto | `vite.config.ts`, `public/manifest.json` | Uma fonte de verdade, maskable, screenshots, lang e testes install/update | Aberto |
| TEST-001 | Teste Companion é intermitente em execução completa | Alto | Médio | primeira suite 38/39; isolado e rerun passaram | Reproduzir sob repetição, capturar stdout/stderr/porta e eliminar race | Aberto |
| TEST-002 | E2E cobre somente smoke Chromium e um teste está ignorado | Alto | Alto | Playwright: 11 pass, 1 skip | Matriz Chromium/Firefox/WebKit + mobile/tablet/TV e fluxos críticos | Aberto |
| PERF-001 | Chunks e precache grandes sem orçamento | Médio | Alto | build Vite | Budgets, rotas lazy, split por domínio, Lighthouse/Web Vitals | Aberto |
| SUP-001 | Skills preexistentes não registram commit/licença no lock antigo | Médio | Médio | `skills-lock.json` v1 | Resolver proveniência antes de atualizar/reinstalar | Aberto |
| OPS-001 | Companion atual exige Node e instalador não cobre update/uninstall/assinatura/single instance | Alto | Alto | scripts em `companion/` | Companion Tauri assinado, update seguro, logs, health, recovery e uninstall | Aberto |
