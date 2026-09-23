import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT_DIR = process.cwd();
const PACKAGE_CONTENTS_DIR = path.join(ROOT_DIR, 'artifacts');
const PACKAGE_CONTENTS_PATH = path.join(PACKAGE_CONTENTS_DIR, 'PACKAGE_CONTENTS.md');

const FORBIDDEN_PATTERNS = [
  /\.env(\.local)?$/,
  /node_modules/,
  /dist/,
  /coverage/,
  /test-results/,
  /playwright-report/,
  /\.log$/,
  /\.tmp$/,
];

function isForbidden(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  if (relativePath.replace(/\\/g, '/') === 'artifacts/PACKAGE_CONTENTS.md') {
    return true;
  }
  if (relativePath.startsWith('.env') && relativePath !== '.env.example') {
    return true;
  }
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function getFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function scanDir(dirPath, fileList = []) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    const relativePath = path.relative(ROOT_DIR, fullPath);

    if (isForbidden(fullPath)) {
      console.warn(`[IGNORED FORBIDDEN] ${relativePath}`);
      continue;
    }

    if (item.isDirectory()) {
      if (item.name.startsWith('.') && item.name !== '.agents') continue;
      scanDir(fullPath, fileList);
    } else if (item.isFile()) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

function main() {
  console.log('📦 Iniciando verificação e empacotamento de release do Hubora...');
  if (!fs.existsSync(PACKAGE_CONTENTS_DIR)) {
    fs.mkdirSync(PACKAGE_CONTENTS_DIR, { recursive: true });
  }

  const allFiles = scanDir(ROOT_DIR);
  const packageContents = [];

  for (const filePath of allFiles) {
    const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
    const hash = getFileHash(filePath);
    const stat = fs.statSync(filePath);
    packageContents.push({ path: relPath, size: stat.size, sha256: hash });
  }

  const contentsMarkdown = [
    '# Inventário de Conteúdo do Pacote (PACKAGE_CONTENTS.md)',
    '',
    `Data do empacotamento: ${new Date().toISOString()}`,
    `Total de arquivos válidos no release: ${packageContents.length}`,
    '',
    '| Caminho do Arquivo | Tamanho (Bytes) | SHA-256 Checksum |',
    '| :--- | :--- | :--- |',
    ...packageContents.map((f) => `| \`${f.path}\` | ${f.size} | \`${f.sha256.substring(0, 16)}...\` |`),
  ].join('\n');

  fs.writeFileSync(PACKAGE_CONTENTS_PATH, contentsMarkdown, 'utf8');
  console.log(`✅ Inventário do pacote gerado em artifacts/PACKAGE_CONTENTS.md (${packageContents.length} arquivos)`);
}

main();
