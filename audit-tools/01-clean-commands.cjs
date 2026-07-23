const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const rootDir = process.cwd();
const tempDir = path.join(os.tmpdir(), `hubora-clean-audit-v2-${Date.now()}`);

const auditCleanRunDir = path.join(rootDir, 'audit', '03-clean-run');
const auditCommandsDir = path.join(rootDir, 'audit', '04-commands');

fs.mkdirSync(auditCleanRunDir, { recursive: true });
fs.mkdirSync(auditCommandsDir, { recursive: true });

function getCommit() {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (e) {
    return 'unknown';
  }
}

const currentCommit = getCommit();

function runAndCapture(command, name, outputDir, cwd) {
  console.log(`Executing ${name}: ${command}`);
  const startTime = new Date();

  const result = spawnSync(command, {
    cwd: cwd,
    shell: true,
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 50, // 50MB
  });

  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();

  const report = {
    command,
    name,
    directory: cwd,
    commit: currentCommit,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationMs,
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error ? result.error.message : null,
  };

  fs.writeFileSync(path.join(outputDir, `${name}.result.json`), JSON.stringify(report, null, 2));
  return report;
}

try {
  console.log(`Copying clean workspace to ${tempDir}...`);
  fs.cpSync(rootDir, tempDir, {
    recursive: true,
    filter: (src) => {
      const basename = path.basename(src);
      return ![
        'node_modules',
        'dist',
        '.git',
        'artifacts',
        'audit',
        'audit-tools',
        'playwright-report',
        'test-results',
      ].includes(basename);
    },
  });

  // 1. npm ci
  runAndCapture('npm ci', 'npm-ci', auditCleanRunDir, tempDir);

  // 2. lint
  runAndCapture('npm run lint', 'lint', auditCommandsDir, tempDir);

  // 3. typecheck
  runAndCapture('npm run typecheck', 'typecheck', auditCommandsDir, tempDir);

  // 4. test
  runAndCapture('npm run test -- --run', 'test', auditCommandsDir, tempDir);

  // 5. build
  runAndCapture('npm run build', 'build', auditCommandsDir, tempDir);

  // 6. e2e
  runAndCapture('npm run test:e2e', 'e2e', auditCommandsDir, tempDir);

  console.log('Clean execution finished.');
} catch (error) {
  console.error('Failed execution:', error);
}
