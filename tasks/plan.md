# Plano incremental — Hubora real platform

## Objetivo

Transformar o baseline 9.0.0 em uma plataforma modular e verificável, preservando dados e identidade visual, sem converter existência de código em alegação de funcionamento.

## Decisões já autorizadas

- Trabalhar na branch `refactor/hubora-real-platform`.
- Preservar baseline por commit e tag.
- Remover a categoria de áudio narrado fora do escopo público.
- Priorizar dados locais, fontes oficiais/open-content e integrações autorizadas.
- Evoluir em fatias verticais com testes e evidências.

## Decisões centrais ainda necessárias

- Confirmar web/PWA como superfície principal e Tauri como Companion separado.
- Aprovar estratégia de monorepo e fronteiras de bounded contexts.
- Definir tratamento irreversível de credenciais antigas da integração removida no IndexedDB.
- Aprovar contas/projetos de teste para Supabase e providers com credencial.

## Fases

### Fase 0 — Preservação e baseline

- Concluída: Git, identidade local, commit, tag e branch.
- Concluída: install/typecheck/test/build/E2E/audit npm.
- Em andamento: documentação inicial e matriz de evidências.

### Fase 1 — Escopo e segurança imediata

- Remover a categoria excluída por contrato, UI, provider, documentação e testes.
- Tornar tipos externos desconhecidos fail-closed.
- Reproduzir e corrigir flakiness do Companion.
- Desabilitar caminhos inseguros de launch/fetch/torrent até substituição.

Checkpoint: suite, build, browser local e diff de segurança.

### Fase 2 — Contratos e arquitetura estranguladora

- ADR de monorepo/hosts.
- ADR de identidade canônica e provider SDK.
- Extrair ports de catálogo, biblioteca, sync e providers.
- Criar fakes/contract tests antes de mover adaptadores.

Checkpoint: comportamento existente preservado, sem migração destrutiva.

### Fase 3 — Biblioteca, sync e backup reais

- Modelo canônico por mídia.
- Idempotência, revisões, outbox e conflito determinístico.
- Export/import/restore/upgrade testados.
- RLS e realtime validados contra projeto de teste.

### Fase 4 — Reader, player e fontes

- Provider SDK versionado e runner isolado.
- Player/reader por formatos e erros.
- Política legal/proveniência para open-content.
- Contract/E2E tests por provider suportado.

### Fase 5 — Companion Tauri

- Pareamento, armazenamento seguro, network policy e launcher allowlist.
- Steam libraries/Playnite e outros launchers somente por adaptadores explícitos.
- Instalador, single instance, update/uninstall, assinatura e diagnóstico.

### Fase 6 — UX, PWA, TV e qualidade

- Design/product interview e `PRODUCT.md` conforme Impeccable.
- Design system preservado e auditado.
- Offline/install/update reais.
- Mobile/tablet/desktop/TV, teclado e acessibilidade WCAG 2.2 AA.
- Matriz Chromium/Firefox/WebKit e regressão visual.

### Fase 7 — Operação e release

- Observabilidade, SLOs, redaction e suporte.
- SBOM, secret scan, dependency policy e CI imutável.
- Runbooks, release notes e relatório de limitações.

## Riscos e mitigação

O registro canônico é `docs/audit/RISK_REGISTER.md`. Segurança do Companion, legalidade de torrent/debrid, advisories high e migrações de dados são gates, não itens cosméticos.
