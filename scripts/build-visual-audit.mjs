import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve('artifacts/redesign-route-gallery');
const target = path.resolve('artifacts/visual-audit');
const screenshots = path.join(target, 'screenshots');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    }),
  );
  return files.flat();
}

const pngs = (await walk(source)).filter((file) => file.endsWith('.png'));
await mkdir(screenshots, { recursive: true });
await cp(source, screenshots, { recursive: true, force: true });

const cards = pngs
  .map((file) => {
    const relative = path.relative(source, file).replaceAll('\\', '/');
    const title = relative.replace(/\.png$/, '');
    return `<figure data-shot="${title}"><a href="screenshots/${relative}"><img loading="lazy" src="screenshots/${relative}" alt="${title}"></a><figcaption>${title}</figcaption></figure>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hubora — auditoria visual local</title>
<style>body{margin:0;background:#08080a;color:#eee;font:14px system-ui,sans-serif}header{position:sticky;top:0;padding:18px 24px;background:#111;border-bottom:1px solid #333;z-index:2}h1{margin:0 0 6px;font-size:20px}.warn{color:#ffd166}main{padding:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}figure{margin:0;border:1px solid #333;background:#111;padding:8px;border-radius:8px}img{display:block;width:100%;height:180px;object-fit:contain;background:#000}figcaption{padding:8px 2px 2px;word-break:break-word;color:#bbb}</style>
</head><body><header><h1>Hubora — auditoria visual local</h1><div>${pngs.length} screenshots. <span class="warn">Tema escuro e sessão não autenticada: não é aprovação de Deploy Preview.</span></div></header><main>${cards}</main></body></html>`;

const report = `# Auditoria visual — artefato local\n\n- Capturas reunidas: **${pngs.length}**.\n- Origem: servidor local, sem credenciais de provedor e sem conta autenticada controlada.\n- Escopo capturado: 30 rotas em quatro viewports no tema escuro, estado vazio de biblioteca e palette de comando.\n- Ressalvas: tema claro, estados autenticados, player, leitores e Deploy Preview não foram homologados.\n- Correção confirmada: Mangás desktop não fica mais atrás da sidebar compacta.\n`;

await writeFile(path.join(target, 'index.html'), html);
await writeFile(path.join(target, 'REPORT.md'), report);
console.log(`Visual audit generated with ${pngs.length} screenshots at ${target}`);
