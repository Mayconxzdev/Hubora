# Hubora Companion para Windows

O Companion adiciona cache progressivo, limpeza automática, HLS, progresso e launchers ao Hubora hospedado no Netlify.

## Instalar

1. Instale Node.js 22 ou superior.
2. Extraia `Hubora-Companion-Windows.zip`.
3. Execute `install-windows.ps1` no PowerShell.
4. Informe a URL do seu Hubora no Netlify.
5. Aceite acesso na rede local se quiser usar o Android.
6. Copie o código de seis dígitos e conclua o pareamento em **Fontes e Companion**.

O instalador copia `server.mjs` para `%LOCALAPPDATA%\Hubora\Companion\app` e cria um inicializador na pasta de Inicialização do Windows.

No PC use `http://127.0.0.1:49821`. No Android conectado à mesma rede, informe `http://IP-DO-PC:49821`. Quando o Windows perguntar, permita Node.js somente em redes privadas.

## Cache

- Limite padrão: 25 GB.
- O conteúdo é recebido conforme a reprodução avança.
- Ao parar, o progresso é salvo e a sessão recebe uma data de limpeza.
- Após 10 minutos, os temporários são removidos.
- Se o limite for excedido, sessões paradas mais antigas saem primeiro.

Variáveis opcionais:

- `HUBORA_ALLOWED_ORIGINS`: URL do Netlify e outras origens permitidas, separadas por vírgula.
- `HUBORA_COMPANION_HOST`: `127.0.0.1` ou `0.0.0.0` para rede local.
- `HUBORA_CACHE_LIMIT_BYTES`: limite em bytes.
- `HUBORA_CACHE_CLEANUP_MS`: tempo antes da limpeza.
- `HUBORA_COMPANION_PORT`: porta, padrão `49821`.

## Segurança

- A interface precisa do código presencial de seis dígitos para receber um token aleatório.
- Cada sessão usa uma chave temporária de reprodução.
- HTTP é aceito apenas em localhost ou endereços privados da rede; origens remotas exigem HTTPS.
- O Companion só cria uma sessão depois da confirmação de acesso feita pela interface.
- O modo LAN deve ser usado apenas em uma rede privada confiável.
