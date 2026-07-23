const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const cmdDir = path.join(rootDir, 'audit', '04-commands');

const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const scripts = pkg.scripts || {};

fs.writeFileSync(path.join(cmdDir, 'package-scripts.json'), JSON.stringify(scripts, null, 2));

let scriptsMd = `# Package Scripts Inventory\n\n| Script | Command |\n|---|---|\n`;
for (const [name, cmd] of Object.entries(scripts)) {
  scriptsMd += `| \`${name}\` | \`${cmd}\` |\n`;
}
fs.writeFileSync(path.join(cmdDir, 'package-scripts.md'), scriptsMd);

// Commands to test
const commandsToRun = [
  { name: 'typecheck', cmd: 'npm', args: ['run', 'typecheck'] },
  { name: 'lint', cmd: 'npm', args: ['run', 'lint'] },
  { name: 'test', cmd: 'npx', args: ['vitest', 'run', '--reporter=json', '--outputFile=audit/05-tests/unit/results.json'] },
  { name: 'build', cmd: 'npm', args: ['run', 'build'] }
];

commandsToRun.forEach(({ name, cmd, args }) => {
  console.log(`Executing ${name}...`);
  const startTime = new Date().toISOString();
  const startMs = Date.now();

  const res = spawnSync(cmd, args, { cwd: rootDir, shell: true, encoding: 'utf8' });

  const endMs = Date.now();
  const endTime = new Date().toISOString();
  const durationMs = endMs - startMs;

  const safeName = name.replace(/[:\/]/g, '_');
  fs.writeFileSync(path.join(cmdDir, `${safeName}.stdout.log`), res.stdout || '');
  fs.writeFileSync(path.join(cmdDir, `${safeName}.stderr.log`), res.stderr || '');

  const resultObj = {
    command: `${cmd} ${args.join(' ')}`,
    directory: rootDir,
    startTime,
    endTime,
    durationMs,
    durationSeconds: Number((durationMs / 1000).toFixed(2)),
    exitCode: res.status,
    status: res.status === 0 ? 'PASSOU' : 'FALHOU',
    version: process.version
  };

  fs.writeFileSync(path.join(cmdDir, `${safeName}.result.json`), JSON.stringify(resultObj, null, 2));
});

console.log('Package scripts execution completed.');
