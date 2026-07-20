# ADR 0003 — remover Companion e execução local

- Estado: aceito
- Data: 2026-07-20

## Contexto

O baseline possui um servidor Node/PowerShell separado que combina pareamento,
tokens, proxy/cache, HLS, WebTorrent, debrid, arquivos locais e execução de
programas. O produto aprovado é uma Web/PWA privada, usada em computador e
celular, sem scan/launcher e sem engine torrent local. Jogos são manuais.

## Fronteiras e ameaças

- Entrada não confiável: URL/manifest/provider, magnet/infoHash, endereço de
  servidor, caminho local, código de pareamento e respostas externas.
- Ativos: conta, biblioteca, progresso, credenciais, dispositivo e rede local.
- Riscos principais: SSRF, DNS rebinding/redirect, execução de shell, exposição
  de token, conteúdo malicioso, negação de serviço e confusão entre recurso web
  e recurso que exige aplicativo/serviço.

## Decisão

1. Remover servidor, instaladores, ZIP, cliente web, UI, testes e dependência
   WebTorrent do Companion.
2. Remover scan/launcher de jogos e a rota principal de mídia pessoal.
3. Não apagar silenciosamente chaves antigas de IndexedDB/localStorage; uma
   migração/exportação explícita será tratada separadamente.
4. O player web aceita somente HTTPS validado, HLS compatível, YouTube e embeds
   com hosts permitidos.
5. O adapter Stremio não converte magnet, `infoHash` ou `.torrent` em vídeo web.
   Nesta fatia eles falham fechados. Stremio Service/deep link será uma fatia
   posterior, com contrato e testes próprios.
6. Servidores pessoais podem permanecer no inventário como opcionais, mas não
   como dependência ou onboarding principal.

## Critérios de aceite

- nenhuma referência operacional ao Companion na UI;
- `/personal-media` redireciona para Fontes;
- Settings não solicita nem persiste chaves de debrid;
- Player funciona diretamente sem sessão/cache local;
- protocolo mantém HTTPS/YouTube e rejeita magnet/infoHash/`.torrent`;
- `webtorrent` e o diretório/pacote Companion deixam package/lock/build;
- `npm audit` não mantém a cadeia high atual;
- typecheck, suíte completa, build e E2E passam;
- dados legados não são apagados pela mudança.

## Consequências

Conteúdo `notWebReady` não toca diretamente no navegador. Isso é intencional e
honesto. A futura integração com Stremio Service será opcional e separada; sem
ela, a experiência oferecerá deep link ou explicará o requisito.
