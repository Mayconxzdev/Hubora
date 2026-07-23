const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'audit', '10-data-integrity');

const suspiciousTerms = [
  'mock', 'mocked', 'fake', 'sample', 'demo', 'placeholder', 'lorem',
  '2024', '14', '4K', 'Dolby', '75%', '1h 02min', 'Trailer Oficial',
  '02:28', '01:08', '02:35', '01:49', '1080p HD', 'HD Multi-idiomas',
  'Legendas PT-BR', 'Unsplash'
];

const foundOccurrences = [];

function scanFile(filePath) {
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  if (relPath.startsWith('node_modules') || relPath.startsWith('audit') || relPath.startsWith('.git')) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    suspiciousTerms.forEach(term => {
      if (line.toLowerCase().includes(term.toLowerCase())) {
        let classification = 'SUSPEITO';
        if (relPath.startsWith('tests/')) classification = 'TESTE';
        else if (line.includes('Unsplash') || line.includes('placeholder')) classification = 'FALLBACK ENGANOSO';
        else if (line.includes('4K') || line.includes('Dolby')) classification = 'LEGÍTIMO';
        else if (line.includes('mock')) classification = 'SUSPEITO';

        foundOccurrences.push({
          file: relPath,
          line: idx + 1,
          term,
          snippet: line.trim().substring(0, 100),
          classification
        });
      }
    });
  });
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'audit' && entry.name !== '.git') walk(full);
    } else if (/\.(ts|tsx|js|jsx|json|html|css)$/i.test(entry.name)) {
      scanFile(full);
    }
  }
}

walk(path.join(rootDir, 'src'));

// Write outputs
fs.writeFileSync(path.join(dataDir, 'suspicious-values.json'), JSON.stringify(foundOccurrences, null, 2));

const csvLines = ['file,line,term,classification,snippet'];
foundOccurrences.forEach(o => {
  csvLines.push(`"${o.file}",${o.line},"${o.term}","${o.classification}","${o.snippet.replace(/"/g, '""')}"`);
});
fs.writeFileSync(path.join(dataDir, 'suspicious-values.csv'), csvLines.join('\n'));

let md = `# Data Integrity Audit Report\n\nTotal scanned occurrences: **${foundOccurrences.length}**\n\n| File | Line | Term | Classification | Snippet |\n|---|---|---|---|---|\n`;
foundOccurrences.slice(0, 50).forEach(o => {
  md += `| \`${o.file}\` | ${o.line} | \`${o.term}\` | **${o.classification}** | \`${o.snippet}\` |\n`;
});

fs.writeFileSync(path.join(dataDir, 'report.md'), md);

console.log(`Data integrity audit complete. ${foundOccurrences.length} occurrences scanned.`);
