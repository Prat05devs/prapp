// Run from the repo with: node scripts/prepare-campaign-images.mjs
// Preserve the client originals; generate the assets consumed by Next.js and Expo.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const webRequire = createRequire(path.join(root, 'apps/web/package.json'));
const nextRequire = createRequire(webRequire.resolve('next/package.json'));
const sharp = nextRequire('sharp');
const sources = {
  '01-business-launch': '2314D029-0801-429D-953B-EEA9B1C187F3.PNG',
  '02-cafe-event': '94EB8F8C-61BB-48C9-A3EE-F809156B39EB.PNG',
  '03-home-business': 'B3B5F6BF-EBA7-4F0C-8C1F-B82EF982C53A.PNG',
  '04-citizen-story': '7638CC25-CDF5-4D0E-ABBD-C1278D9F5A3F.PNG',
  '05-human-interest': 'EDEC66E2-76C8-42FD-A642-CF7B5D9CAD52.PNG',
  '06-family-fact-check': 'AB4C76DE-CF68-4F36-93E7-E409A8536A18.PNG',
};

for (const [directory, width] of [
  ['apps/web/public/images/campaigns', 1600],
  ['apps/mobile/assets/campaigns', 960],
]) {
  await mkdir(path.join(root, directory), { recursive: true });
  for (const [name, source] of Object.entries(sources)) {
    const output = path.join(root, directory, `${name}.webp`);
    const info = await sharp(path.join(root, 'public', source))
      .rotate()
      .resize({ width, height: (width * 9) / 16, fit: 'cover' })
      .webp({ quality: 82, effort: 6 })
      .toFile(output);
    console.log(`${directory}/${name}.webp: ${Math.round(info.size / 1024)} KB`);
  }
}
