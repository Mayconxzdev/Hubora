import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures = [];
const checks = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function collect(dir, extensions = /\.(ts|tsx|mts|js|mjs|toml)$/) {
  const output = [];
  const walk = (current) => {
    for (const name of readdirSync(join(root, current))) {
      const next = join(current, name);
      const stats = statSync(join(root, next));
      if (stats.isDirectory()) walk(next);
      else if (extensions.test(name)) output.push(next);
    }
  };
  walk(dir);
  return output;
}

function check(name, condition, detail) {
  checks.push(name);
  if (!condition) failures.push(`${name}: ${detail}`);
}

const runtimeFiles = [
  ...collect('src'),
  ...collect('netlify'),
  'server.ts',
  'netlify.toml',
];
const runtime = runtimeFiles.map((path) => `\n/* ${relative(root, join(root, path))} */\n${read(path)}`).join('\n').toLowerCase();
const details = read('src/pages/Details.tsx');
const search = read('src/components/ui/GlobalSearch.tsx');
const api = read('src/services/api.ts');
const app = read('src/App.tsx');
const streamHosts = read('src/config/streamHosts.ts');
const manga = read('src/services/mangaService.ts');
const netlify = read('netlify.toml');
const gamesFunction = read('netlify/functions/_shared/games.ts');
const packageJson = JSON.parse(read('package.json'));
const envExample = read('.env.example');
const configCheck = read('netlify/functions/config-check.mts');
const publicAccountsMigration = read('supabase/migrations/003_hubora_public_accounts.sql');
const freeCatalog = read('netlify/functions/free-catalog.mts');
const providerCatalog = read('src/data/providerCatalog.ts');
const healthFull = read('netlify/functions/health-full.mts');
const server = read('server.ts');
const providerReadiness = read('docs/PROVIDER_READINESS.md');
const providerMatrix = read('docs/PROVIDER_MATRIX.md');
const security = read('SECURITY.md');
const license = read('LICENSE');

for (const host of ['vidsrc', 'multiembed', 'smashystream', 'vidlink', 'autoembed']) {
  check(`host não verificado removido: ${host}`, !runtime.includes(host), 'o marcador ainda aparece em código executável ou configuração');
}

for (const marker of ['Duração padrão', '1h 02min restantes', 'Dolby Vision', 'images.unsplash.com']) {
  check(`detalhe sem dado fictício: ${marker}`, !details.toLowerCase().includes(marker.toLowerCase()), 'o literal ainda aparece na tela de detalhes');
}

check('favorito usa ação própria', details.includes('toggleFavorite'), 'Details não usa toggleFavorite');
check('fonte é verificada antes de abrir', details.includes('verifiedAccessFor') && details.includes('accessDestination'), 'Details não usa a política central de acesso');
check('busca exige dois caracteres', search.includes('trimmed.length < 2') && api.includes('query.trim().length < 2'), 'mínimo de consulta ausente');
check('busca cancela fetches', search.includes('new AbortController()') && api.includes('options.signal'), 'AbortSignal não é propagado');
check('busca impede resposta antiga', search.includes('requestSequence') && search.includes('sequence !== requestSequence.current'), 'proteção de sequência ausente');
for (const marker of ['role="option"', 'aria-selected', 'aria-activedescendant', "event.key === 'Home'", "event.key === 'End'"]) {
  check(`autocomplete acessível: ${marker}`, search.includes(marker), 'marcador ARIA/teclado ausente');
}
check('nove categorias separadas na busca', ['movies', 'series', 'doramas', 'anime', 'manga', 'novels', 'books', 'comics', 'games'].every((key) => search.includes(`key: '${key}'`)), 'uma categoria não possui grupo próprio');
check('categoria preservada na URL', search.includes("params.set('category', category)"), 'Ver todos não preserva categoria');
check('detalhes MAL anime', api.includes("id.startsWith('mal-anime-')"), 'prefixo MAL anime sem detalhes');
check('detalhes MAL mangá', api.includes("id.startsWith('mal-manga-')"), 'prefixo MAL mangá sem detalhes');
check('detalhes AniList', api.includes("id.startsWith('anilist-')"), 'prefixo AniList sem detalhes');
check('fallback de jogo não inventa nota', !api.includes('voteAverage: 9.0') && !api.includes("genres: ['Ação', 'Aventura', 'Indie']"), 'fallback fictício de jogo reapareceu');
check('FreeToGame usa endpoint documentado', gamesFunction.includes("new URL('https://www.freetogame.com/api/games')") && gamesFunction.includes("new URL('https://www.freetogame.com/api/game')"), 'endpoints oficiais do FreeToGame ausentes');
check('FreeToGame não usa parâmetro de busca inexistente', !api.includes('freetogame.com/api/games?search=') && !gamesFunction.includes("searchParams.set('search'"), 'parâmetro search não documentado reapareceu');
check('MangaDex resolve UUID antes do feed', manga.includes('resolveMangaDexId') && manga.includes('MANGADEX_UUID'), 'resolução de identidade MangaDex ausente');
for (const route of ['/personal-media', '/community', '/duo']) {
  check(`rota não implementada removida: ${route}`, !app.includes(`path="${route}"`), 'rota ainda finge implementação ou redirect');
}
check('allowlist de iframe restrita', ['archive.org', 'www.youtube.com', 'www.youtube-nocookie.com'].every((host) => streamHosts.includes(`'${host}'`)), 'host autorizado ausente');
check('CSP alinhada à allowlist', ['https://archive.org', 'https://www.youtube.com', 'https://www.youtube-nocookie.com'].every((host) => netlify.includes(host)), 'CSP não contém a allowlist necessária');
check('Netlify publica dist', /publish\s*=\s*"dist"/.test(netlify), 'diretório de publicação não é dist');
check('Netlify usa build do projeto', /command\s*=\s*"npm run build"/.test(netlify), 'comando de build divergente');


