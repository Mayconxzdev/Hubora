const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const rootDir = process.cwd();
const buildAuditDir = path.join(rootDir, 'audit', '06-build');

fs.mkdirSync(path.join(buildAuditDir, 'original'), { recursive: true });
fs.mkdirSync(path.join(buildAuditDir, 'extracted-source-zip'), { recursive: true });

function runBuild(cwd, outputDir) {
  const startTime = new Date();
  const result = spawnSync('npm run build', { cwd, shell: true, encoding: 'utf-8' });
  const duration = new Date().getTime() - startTime.getTime();

  fs.writeFileSync(path.join(outputDir, 'build.stdout.log'), result.stdout || '');
  fs.writeFileSync(path.join(outputDir, 'build.stderr.log'), result.stderr || '');
  fs.writeFileSync(
    path.join(outputDir, 'build.result.json'),
    JSON.stringify(
      {
        directory: cwd,
        exitCode: result.status,
        durationMs: duration,
      },
      null,
      2,
    ),
  );
}

console.log('Building original tree...');
runBuild(rootDir, path.join(buildAuditDir, 'original'));

// Create source zip
console.log('Creating source ZIP...');
const zipPath = path.join(os.tmpdir(), `hubora-source-${Date.now()}.zip`);
execSync(`git archive --format=zip HEAD -o "${zipPath}"`, { cwd: rootDir });

const extractDir = path.join(os.tmpdir(), `hubora-extract-${Date.now()}`);
fs.mkdirSync(extractDir, { recursive: true });

// We need a robust unzip. Node doesn't have it built-in easily without zlib streams. We can use powershell Expand-Archive on Windows
console.log('Extracting source ZIP...');
execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`);

console.log('Installing dependencies in extracted ZIP...');
spawnSync('npm ci', { cwd: extractDir, shell: true });

console.log('Building extracted source ZIP...');
runBuild(extractDir, path.join(buildAuditDir, 'extracted-source-zip'));

console.log('Reproducible builds completed.');
