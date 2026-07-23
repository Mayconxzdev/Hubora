const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const auditTestsDir = path.join(rootDir, 'audit', '05-tests', 'unit');

fs.mkdirSync(auditTestsDir, { recursive: true });

console.log('Running Vitest...');

// Vitest run with reporters
const vitestCmd = `npx vitest run --reporter=verbose --reporter=json --outputFile.json="${path.join(auditTestsDir, 'results.json')}" --reporter=junit --outputFile.junit="${path.join(auditTestsDir, 'results.xml')}"`;

const result = spawnSync(vitestCmd, {
  cwd: rootDir,
  shell: true,
  encoding: 'utf-8',
});

fs.writeFileSync(path.join(auditTestsDir, 'raw-console.log'), result.stdout + '\n' + result.stderr);

// Also generate test-files.csv and test-cases.csv
try {
  const resultsJson = JSON.parse(fs.readFileSync(path.join(auditTestsDir, 'results.json'), 'utf-8'));

  let filesCsv = 'file,duration_ms,status\n';
  let casesCsv = 'file,suite,test,duration_ms,status\n';

  if (resultsJson.testResults) {
    resultsJson.testResults.forEach((fileResult) => {
      filesCsv += `${fileResult.name},${fileResult.endTime - fileResult.startTime},${fileResult.status}\n`;

      fileResult.assertionResults.forEach((assertion) => {
        casesCsv += `${fileResult.name},${assertion.ancestorTitles.join(' > ')},${assertion.title},${assertion.duration || 0},${assertion.status}\n`;
      });
    });
  }

  fs.writeFileSync(path.join(auditTestsDir, 'test-files.csv'), filesCsv);
  fs.writeFileSync(path.join(auditTestsDir, 'test-cases.csv'), casesCsv);
  console.log('Vitest audit files generated successfully.');
} catch (err) {
  console.error('Failed to parse vitest JSON output:', err);
}
