const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const manifestDir = path.join(rootDir, 'audit', '01-manifest');

function getSha256(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch {
    return 'ERR_READ_HASH';
  }
}

function categorizeFile(relPath) {
  const lower = relPath.toLowerCase().replace(/\\/g, '/');
  if (lower.startsWith('src/tests/') || lower.startsWith('tests/')) return 'testes';
  if (lower.startsWith('src/')) {
    if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(lower)) return 'assets';
    return 'código-fonte';
  }
  if (lower.startsWith('public/')) return 'assets';
  if (lower.startsWith('audit/')) return 'arquivos gerados';
  if (lower.startsWith('audit-tools/')) return 'configuração';
  if (lower.startsWith('artifacts/')) return 'artefatos';
  if (lower.startsWith('docs/')) return 'documentação';
  if (lower.startsWith('dist/')) return 'build';
  if (/\.md$/i.test(lower)) return 'documentação';
  if (/\.(json|config\.[jt]s|tsconfig.*|env.*|gitignore|eslint.*)$/i.test(lower)) return 'configuração';
  return 'outro';
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const relPath = path.relative(rootDir, filePath);
    const relNorm = relPath.replace(/\\/g, '/');

    if (relNorm.startsWith('node_modules') || relNorm.startsWith('.git') || relNorm.startsWith('.tempmediaStorage')) {
      continue;
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, fileList);
    } else {
      fileList.push({
        path: relNorm,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        sha256: getSha256(filePath),
        category: categorizeFile(relNorm)
      });
    }
  }
  return fileList;
}

const allFiles = walkDir(rootDir);

// JSON Manifest
fs.writeFileSync(path.join(manifestDir, 'file-manifest.json'), JSON.stringify(allFiles, null, 2));

// CSV Manifest
const csvLines = ['path,size,mtime,sha256,category'];
allFiles.forEach(f => {
  csvLines.push(`"${f.path}",${f.size},"${f.mtime}","${f.sha256}","${f.category}"`);
});
fs.writeFileSync(path.join(manifestDir, 'file-manifest.csv'), csvLines.join('\n'));

// SHA-256 Text List
const shaLines = allFiles.map(f => `${f.sha256}  ${f.path}`);
fs.writeFileSync(path.join(manifestDir, 'file-manifest.sha256'), shaLines.join('\n'));

// Project Trees
function buildTreeString(dir, prefix = '') {
  let result = '';
  const files = fs.readdirSync(dir).filter(f => f !== 'node_modules' && f !== '.git' && f !== '.tempmediaStorage');
  files.forEach((f, idx) => {
    const isLast = idx === files.length - 1;
    const filePath = path.join(dir, f);
    const stat = fs.statSync(filePath);
    const pointer = isLast ? '└── ' : '├── ';
    result += `${prefix}${pointer}${f}${stat.isDirectory() ? '/' : ''}\n`;
    if (stat.isDirectory()) {
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      result += buildTreeString(filePath, newPrefix);
    }
  });
  return result;
}

fs.writeFileSync(path.join(manifestDir, 'project-tree.txt'), buildTreeString(rootDir));
if (fs.existsSync(path.join(rootDir, 'src'))) {
  fs.writeFileSync(path.join(manifestDir, 'source-tree.txt'), buildTreeString(path.join(rootDir, 'src')));
}
if (fs.existsSync(path.join(rootDir, 'artifacts'))) {
  fs.writeFileSync(path.join(manifestDir, 'artifacts-tree.txt'), buildTreeString(path.join(rootDir, 'artifacts')));
}

// Config tree
const configFiles = allFiles.filter(f => f.category === 'configuração').map(f => `${f.sha256}  ${f.path}`);
fs.writeFileSync(path.join(manifestDir, 'config-tree.txt'), configFiles.join('\n'));

// Key hashes
const keyFiles = [
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  'src/App.tsx',
  'src/main.tsx',
  'server.ts'
];

const keyHashes = keyFiles.map(f => {
  const full = path.join(rootDir, f);
  return {
    file: f,
    exists: fs.existsSync(full),
    sha256: fs.existsSync(full) ? getSha256(full) : 'NOT_FOUND'
  };
});

fs.writeFileSync(path.join(manifestDir, 'key-files-hashes.json'), JSON.stringify(keyHashes, null, 2));

console.log(`Manifest created with ${allFiles.length} files.`);
