// Garantiza que dist/index.d.ts sea autocontenido. Con "type": "module",
// TypeScript lo trata como ESM y, bajo moduleResolution node16/nodenext, los
// imports relativos sin extensión no resuelven (los exports pasan a `any`).
import { readFileSync, readdirSync } from 'node:fs';

const file = 'dist/index.d.ts';
const relative = /\bfrom\s+['"]\.{1,2}\//;
const bad = readFileSync(file, 'utf8')
  .split('\n')
  .filter((line) => relative.test(line));

if (bad.length > 0) {
  console.error(`${file} contiene imports relativos:\n${bad.join('\n')}`);
  process.exit(1);
}

const extra = readdirSync('dist').filter((n) => n.endsWith('.d.ts') && n !== 'index.d.ts');
if (extra.length > 0) {
  console.error(`Declaraciones sueltas en dist (¿se reintrodujo tsc?): ${extra.join(', ')}`);
  process.exit(1);
}
console.log(`${file}: autocontenido`);