check('versão de entrega atualizada', packageJson.version === '1.0.0', 'package.json não declara 1.0.0');
check('opções privadas não são sobrescritas pelo netlify.toml', !/VITE_(REQUIRE_AUTH|ALLOW_PUBLIC_SIGNUP|ALLOW_GUEST_MODE|ENFORCE_SERVER_ALLOWLIST)\s*=/.test(netlify), 'uma opção privada continua fixada no repositório');
for (const name of ['GOOGLE_BOOKS_API_KEY', 'VITE_REQUIRE_AUTH', 'VITE_ALLOW_PUBLIC_SIGNUP', 'VITE_ALLOW_GUEST_MODE']) {
  check(`variável documentada: ${name}`, envExample.includes(name) && configCheck.includes(name), 'variável ausente do exemplo ou do diagnóstico');
}
check('diagnóstico não devolve valores de segredo', configCheck.includes('missingRequired') && !configCheck.includes('process.env,'), 'contrato do diagnóstico de configuração inválido');
check('migration final não usa allowlist privada', !publicAccountsMigration.includes('private.allowed_emails') && !publicAccountsMigration.includes('is_hubora_allowed_user'), 'a migration ainda contém uma barreira privada');
check('migration final isola dados pessoais por dono', publicAccountsMigration.includes('auth.uid() = user_id') && publicAccountsMigration.includes('auth.uid() = id'), 'policies de propriedade ausentes');
check('Open Library exige public_scan_b', freeCatalog.includes('ia && doc.public_scan_b'), 'embed da Open Library sem evidência pública');
check('Internet Archive exige licença aberta', freeCatalog.includes('hasOpenLicense') && freeCatalog.includes('Verificar acesso e licença na origem'), 'player do Internet Archive sem prova de licença');
check('Standard Ebooks não promete feed irrestrito', providerCatalog.includes("id: 'standard-ebooks'") && providerCatalog.includes("mode: 'external-page'"), 'Standard Ebooks voltou a ser tratado como feed integrado');
for (const [name, source] of [['Netlify', healthFull], ['Express local', server]]) {
  const start = source.indexOf('async function probeSupabaseSchema');
  const block = start >= 0 ? source.slice(start, start + 1_100) : '';
  check(`Supabase secret não é enviada como JWT: ${name}`, block.includes('apikey: key') && !block.includes('Authorization: `Bearer ${key}`'), 'chave Supabase usada incorretamente como Bearer JWT');
}
check('matriz de provedores distingue diretório de integração', providerReadiness.includes('Mapeada') || providerReadiness.includes('Diretório'), 'documentação de prontidão ausente');
check('matriz única cobre o catálogo atual', providerMatrix.includes('Total: **88 fontes**') && providerMatrix.includes('| trace-moe |') && providerMatrix.includes('| tvmaze |'), 'matriz única incompleta ou desatualizada');
check('saúde valida APIs com credencial', healthFull.includes('api.themoviedb.org/3/configuration') && ['probeGoogleBooks', 'probeIgdb', 'probeRawg'].every((name) => healthFull.includes(name)), 'health-full não valida todos os provedores configuráveis');
check('licença AGPL incluída', existsSync(join(root, 'LICENSE')) && license.includes('GNU AFFERO GENERAL PUBLIC LICENSE'), 'LICENSE ausente ou incompatível');
check('guia de segurança incluído', security.includes('Variáveis `VITE_*`') && security.includes('auth.uid()'), 'SECURITY.md incompleto');

if (failures.length) {
  console.error(`Auditoria estática falhou (${failures.length}/${checks.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Auditoria estática aprovada: ${checks.length} verificações.`);
