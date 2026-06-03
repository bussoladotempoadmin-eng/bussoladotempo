/**
 * Gera os ícones do PWA a partir de um SVG de bússola.
 * Rode com: node scripts/gen-icons.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="168" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="14"/>
  <!-- agulha da bússola -->
  <polygon points="256,108 300,256 256,232 212,256" fill="#ffffff"/>
  <polygon points="256,404 212,256 256,280 300,256" fill="#ffffff" fill-opacity="0.45"/>
  <circle cx="256" cy="256" r="20" fill="#ffffff"/>
</svg>
`;

async function main() {
  await mkdir(PUBLIC, { recursive: true });
  const buf = Buffer.from(svg);

  await sharp(buf).resize(192, 192).png().toFile(join(PUBLIC, 'icon-192.png'));
  await sharp(buf).resize(512, 512).png().toFile(join(PUBLIC, 'icon-512.png'));
  await sharp(buf).resize(180, 180).png().toFile(join(PUBLIC, 'apple-touch-icon.png'));

  // maskable: mesmo desenho com bg full-bleed já cobre a safe zone
  await sharp(buf).resize(512, 512).png().toFile(join(PUBLIC, 'icon-maskable-512.png'));

  console.log('Ícones gerados em public/.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
