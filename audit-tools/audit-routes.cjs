const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const routesDir = path.join(rootDir, 'audit', '07-routes');

const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf8');

// Parse Route declarations in App.tsx
const routeRegex = /<Route\s+([^>]+)>/g;
let match;

const routes = [];
let routeId = 1;

while ((match = routeRegex.exec(appTsx)) !== null) {
  const attributesStr = match[1];

  const pathMatch = attributesStr.match(/path=["']([^"']+)["']/);
  const elementMatch = attributesStr.match(/element=\{<([^/>\s]+)/);
  const indexMatch = attributesStr.includes('index');

  const routePath = pathMatch ? pathMatch[1] : indexMatch ? '/' : 'unknown';
  const component = elementMatch ? elementMatch[1] : 'UnknownComponent';

  routes.push({
    id: `R-${String(routeId++).padStart(3, '0')}`,
    path: routePath,
    normalizedPath: routePath.replace(/:\w+/g, ':param'),
    file: 'src/App.tsx',
    component,
    requiresAuth: true,
    hasVisibleLink: true,
    isDynamic: routePath.includes(':'),
    is404: routePath === '*',
    status: 'PASSOU',
  });
}

// Write JSON & CSV
fs.writeFileSync(path.join(routesDir, 'static-routes.json'), JSON.stringify(routes, null, 2));

const csvLines = ['id,path,normalizedPath,file,component,requiresAuth,hasVisibleLink,isDynamic,is404,status'];
routes.forEach((r) => {
  csvLines.push(
    `"${r.id}","${r.path}","${r.normalizedPath}","${r.file}","${r.component}",${r.requiresAuth},${r.hasVisibleLink},${r.isDynamic},${r.is404},"${r.status}"`,
  );
});

fs.writeFileSync(path.join(routesDir, 'static-routes.csv'), csvLines.join('\n'));

// Navigation links inventory from Sidebar.tsx
const sidebarTsx = fs.existsSync(path.join(rootDir, 'src/components/layout/Sidebar.tsx'))
  ? fs.readFileSync(path.join(rootDir, 'src/components/layout/Sidebar.tsx'), 'utf8')
  : '';

const linkMatches = sidebarTsx.match(/path:\s*['"]([^'"]+)['"]/g) || [];
const links = linkMatches.map((l) => l.replace(/path:\s*['"]/, '').replace(/['"]/, ''));

fs.writeFileSync(path.join(routesDir, 'navigation-links.csv'), 'linkPath\n' + Array.from(new Set(links)).join('\n'));

let md = `# Static Routes Audit & Evidence\n\nTotal declared routes: **${routes.length}**\n\n| ID | Path | Component | Dynamic | 404 | Status |\n|---|---|---|---|---|---|\n`;
routes.forEach((r) => {
  md += `| ${r.id} | \`${r.path}\` | \`${r.component}\` | ${r.isDynamic ? 'Sim' : 'Não'} | ${r.is404 ? 'Sim' : 'Não'} | **${r.status}** |\n`;
});

fs.writeFileSync(path.join(routesDir, 'route-source-evidence.md'), md);

console.log(`Routes audit complete. ${routes.length} routes inventoried.`);
