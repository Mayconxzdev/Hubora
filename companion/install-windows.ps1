$ErrorActionPreference = 'Stop'

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    throw 'Node.js 22 ou superior não foi encontrado. Instale em https://nodejs.org antes de continuar.'
}

$version = [version]((& node --version).TrimStart('v'))
if ($version.Major -lt 22) {
    throw "Node.js 22 ou superior é necessário. Versão encontrada: $version"
}

$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $env:LOCALAPPDATA 'Hubora\Companion\app'
$startup = [Environment]::GetFolderPath('Startup')
$launcher = Join-Path $startup 'Hubora Companion.cmd'
$siteOrigin = (Read-Host 'URL do seu Hubora no Netlify (ex.: https://meu-hubora.netlify.app)').Trim().TrimEnd('/')
$lanAnswer = (Read-Host 'Permitir acesso pelo celular na mesma rede? (S/n)').Trim().ToLowerInvariant()
$lanEnabled = $lanAnswer -ne 'n'

New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item (Join-Path $source 'server.mjs') (Join-Path $target 'server.mjs') -Force

$nodePath = $node.Source
$lines = @(
    '@echo off',
    'cd /d "' + $target + '"',
    $(if ($siteOrigin) { 'set "HUBORA_ALLOWED_ORIGINS=' + $siteOrigin + '"' } else { 'rem Defina HUBORA_ALLOWED_ORIGINS com a URL do Netlify' }),
    $(if ($lanEnabled) { 'set "HUBORA_COMPANION_HOST=0.0.0.0"' } else { 'set "HUBORA_COMPANION_HOST=127.0.0.1"' }),
    'start "Hubora Companion" /min "' + $nodePath + '" server.mjs'
)
Set-Content -Path $launcher -Value $lines -Encoding ASCII

$env:HUBORA_ALLOWED_ORIGINS = $siteOrigin
$env:HUBORA_COMPANION_HOST = $(if ($lanEnabled) { '0.0.0.0' } else { '127.0.0.1' })
Start-Process -FilePath $nodePath -ArgumentList 'server.mjs' -WorkingDirectory $target
Write-Host ''
Write-Host 'Hubora Companion instalado e iniciado.' -ForegroundColor Green
Write-Host 'Ele será aberto automaticamente ao entrar no Windows.'
Write-Host 'A janela exibirá o código de pareamento para usar no Hubora.'
if ($lanEnabled) {
    Write-Host 'No celular, informe http://IP-DESTE-PC:49821 na Central de Fontes.'
    Write-Host 'Se o Windows solicitar, permita o Node.js apenas em redes privadas.'
}
