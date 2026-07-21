import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const FORBIDDEN_ITEMS = [
  '.env',
  '.env.local',
  '.env.production',
  'node_modules.tmp',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
];

console.log('🔍 Verificando ausência de arquivos proibidos e resíduos na raiz do projeto...');

let errors = 0;
for (const item of FORBIDDEN_ITEMS) {
  const itemPath = path.join(ROOT_DIR, item);
  if (fs.existsSync(itemPath) && item === '.env') {
    console.log(`ℹ️ [INFO] Arquivo .env detectado para desenvolvimento local (ignorado pelo .gitignore).`);
  } else if (fs.existsSync(itemPath) && item !== '.env') {
    console.error(`❌ [ERRO DE PACOTE] Arquivo/diretório proibido encontrado: ${item}`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`❌ Falha na verificação de empacotamento limpo. Encontrados ${errors} itens proibidos.`);
  process.exit(1);
} else {
  console.log('✅ Verificação concluída. Nenhuns resíduos ou artefatos não permitidos foram encontrados.');
}
