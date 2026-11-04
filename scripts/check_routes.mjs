// Fails if a page exists in the app (src/App.tsx) but middleware.ts doesn't
// know about it — that mismatch makes the live site answer "404" for a real
// page. Run by the site health workflow on every push.
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.tsx', 'utf8');
const mw = readFileSync('middleware.ts', 'utf8');
const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
const exact = new Set([...mw.match(/const KNOWN_EXACT = new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
const prefixes = [...mw.match(/const KNOWN_PREFIXES = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

const missing = routes
  .filter((r) => r !== '*')
  .map((r) => r.replace(/:[a-zA-Z]+/g, 'x').replace(/\/\*$/, '/x'))
  .filter((p) => !exact.has(p) && !prefixes.some((pre) => p.startsWith(pre)));

if (missing.length) {
  const msg = `These app pages are missing from middleware.ts (KNOWN_EXACT / KNOWN_PREFIXES), so the live site would answer 404 for them:\n${missing.map((m) => `- ${m}`).join('\n')}\n`;
  console.error(msg);
  try { (await import('node:fs')).writeFileSync('health-report.md', msg); } catch { /* ignore */ }
  process.exit(1);
}
console.log(`Page list OK: all ${routes.length} app routes are known to middleware.`);
