import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const fixes = [
  ['\u00e2\u0080\u0094', '\u2014'],
  ['\u00e2\u0080\u0099', '\u2019'],
  ['\u00e2\u0080\u009c', '\u201c'],
  ['\u00e2\u0080\u009d', '\u201d'],
  ['\u00e2\u0086\u0092', '\u2192'],
  ['\u00e2\u0082\u00b9', '\u20b9'],
  ['\u00e2\u0080\u00a6', '\u2026'],
  ['\u00e2\u0094\u0080', '\u2500'],
  ['\u00e2\u0089\u00a4', '\u2264'],
  ['\u00e2\u0089\u00a5', '\u2265'],
  ['\u00e2\u0080\u0093', '\u2013'],
  ['\u00f0\u009f\u0094\u00a1', '\uD83D\uDCE1'],
  ['\u00e2\u009c\u0085', '\u2705'],
  ['\u00e2\u008c\u0086', '\u274c'],
  ['\u00f0\u009f\u009a\u0080', '\uD83D\uDE80'],
  ['\u00f0\u009f\u0094\u00a4', '\uD83D\uDCE4'],
  ['\u00f0\u009f\u0094\u0084', '\uD83D\uDD04'],
  ['\u00f0\u009f\u0094\u008d', '\uD83D\uDD0D'],
];

function walk(dir) {
  readdirSync(dir).forEach(f => {
    const full = join(dir, f);
    if (statSync(full).isDirectory() && !['node_modules', '.git'].includes(f)) walk(full);
    else if (/\.(tsx?|jsx?|css|html)$/.test(f)) {
      let content = readFileSync(full, 'utf8');
      let changed = false;
      fixes.forEach(([bad, good]) => {
        if (content.includes(bad)) { content = content.split(bad).join(good); changed = true; }
      });
      if (changed) { writeFileSync(full, content, 'utf8'); console.log('Fixed:', full); }
    }
  });
}

walk('./src');
console.log('Done!');
