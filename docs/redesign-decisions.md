# Hubora — decisões do redesign

## D-001 — Produto pessoal com endereço compartilhável

Decisão do proprietário em 2026-07-22: o Hubora não é promovido publicamente, mas qualquer pessoa com o link pode usar como convidado, criar conta ou entrar com Google. O link pode ser repassado.

Consequência: não há autenticação obrigatória na entrada nem allowlist para usuário comum. O endereço não é tratado como segredo; privacidade depende de isolamento por conta e por aparelho.

## D-002 — RLS por proprietário, allowlist apenas administrativa

`supabase/migrations/005_link_access_accounts.sql` substitui políticas com `is_hubora_allowed_user()` por políticas baseadas em `auth.uid()`. A tabela privada e RPC podem permanecer para provisionamento E2E/service role, mas não controlam cadastro ou uso normal.

## D-003 — Referência visual não fornece conteúdo

`Hubora_Redesign_Cinematografico_Completo/` é inspiração para hierarquia, shell, superfícies, densidade e navegação. O Hubora real permanece fonte de rotas, ações, dados, permissões e estados.

## D-004 — Direção “A Cabine de Curadoria”

Chrome neutro, conteúdo como fonte de cor, violeta raro para decisão/foco, densidade moderada, superfícies planas e movimento de estado. Anti-padrões estão em `PRODUCT.md` e `DESIGN.md`.

## D-005 — Nove categorias e Cofre transversal

O registro em `src/config/navigation.ts` é canônico para as nove categorias. Cofre Adulto não participa desse array e não é apresentado como décima categoria.

## D-006 — Lucide como biblioteca única

Home, shell, command palette e novas telas usam `lucide-react`. Ícones de categoria têm semântica única e teste de não duplicação.

## D-007 — Hosts de streaming são preservados com segurança

O redesign não reduz cobertura dos hosts solicitados pelo proprietário. A abertura continua limitada a hostname HTTPS exato, CSP correspondente, iframe sandboxed e comportamento real observado. Estar na allowlist não transforma uma fonte externa em “verificada”.

## D-008 — Desenvolvimento permanece em `main`

Apesar de a especificação anexa sugerir uma branch de redesign, prevalece a decisão explícita anterior do proprietário: permanecer em `main`, sem Pull Request, sem force-push e sem push antes de todos os gates locais.

## D-009 — Cadastro respeita confirmação de e-mail

Quando `signUp` retorna sessão nula, o Hubora mostra o estado “Confirme seu e-mail” e não simula login. O retorno permitido é `/login?confirmed=1`.

## D-010 — Status é evidência, não otimismo

`IMPLEMENTED_LOCAL` descreve código/teste local. `PASS` exige execução do cenário. `VERIFIED RELEASE` exige matriz local e Netlify no SHA correto, sem `BLOCKED_*` obrigatório.
