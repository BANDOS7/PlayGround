import { readFileSync, writeFileSync } from 'node:fs';

const shell = readFileSync('src/shell.html', 'utf8');
const css = readFileSync('src/style.css', 'utf8');
const js = readFileSync('src/app.js', 'utf8');
const three = readFileSync('vendor/three.min.js', 'utf8');

function inject(haystack, needle, value) {
  const at = haystack.indexOf(needle);
  if (at < 0) throw new Error(`Missing placeholder ${needle}`);
  return haystack.slice(0, at) + value + haystack.slice(at + needle.length);
}

let out = shell;
out = inject(out, '/*__CSS__*/', css);
out = inject(out, '/*__THREE__*/', three);
out = inject(out, '/*__GAME__*/', js);
writeFileSync('index.html', out);
console.log(`index.html written: ${(out.length / 1024).toFixed(0)} KB`);
