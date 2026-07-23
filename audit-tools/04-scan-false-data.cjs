const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const auditDataDir = path.join(rootDir, 'audit', '10-data-integrity');

fs.mkdirSync(auditDataDir, { recursive: true });

const searchTerms = [
  '2024',
  '4K',
  'Dolby Vision',
  '1h02min',
  '15.6 GB',
  '1080p HD',
  'HD Multi-idiomas',
  'Legendas PT-BR',
  'unsplash.com'
];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (/\.(tsx|ts|js|jsx|json)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = getAllFiles(srcDir);
const findings = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    searchTerms.forEach(term => {
      if (line.includes(term)) {
        // Auto-classification
        let classification = 'SUSPEITO';
        if (term === '2024' && file.includes('Footer')) classification = 'LEGÍTIMO COM PROVA'; // Footer copyright year
        else if (term === 'unsplash.com') classification = 'FALSO EM PRODUÇÃO'; // Generic image fallback
        else if (term === '4K' || term === 'Dolby Vision' || term === '1h02min' || term === '15.6 GB') {
          // Check if it's returning hardcoded string in a component
          if (line.includes('return') || line.includes('span') || line.includes('div')) {
            classification = 'FALSO EM PRODUÇÃO';
          }
        }

        findings.push({
          file: file.replace(rootDir, ''),
          line: index + 1,
          term,
          context: line.trim(),
          classification
        });
      }
    });
  });
});

fs.writeFileSync(path.join(auditDataDir, 'suspicious-values.json'), JSON.stringify(findings, null, 2));

let mdReport = '# Relatório de Dados Falsos e Valores Fixos (Honesto)\n\n';
mdReport += '| Arquivo | Linha | Termo | Contexto | Classificação |\n';
mdReport += '|---|---|---|---|---|\n';

findings.forEach(f => {
  mdReport += `| ${f.file} | ${f.line} | \`${f.term}\` | \`${f.context.replace(/\|/g, '\\|')}\` | **${f.classification}** |\n`;
});

fs.writeFileSync(path.join(auditDataDir, 'report.md'), mdReport);
console.log('False data scan completed.');
