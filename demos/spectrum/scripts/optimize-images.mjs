import { readdirSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import sharp from 'sharp';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const outDir = join(root, 'images');
if (!existsSync(outDir)) mkdirSync(outDir);

const files = ['logo.jpg', ...readdirSync(root).filter((f) => f.startsWith('IMG') && extname(f).toLowerCase() === '.jpg')];

for (const file of files) {
  const input = join(root, file);
  const output = join(outDir, file.replace(/\.jpg$/i, '.webp'));
  const meta = await sharp(input).metadata();
  await sharp(input)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(output);
  console.log(`${file}: ${meta.width}x${meta.height} -> ${output}`);
}
