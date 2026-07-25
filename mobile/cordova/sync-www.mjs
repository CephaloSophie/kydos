// Copie mobile/dist → mobile/cordova/www (généré à chaque build).
import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
const www = join(here, 'www');
if (!existsSync(dist)) {
  console.error('mobile/dist introuvable — lance d\'abord: npm --workspace belote-mobile run build');
  process.exit(1);
}
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
cpSync(dist, www, { recursive: true });
console.log('cordova/www/ synchronisé depuis mobile/dist ✔');
