import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const children: Array<ReturnType<typeof spawn>> = [];
const directories: string[] = [];

afterEach(async () => {
  for (const child of children.splice(0)) child.kill('SIGTERM');
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('Hubora Companion', () => {
  it('pareia, cria uma sessão progressiva e agenda a limpeza em dez minutos', async () => {
    const data = await mkdtemp(join(tmpdir(), 'hubora-companion-'));
    directories.push(data);
    const port = 53000 + Math.floor(Math.random() * 8000);
    const child = spawn(process.execPath, ['companion/server.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, HUBORA_COMPANION_DATA: data, HUBORA_COMPANION_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    const code = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Companion não iniciou.')), 6_000);
      child.stdout?.on('data', (chunk) => {
        const match = String(chunk).match(/pareamento:\s*(\d{6})/i);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      child.on('exit', (status) => reject(new Error(`Companion encerrou com ${status}.`)));
    });
    const endpoint = `http://127.0.0.1:${port}`;
    const health = await fetch(`${endpoint}/v1/health`).then((response) => response.json()) as { ok: boolean; cache: { limitBytes: number; cleanupDelayMs: number } };
    expect(health.ok).toBe(true);
    expect(health.cache.limitBytes).toBe(25 * 1024 ** 3);
    expect(health.cache.cleanupDelayMs).toBe(10 * 60_000);

    const paired = await fetch(`${endpoint}/v1/pair`, { method: 'POST', headers: { origin: 'http://localhost:4173', 'content-type': 'application/json' }, body: JSON.stringify({ code }) }).then((response) => response.json()) as { token: string };
    expect(paired.token.length).toBeGreaterThan(30);
    const sessionResponse = await fetch(`${endpoint}/v1/sessions`, { method: 'POST', headers: { 'x-hubora-token': paired.token, 'content-type': 'application/json' }, body: JSON.stringify({ sourceUrl: 'https://media.example/video.mp4', title: 'Teste', kind: 'video', authorizationConfirmed: true }) });
    expect(sessionResponse.status).toBe(201);
    const session = await sessionResponse.json() as { id: string; playbackUrl: string; cleanupDelayMs: number };
    expect(session.playbackUrl).toContain(`/v1/sessions/${session.id}/stream`);
    expect(session.cleanupDelayMs).toBe(10 * 60_000);
    const stopped = await fetch(`${endpoint}/v1/sessions/${session.id}`, { method: 'DELETE', headers: { 'x-hubora-token': paired.token, 'content-type': 'application/json' }, body: JSON.stringify({ seconds: 42 }) }).then((response) => response.json()) as { deletesAt: number };
    expect(stopped.deletesAt).toBeGreaterThan(Date.now() + 9 * 60_000);
  });
});
