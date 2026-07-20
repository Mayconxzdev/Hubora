# Registro inicial de riscos

| ID | Risco | Impacto | Prob. | Evidência | Tratamento | Estado |
|---|---|---|---|---|---|---|
| SEC-001 | Shell/launcher recebe caminho no Companion | Crítico | Alto | `companion/server.mjs` | remover Companion e launcher | Aberto |
| SEC-002 | Fetch remoto no Companion/protocolo sem política SSRF completa | Crítico | Alto | servidor/protocolo | remover caminho local; criar egress allowlist no adapter hospedado | Aberto |
| SEC-003 | Tokens de pareamento/debrid persistidos pelo Companion | Alto | Alto | servidor e Settings | remover UI, persistência e migração explícita | Aberto |
| SEC-004 | Quatro vulnerabilidades high na cadeia WebTorrent | Alto | Alto | `npm audit` | remover dependência; reauditar; não fazer downgrade incompatível | Bloqueador |
| SEC-005 | CSP permite hosts HTTPS/frames de forma ampla | Alto | Médio | `netlify.toml` | política por provider/capability; testes de header | Aberto |
| SEC-006 | Conteúdo remoto/HTML/documentos exigem sanitização e limites | Alto | Alto | readers/providers | allowlist MIME/magic bytes/tamanho; sandbox; fixtures hostis | Aberto |
| AUTH-001 | Controle privado/RLS não validado em Supabase real | Crítico | Alto | somente migrations locais | ambiente de teste autorizado; testes usuário A/B e service role | Bloqueador remoto |
| DATA-001 | Conflito multi-device não determinístico | Alto | Alto | sync mockado/parcial | revisões, outbox, idempotência, replay e testes concorrentes | Aberto |
| DATA-002 | Dados legados do Companion/categoria removida podem permanecer localmente | Médio | Médio | Dexie/localStorage | inventário e migração/export; sem exclusão silenciosa | Decisão futura |
| PROV-001 | Capability estática confundida com integração real | Alto | Alto | 93 entradas no catálogo | matriz/evidência/health por capability | Aberto |
| PROV-002 | Domínios e contratos comunitários mudam | Alto | Alto | candidatos experimentais | adapter isolado, circuit breaker, versão e rollback | Aberto |
| PROV-003 | CORS, login ou anti-bot impede integração direta | Médio | Alto | fontes externas | classificar EXTERNAL_ONLY/BLOCKED, sem contorno oculto | Aberto |
| PWA-001 | Fallback offline devolve HTML para recurso/API | Alto | Alto | `src/sw.ts` | estratégias por classe e E2E offline | Aberto |
| PWA-002 | Manifest duplicado e install incompleto | Médio | Alto | Vite + `public/manifest.json` | fonte única, maskable, lang, install/update test | Aberto |
| TEST-001 | Suíte Vitest completa é intermitente | Alto | Médio | 2 falhas na execução completa; isolados passam | reproduzir, remover races/timeouts e exigir full green | Aberto |
| TEST-002 | E2E é smoke Chromium e possui 1 skip | Alto | Alto | 11/12 | fluxos críticos, Firefox/WebKit, a11y e dispositivos | Aberto |
| PERF-001 | HLS >500 KiB, CSS 208 KiB, precache 2,59 MiB | Médio | Alto | build | budgets, lazy load por rota, Lighthouse/Web Vitals | Aberto |
| OPS-001 | Saúde de provider não diferencia busca/meta/acesso | Alto | Alto | health genérico | checks por capacidade, histórico, latência, diagnóstico | Aberto |
| DOC-001 | Relatórios antigos overclaimam Companion e features | Alto | Alto | README/relatórios | atualizar, arquivar histórico e ligar afirmações a evidência | Aberto |
| UX-001 | Contagens/placeholders podem parecer dados reais | Médio | Alto | capturas atuais | estado vazio, fonte/data e sem métricas promocionais | Aberto |

## Gates

`SEC-004`, `AUTH-001` e qualquer falha crítica de isolamento impedem `VERIFIED RELEASE`. A ausência de credenciais remotas bloqueia apenas a validação remota, não a arquitetura, testes locais ou remoção do Companion.
