# Validação — Hubora 9.0 Personal

Data: 20/07/2026

## Resultados executados

- `npm run typecheck`: aprovado, sem erros TypeScript.
- `npm test`: 16 arquivos, 39 testes aprovados.
- `npm run build`: aprovado; PWA e service worker gerados.
- Companion real: health, pareamento por código, token, sessão progressiva, limite de 25 GB, progresso e descarte após dez minutos aprovados.
- Diretório: 96 IDs únicos, dez categorias cobertas e modos de acesso distintos validados.
- Protocolo: manifestos Stremio e `hubora-provider/v1` testados; magnet, `.torrent` e HTTP remoto não autorizado recusados.
- Playwright: rotas, manifesto PWA, tema preto/branco, dez categorias, quatro intenções e Android sem overflow testados em Chromium.
- Inspeção visual: Home desktop, Home móvel e Central de Fontes revisadas; hierarquia, contraste e responsividade ajustados.
- Localização: catálogo TMDB em `pt-BR`, região `BR` e textos principais em português brasileiro.

## Aviso não bloqueante

O bundler informa que `hls.js` supera 500 kB minificado. Ele é carregado sob demanda somente no player HLS.

## Validações que exigem a sua infraestrutura

- Revogar as chaves expostas e cadastrar substitutas no Netlify.
- Aplicar migrations/allowlist e configurar redirects do Supabase.
- Testar a URL real do Netlify no PC e Android.
- Permitir Node.js em rede privada e validar `http://IP-DO-PC:49821` no seu roteador/dispositivos.
- Reproduzir mídia da sua origem autorizada e testar seus servidores pessoais.
- Confirmar cotas, região e disponibilidade de cada API em produção.
