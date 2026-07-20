# Plano incremental — Hubora verified platform

## Objetivo

Entregar uma plataforma pessoal privada e verificável para nove categorias, preservando React/TypeScript/Vite e dados existentes, sem chamar catálogo estático, mock ou homepage de integração real.

## Decisões aprovadas

- Direção visual A; tema claro B; densidade C somente em Fontes/Saúde/Diagnóstico.
- Filmes, Séries, Doramas, Anime, Mangá, Quadrinhos, Livros, Novels e Jogos com prioridade igual.
- Cofre transversal opcional.
- Companion removido; sem engine torrent local, debrid persistido, scan ou launcher.
- Jogos manuais.
- Stremio Service opcional e deep link como fallback para recursos não web-ready.
- Web/PWA no computador e celular; sem TV e sem NAS obrigatório.
- Supabase/Netlify gratuitos depois da autorização/configuração manual.
- Git somente local.

## Fase 0 — preservação, produto e auditoria

- Preservar commits/tags e branch local.
- Executar install, typecheck, “lint”, unitários, build, E2E, audit, signatures, secret scan heurístico, bundle e capturas.
- Criar PRODUCT/DESIGN/DESIGN_SYSTEM/ACCESSIBILITY.
- Criar matrizes iniciais de feature/provider e relatórios de dead code/contradições/riscos.

Checkpoint: documentos consistentes, CSV válido, diff limpo e commit local.

## Fase 1 — remoção segura do Companion

- Especificar comportamento após remoção e dados legados.
- Criar testes negativos e de regressão do player/providers/settings.
- Remover servidor, instaladores, ZIP, cliente, UI, testes, WebTorrent/debrid, personal media principal e launchers.
- Corrigir Stremio para HTTPS/YouTube, Service opcional e deep link.
- Reexecutar instalação/audit/suite/build/E2E e atualizar SBOM/evidências.

## Fase 2 — domínio e protocolo

- ADR de identidade canônica e Provider Protocol v1.
- Extrair ports e adapters sem monorepo antecipado.
- Registry com capability + evidência + health.
- Segurança de egress/SSRF e manifest JSON declarativo.

## Fase 3 — fatias por categoria

- Novels primeiro por ser a lacuna estrutural.
- Detalhes universais e especializações por mídia.
- Player e leitores com corpus aberto/licenciado.
- Jogos manuais completos.
- Busca/Radar/Hubora Agora sem dados fictícios.

## Fase 4 — conta, sync e dados

- Auth privado, allowlist/invites e papéis futuros.
- RLS comprovada em ambiente Supabase autorizado.
- Sync idempotente, conflitos, offline, backup/export/restore.
- Cofre isolado em busca, notificações e sync.

## Fase 5 — UI, PWA e qualidade

- Aplicar design A por fatias, B no tema claro e C nas telas técnicas.
- Acessibilidade WCAG 2.2 AA.
- Manifest/cache/offline/update testados.
- Chromium/Firefox/WebKit, celular/tablet/desktop e regressão visual.
- Budgets de performance e observabilidade.

## Fase 6 — providers e release

- Investigar cada linha da matriz individualmente.
- Priorizar APIs oficiais e conteúdo aberto.
- Classificar corretamente EXTERNAL_ONLY/BLOCKED/EXPERIMENTAL.
- Cenários críticos, relatórios finais, checksums, SBOM e instalação.
- Usar `VERIFIED RELEASE` somente com todas as evidências reproduzíveis.
