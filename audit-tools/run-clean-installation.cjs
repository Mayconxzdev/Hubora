const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

const rootDir = path.resolve(__dirname, '..');
const cleanRunDir = path.join(rootDir, 'audit', '03-clean-run');

const tmpDir = path.join(os.tmpdir(), `hubora-clean-audit-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

console.log(`Copying clean workspace to ${tmpDir}...`);

function copyClean(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'audit' || entry.name === '.tempmediaStorage') {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyClean(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyClean(rootDir, tmpDir);

console.log('Executing npm ci in clean environment...');

const startTime = new Date().toISOString();
const startMs = Date.now();

const result = spawnSync('npm', ['ci'], {
  cwd: tmpDir,
  shell: true,
  encoding: 'utf8'
});

const endMs = Date.now();
const endTime = new Date().toISOString();
const durationMs = endMs - startMs;

fs.writeFileSync(path.join(cleanRunDir, 'npm-ci.stdout.log'), result.stdout || '');
fs.writeFileSync(path.join(cleanRunDir, 'npm-ci.stderr.log'), result.stderr || '');

const jsonResult = {
  command: 'npm ci',
  directory: tmpDir,
  startTime,
  endTime,
  durationMs,
  durationSeconds: Number((durationMs / 1000).toFixed(2)),
  exitCode: result.status,
  status: result.status === 0 ? 'PASSOU' : 'FALHOU',
  nodeVersion: process.version,
  npmVersion: spawnSync('npm', ['--version'], { shell: true, encoding: 'utf8' }).stdout.trim(),
  observations: result.status === 0
    ? 'npm ci foi concluído com sucesso no ambiente limpo reproduzível.'
    : `npm ci falhou com exit code ${result.status}.`
};

fs.writeFileSync(path.join(cleanRunDir, 'npm-ci.result.json'), JSON.stringify(jsonResult, null, 2));

// Clean up temp directory
try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch {}

console.log(`Clean run finished in ${jsonResult.durationSeconds}s with exit code ${result.status}`);
