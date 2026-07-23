const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const rootDir = path.resolve(__dirname, '..');
const envDir = path.join(rootDir, 'audit', '00-environment');

function runCmd(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch (err) {
    return `ERROR: ${err.message}\nSTDOUT: ${err.stdout || ''}\nSTDERR: ${err.stderr || ''}`;
  }
}

// System & Tools Versions
let gitVersion = runCmd('git --version');
let nodeVersion = process.version;
let npmVersion = runCmd('npm --version');
let viteVersion = 'unknown';
let vitestVersion = 'unknown';
let tscVersion = runCmd('npx tsc --version');
let playwrightVersion = 'unknown';

try {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  viteVersion = pkg.devDependencies?.vite || pkg.dependencies?.vite || 'unknown';
  vitestVersion = pkg.devDependencies?.vitest || pkg.dependencies?.vitest || 'unknown';
  playwrightVersion = pkg.devDependencies?.['@playwright/test'] || pkg.dependencies?.['@playwright/test'] || 'unknown';
} catch {}

const envData = {
  absolutePath: rootDir,
  localTimestamp: new Date().toISOString(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  os: `${os.type()} ${os.release()} (${os.platform()})`,
  arch: os.arch(),
  username: os.userInfo().username,
  tools: {
    git: gitVersion,
    node: nodeVersion,
    npm: npmVersion,
    tsc: tscVersion,
    vite: viteVersion,
    vitest: vitestVersion,
    playwright: playwrightVersion
  }
};

fs.writeFileSync(path.join(envDir, 'environment.json'), JSON.stringify(envData, null, 2));

const mdContent = `# Environment Audit

- **Absolute Path**: \`${envData.absolutePath}\`
- **Local Timestamp**: ${envData.localTimestamp}
- **Timezone**: ${envData.timezone}
- **OS**: ${envData.os}
- **Architecture**: ${envData.arch}
- **System User**: \`${envData.username}\`

## Tooling Versions
- **Git**: ${gitVersion}
- **Node**: ${nodeVersion}
- **npm**: ${npmVersion}
- **TypeScript**: ${tscVersion}
- **Vite**: ${viteVersion}
- **Vitest**: ${vitestVersion}
- **Playwright**: ${playwrightVersion}
`;

fs.writeFileSync(path.join(envDir, 'environment.md'), mdContent);

// Git execution
fs.writeFileSync(path.join(envDir, 'git-status.txt'), runCmd('git status --porcelain=v2 --branch'));
fs.writeFileSync(path.join(envDir, 'git-branch.txt'), runCmd('git branch --show-current'));
fs.writeFileSync(path.join(envDir, 'git-head.txt'), runCmd('git rev-parse HEAD'));
fs.writeFileSync(path.join(envDir, 'git-log.txt'), runCmd('git log -1 --format=fuller'));

let remotes = runCmd('git remote -v');
// Sanitize any token in remotes
remotes = remotes.replace(/https:\/\/[^@]+@/g, 'https://***@');
fs.writeFileSync(path.join(envDir, 'git-remotes-sanitized.txt'), remotes);

const diffStat = runCmd('git diff --stat');
const diffPatch = runCmd('git diff');
fs.writeFileSync(path.join(envDir, 'git-diff.patch'), `--- STAT ---\n${diffStat}\n\n--- PATCH ---\n${diffPatch}`);

const diffCachedStat = runCmd('git diff --cached --stat');
const diffCachedPatch = runCmd('git diff --cached');
fs.writeFileSync(path.join(envDir, 'git-diff-cached.patch'), `--- CACHED STAT ---\n${diffCachedStat}\n\n--- CACHED PATCH ---\n${diffCachedPatch}`);

console.log('Environment details collected successfully.');
