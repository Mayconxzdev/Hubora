# Hubora 9.0.0

Hubora é uma Web/PWA pessoal e privada, em PT-BR, para descobrir, organizar,
acompanhar, ler e assistir entretenimento com origem e disponibilidade
explícitas.

## Escopo aprovado

As nove categorias têm a mesma prioridade: Filmes, Séries, Doramas, Anime,
Mangá, Quadrinhos, Livros, Novels e Jogos. O Cofre é um contexto transversal,
não uma categoria. Jogos usam estados manuais; o Hubora não procura nem executa
programas instalados.

O produto combina a estrutura cinematográfica da direção A, tema claro baseado
em B e densidade técnica de C somente em Fontes, Saúde e Diagnóstico. Consulte
[PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md),
[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) e [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Estado honesto

Classificação global: **ALPHA**.

- TypeScript e build de produção passam no baseline auditado.
- O smoke Playwright atual passa 11 cenários e ignora 1.
- A suíte Vitest completa apresentou flakiness, embora os casos tenham passado
  isoladamente; ela ainda precisa ficar verde em uma execução completa.
- O diretório de runtime contém fontes mapeadas, não integrações automaticamente
  verificadas.
- A matriz inicial possui 283 candidatos/classificações e nenhuma entrada
  `VERIFIED` sem cenário real.
- Supabase, Netlify e OAuth remotos ainda não foram configurados nesta fase.

Evidências: [estado inicial](docs/audit/INITIAL_STATE.md),
[matriz de recursos](docs/audit/FEATURE_MATRIX_INITIAL.csv),
[matriz de provedores](docs/audit/PROVIDER_MATRIX_INITIAL.csv) e
[validação de baseline](docs/evidence/BASELINE_VALIDATION.md).

## Executar localmente

Requer Node.js 22.12 ou superior.

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run dev` inicia o servidor local em `http://localhost:3000`. `npm run
preview` serve o build estático e não executa as Netlify Functions.

## Fontes e acesso

- Metadados não são reprodução/leitura.
- Uma página externa continua identificada como externa.
- HTTPS direto/HLS compatível e YouTube autorizado podem abrir internamente.
- Magnet, `infoHash`, `.torrent` e recursos `notWebReady` não são transformados
  em vídeo de navegador.
- Um futuro adapter opcional poderá usar Stremio Service; sem ele, o produto deve
  oferecer deep link ou explicar o requisito.
- Servidores pessoais permanecem opcionais e nunca são requisito do onboarding.

O manifesto de exemplo está em
[docs/hubora-provider.example.json](docs/hubora-provider.example.json). O
contrato ainda está `PARTIAL` e será versionado/testado antes de ser anunciado
como SDK estável.

## Dados e segredos

`.env.local` não é versionado. No frontend, somente valores publicáveis podem
usar prefixo `VITE_`; segredos de APIs ficam no servidor/Functions. Não envie
senhas ou chaves no chat e não faça commit de `.env`.

A configuração remota seguirá [NETLIFY_DEPLOY.md](NETLIFY_DEPLOY.md) apenas
depois de autorização explícita. As migrations estão em `supabase/migrations/`,
mas a existência do SQL não comprova RLS em ambiente real.

## Licença

AGPL-3.0-or-later.
