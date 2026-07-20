# Relatório de entrega — Hubora 9.0

## Direção escolhida

A interface final combina C e D:

- da alternativa C: espaço, legibilidade, branco/preto verdadeiros e redução de ruído;
- da alternativa D: categorias imediatas e quatro caminhos de decisão;
- do Hubora: uma obra universal que reúne identidade, progresso e opções de acesso.

O início deixou de ser uma prateleira infinita. A sequência agora é: escolher categoria ou intenção → receber uma recomendação explicada → abrir a obra → consultar fontes.

## Arquitetura de fontes

Foram mapeadas 96 fontes em dez categorias. Cada registro declara se fornece metadados, arquivo, player, servidor, página externa, manifesto ou launcher. Isso impede que IMDb/TMDB sejam tratados como vídeo e que uma página externa seja apresentada como reprodução interna.

O protocolo `hubora-provider/v1` amplia o modelo `catalog/meta/stream/subtitles` do Stremio para leitura, capítulos, arquivos, áudio, progresso, disponibilidade, launcher e saúde. Manifestos compatíveis com Stremio continuam aceitos para URLs diretas autorizadas.

Sites sem API estável/documentada não receberam scraping disfarçado. Eles podem ser representados por uma página externa ou por um manifesto administrado pelo proprietário quando houver autorização e endpoints utilizáveis.

## Companion

O Companion é um servidor Node sem dependências de runtime. Ele:

- escuta em localhost ou, opcionalmente, na rede privada;
- pareia por código de seis dígitos e token;
- faz proxy progressivo de vídeo e HLS;
- grava intervalos/segmentos conforme a reprodução;
- salva progresso;
- limita o cache a 25 GB;
- agenda a remoção da sessão dez minutos depois de parar;
- abre protocolos de launchers permitidos no Windows.

O instalador pergunta a URL do Netlify e se o Android deve acessar pela rede local.

## Segurança e segredos

As credenciais enviadas pelo usuário não foram incorporadas. A secret key Supabase, segredo IGDB e chave/token TMDB expostos devem ser revogados. O cliente recebe apenas variáveis `VITE_` publicáveis; segredos novos ficam nas Netlify Functions.

Não foram implementados torrent, magnet, resolvedores piratas, contorno de DRM nem scraping de streaming comercial. O Hubora trabalha com mídia pessoal, fontes abertas, players oficiais, páginas externas e manifestos de origens autorizadas.

## Resultado de qualidade

- 39 testes Vitest aprovados em 16 arquivos.
- TypeScript e build de produção aprovados.
- PWA/service worker gerados.
- Companion exercitado como processo real.
- Playwright desktop/Android e inspeção visual executados.

O pacote está pronto para configurar no Netlify e começar o teste privado com suas credenciais novas.
