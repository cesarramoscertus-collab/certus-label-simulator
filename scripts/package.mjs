// Zips dist/ into release/certus-label-investigation-webobject.zip for Storyline / Rise / LMS upload.
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'release');
mkdirSync(out, { recursive: true });
const zip = resolve(out, 'certus-label-investigation-webobject.zip');
if (existsSync(zip)) rmSync(zip);
if (process.platform === 'win32') {
  execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${resolve(root, 'dist')}\*' -DestinationPath '${zip}'"`, { stdio: 'inherit' });
} else {
  execSync(`cd "${resolve(root, 'dist')}" && zip -r "${zip}" .`, { stdio: 'inherit' });
}
console.log('Packaged ->', zip);
