import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fotosDir = path.join(rootDir, 'src', 'assets', 'fotos-inicio');
const generatedTsPath = path.join(
  rootDir,
  'src',
  'app',
  'modules',
  'inicio',
  'fotos-inicio-list.ts'
);

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg']);

async function generateManifest() {
  let entries = [];
  try {
    entries = await fs.readdir(fotosDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      await fs.mkdir(fotosDir, { recursive: true });
    } else {
      throw error;
    }
  }

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => allowedExtensions.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' }));

  const urls = files.map((name) => `assets/fotos-inicio/${encodeURIComponent(name)}`);
  const content = `export const fotosInicio = ${JSON.stringify(urls, null, 2)} as const;\n`;

  await fs.mkdir(path.dirname(generatedTsPath), { recursive: true });
  await fs.writeFile(generatedTsPath, content, 'utf8');
}

generateManifest().catch((error) => {
  console.error('Error generando manifest de fotos:', error);
  process.exitCode = 1;
});
