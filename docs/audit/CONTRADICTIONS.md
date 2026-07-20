# Contradições iniciais

Esta tabela registra o estado encontrado antes da implementação. C-001, C-002, C-003, C-011 e C-012 foram tratados na primeira fatia; a prova está em `docs/evidence/COMPANION_REMOVAL.md`. C-004 recebeu uma fundação vertical comprovada em `docs/evidence/NOVELS_VERTICAL.md`, mas permanece parcial. As demais contradições continuam abertas até possuírem implementação e evidência próprias.

| ID | Decisão aprovada | Estado encontrado | Consequência | Resolução |
|---|---|---|---|---|
| C-001 | Não usar nem recriar Companion | Servidor, instalador, ZIP, UI, player, settings, protocolo e docs ativos | Arquitetura, segurança e UX divergem | remoção completa em fatia TDD |
| C-002 | Sem engine torrent local/debrid obrigatório | WebTorrent e APIs de debrid no Companion; magnet tratado como vídeo | quatro advisories high e promessa web falsa | remover; adapter Stremio Service/deep link explícito |
| C-003 | Jogos informados manualmente | launcher/scan/caminhos Windows | risco de shell e requisito local indevido | remover controlador/launcher; manter estados manuais |
| C-004 | Novels com prioridade máxima | botão/filtro, mas nenhuma rota própria | categoria incompleta | parcial: domínio, rota, detalhe e prévia real; providers/sync/gates globais pendentes |
| C-005 | Todas as fontes devem ter estado real | diretório mostra 93 fontes e capabilities sem evidência operacional | catálogo pode parecer integração | separar registry, classificação e evidence matrix |
| C-006 | Nada fictício | Home mostra loading/comparação genéricos e UI agrega contagens estáticas | comunica inteligência/dados não comprovados | estados vazios/loading ligados a operação real |
| C-007 | Supabase guarda dados em qualquer dispositivo | migrations/cliente existem, mas não há ambiente remoto validado | sync e RLS não comprovados | validar só após configuração autorizada |
| C-008 | Visual A principal; B claro; C técnico | UI atual usa linguagem A parcialmente, mas cards generalizados e técnica misturada ao Companion | hierarquia e honestidade inconsistentes | aplicar contratos de DESIGN.md por fatia |
| C-009 | Sem TV | plano/documentos anteriores tratavam TV como fase/lacuna | escopo inflado | remover TV de planos e critérios |
| C-010 | Sem categoria de audiolivros e outras excluídas | categoria anterior foi removida, mas relatórios históricos podem mencioná-la | risco de regressão documental | manter apenas teste negativo/histórico marcado |
| C-011 | Não depender de conteúdo no PC/NAS | `/personal-media` prioriza Jellyfin/Komga/Kavita/OPDS | onboarding inadequado | remover fluxo principal; manter somente providers opcionais na matriz |
| C-012 | “Funcionando” exige prova real | README/relatórios afirmam Companion validado em processo real | overclaim | reescrever docs operacionais e usar status permitido |
| C-013 | Lint e qualidade completos | `lint` é igual a `typecheck` | ausência de lint real pode passar despercebida | escolher linter por ADR/etapa e adicionar regras/testes |
| C-014 | PWA confiável | dois manifests e fallback offline amplo | install/cache podem divergir | unificar manifest e testar offline/update |

## Prioridade

Primeiro: C-001/C-002/C-003 por segurança e escopo. Em seguida: C-004/C-005 para tornar Novels e providers honestos. Autenticação/sync remotos aguardam a ação manual já prevista, sem bloquear o trabalho local de domínio e testes.
