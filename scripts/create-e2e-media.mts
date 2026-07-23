import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const assetDirectory = resolve('.playwright/assets');
const output = resolve(assetDirectory, 'player-test.webm');
mkdirSync(assetDirectory, { recursive: true });

if (!existsSync(output) || statSync(output).size < 10_000) {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=24',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
    '-t', '45', '-c:v', 'libvpx', '-b:v', '220k', '-c:a', 'libopus',
    '-y', output,
  ], { stdio: 'ignore' });
  if (result.error || result.status !== 0 || !existsSync(output)) {
    throw new Error('BLOCKED_ENV: ffmpeg não conseguiu gerar a mídia WebM E2E autorizada.');
  }
}
