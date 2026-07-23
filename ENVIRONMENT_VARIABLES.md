# Variáveis de ambiente — Hubora

Valores nunca devem ser incluídos neste arquivo, em capturas, logs ou commits. A lista abaixo foi conferida contra o painel Netlify exibido e contra os usos de código auditados.

| Variável | Obrigatória | Consumidor | Escopo Netlify recomendado | Contextos | Quando ausente |
| --- | --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Sim para autenticação/sincronização | Frontend/build | Build + Functions; valor público | produção e Deploy Preview | O cliente Supabase não é criado; autenticação e nuvem mostram configuração ausente. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim para autenticação/sincronização | Frontend/build | Build + Functions; valor público | produção e Deploy Preview | Igual ao item anterior. Nunca usar a secret key no lugar dela. |
| `SUPABASE_URL` | Sim para operações de Function que consultem Supabase | Functions | Functions somente | produção e Deploy Preview | A Function dependente deve retornar indisponibilidade segura. |
| `SUPABASE_SECRET_KEY` | Sim somente para operações administrativas server-side | Functions | Functions somente; secreta | produção e Deploy Preview | Não iniciar operações administrativas; jamais expor ao browser. |
| `TMDB_API_KEY` | Sim para proxy TMDB | Function `/api/tmdb` | Functions somente; secreta | produção e Deploy Preview | O proxy responde configuração ausente/erro seguro, sem inventar metadados. |
| `IGDB_CLIENT_ID` | Sim para catálogo de jogos IGDB | Functions | Functions somente; secreta | produção e Deploy Preview | Busca de jogos dependente fica indisponível. |
| `IGDB_CLIENT_SECRET` | Sim para token IGDB | Functions | Functions somente; secreta | produção e Deploy Preview | Igual ao item anterior. |
| `GOOGLE_BOOKS_API_KEY` | Opcional conforme cota/configuração Google Books | Function de livros | Functions somente; secreta | produção e Deploy Preview | A Function deve usar somente fallback permitido ou informar indisponibilidade. |

## Variáveis de comportamento público

As configurações abaixo não são segredos. O modelo atual é público/multiusuário e a segurança dos dados pessoais depende de Supabase Auth + RLS, não de allowlist no bundle.

| Variável | Recomendação |
| --- | --- |
| `VITE_REQUIRE_AUTH` | `false` ou ausente, salvo decisão futura de tornar todo o produto fechado. |
| `VITE_ALLOW_PUBLIC_SIGNUP` | `true` ou ausente; o projeto Supabase já está configurado para confirmação de e-mail. |
| `VITE_ALLOW_GUEST_MODE` | Decisão de produto. Para biblioteca sincronizada, explicar claramente a limitação local do modo visitante. |

## Confirmadas no painel, mas ainda não homologadas por build

Foram vistas no Netlify: `GOOGLE_BOOKS_API_KEY`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `SUPABASE_SECRET_KEY`, `SUPABASE_URL`, `TMDB_API_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_URL`.

Essa presença não prova escopo correto, validade, nem execução de Function. A Netlify CLI local não foi concluída por bloqueios no cache do `npx`; validar os escopos acima no painel antes do Deploy Preview.
