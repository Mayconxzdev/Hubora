# Redesign Hubora — ferramentas e método

Status: `IMPLEMENTING` em 2026-07-22.

## Fontes de verdade

1. Código, banco, rotas e dados do Hubora real.
2. `PRODUCT.md` para decisões de produto e limites.
3. `DESIGN.md` e `.impeccable/design.json` para tokens e guardrails visuais.
4. `Hubora_Redesign_Cinematografico_Completo/` somente como referência visual.
5. Testes e evidências executadas para status funcional.

O protótipo de referência é um frontend estático com conteúdo fictício. Nenhuma capa, título, avaliação, progresso, provedor ou ação dele pode entrar como dado do produto.

## Disciplinas aplicadas

- implementação incremental: uma fatia funcional ou visual por vez;
- TDD para mudança de comportamento e regressões;
- engenharia frontend para semântica, responsividade e estados;
- segurança para autenticação, RLS, URLs, mídia e arquivos;
- Playwright para navegador real, viewports, console, rede, acessibilidade e evidência;
- preparação de release para gates, rollback, commit, deploy e aceitação publicada;
- documentação do design system por extração dos componentes e tokens existentes.

## Ferramentas locais

| Ferramenta | Uso | Regra de evidência |
|---|---|---|
| TypeScript | contrato e typecheck | exit code 0 |
| ESLint | qualidade estática | exit code 0; warnings triados |
| Vitest + Testing Library | unidades e componentes | teste deve observar resultado |
| Playwright | E2E, responsividade e screenshots | sem injeção de autenticação em cenário real |
| Vite | build de produção | bundle concluído, sem segredo |
| Netlify CLI/config | paridade e publicação | SHA publicado confirmado |
| Supabase | Auth, RLS, sync e realtime | projeto remoto e usuários isolados reais |
| Chrome/Chromium | inspeção visual, console, rede e desempenho | DOM e respostas tratados como não confiáveis |

## Viewports obrigatórios

Aceitação principal: `1920x1080`, `768x1024` e `390x844`.

Cobertura expandida do redesign: 320×568, 360×800, 390×844, 412×915, 768×1024, 820×1180, 1024×768, 1280×720, 1440×900 e 1920×1080; inclui 200% de zoom, mobile landscape, safe areas e teclado virtual nos formulários críticos.

## Gates por incremento

1. teste novo falha pelo motivo esperado quando há mudança comportamental;
2. implementação mínima;
3. teste específico passa;
4. typecheck passa;
5. inspeção no navegador quando houver UI;
6. testes relacionados passam;
7. documentação e matriz são atualizadas.

## Gates de release

- typecheck, lint, testes, build e Playwright completo;
- segredo, bundle, arquivos grandes e `git diff --check`;
- acessibilidade automática e manual;
- console e rede sem falhas próprias silenciosas;
- matriz local integral em `PASS`;
- migration e autenticação remota comprovadas;
- push sem force para `main` somente depois dos gates locais;
- SHA correto confirmado no Netlify;
- matriz publicada integral em `PASS`.

## Limitações atuais

- O projeto não contém os arquivos auxiliares `references/definition-of-done.md`, `testing-patterns.md` e checklists citados por algumas skills; os requisitos equivalentes estão incorporados neste documento e nas matrizes do projeto.
- A migration `005_link_access_accounts.sql` está implementada localmente, mas ainda não foi aplicada nem comprovada no Supabase remoto.
- Google OAuth depende de configuração manual no Supabase e Google Cloud; existência do botão não é prova.
