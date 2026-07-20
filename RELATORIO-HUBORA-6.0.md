# Relatório de entrega — Hubora 6.0

## Objetivo

Fechar os defeitos críticos identificados na auditoria do Hubora 5.0, aprofundar o Cofre Adulto, tornar o compartilhamento de prints funcional, transformar os conectores de mídia pessoal em navegadores reais e reforçar recuperação e testes.

## Correções críticas concluídas

### Duo e Wrapped

O código do Duo agora remove qualquer item explicitamente adulto, classificado como maduro ou marcado como privado adulto antes de serializar o código. O Wrapped possui dois cálculos separados: privado, que pode considerar toda a biblioteca, e compartilhável, que exclui títulos e eventos adultos.

### Cofre Adulto

O PIN deixou de ser um hash SHA-256 rápido. A versão atual utiliza PBKDF2-SHA-256, 310 mil iterações, salt aleatório e comparação constante. O registro antigo é migrado após o primeiro desbloqueio correto. Tentativas incorretas acionam atraso progressivo de sessão.

Resenhas adultas usam `is_adult=true` e `visibility='adult'`, ficam fora do feed comum e aparecem apenas dentro do Cofre desbloqueado. A migração SQL cria políticas separadas para leitores anônimos e autenticados.

### Credenciais locais

Tokens de servidores pessoais são cifrados com AES-GCM. A chave é não exportável e fica em um IndexedDB separado. A lista de integrações devolve o token apenas em memória durante a sessão necessária à chamada.

### Compartilhamento de prints

O manifesto passou a aceitar imagens por POST multipart/form-data. O service worker intercepta `/share-target`, limita o arquivo a 15 MB, valida MIME de imagem, grava o conteúdo temporariamente no IndexedDB e redireciona para o Radar. O Radar importa o arquivo e cria um item de captura.

### Mídia pessoal

Os conectores agora consultam endpoints reais:

- Jellyfin: usuário autenticado e itens do usuário.
- Komga: séries recentes, contagem e progresso.
- Kavita: séries recentemente adicionadas.
- Audiobookshelf: bibliotecas e itens.
- OPDS 1/2: XML/Atom e JSON.

O catálogo aparece dentro do Hubora, pode ser filtrado e cada obra pode ser adicionada à biblioteca canônica. A abertura do arquivo continua sendo feita pelo servidor de origem para preservar permissões e compatibilidade.

### Backups

O banco local ganhou snapshots automáticos. Um backup é criado no máximo uma vez por dia, até sete versões por usuário/aparelho. Configurações permite criar e restaurar snapshots manualmente.

## Arquivos principais alterados

- `src/services/privacy.ts`
- `src/services/wrapped.ts`
- `src/services/vault.ts`
- `src/services/secretStorage.ts`
- `src/services/featureRepository.ts`
- `src/services/personalMedia.ts`
- `src/services/automaticBackup.ts`
- `src/services/shareInbox.ts`
- `src/sw.ts`
- `src/pages/AdultVault.tsx`
- `src/pages/Duo.tsx`
- `src/pages/Wrapped.tsx`
- `src/pages/Radar.tsx`
- `src/pages/PersonalMedia.tsx`
- `src/pages/Settings.tsx`
- `supabase/migrations/002_hubora_v6_hardening.sql`

## Resultado técnico

- 26/26 testes aprovados.
- TypeScript sem erros.
- Build de produção aprovado.
- Service worker PWA gerado.
- Zero vulnerabilidades conhecidas nas dependências de produção.
- Pacote final sem `.env`, `node_modules`, `dist` ou credenciais.

## O que ainda exige ação do proprietário

A aplicação está pronta para configuração e deploy, mas integrações externas não funcionam sem credenciais e servidores reais. Execute as migrações, cadastre as variáveis do Netlify e teste os servidores da rede em que serão usados. Reconhecimento universal de frames e reprodução universal de formatos não podem ser prometidos por uma aplicação gratuita sem um índice licenciado e sem conhecer os arquivos reais.
