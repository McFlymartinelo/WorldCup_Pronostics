/**
 * Génère icon-192.png et icon-512.png à partir de icon.svg (via sharp si dispo, sinon skip).
 * Usage: node scripts/generate-pwa-icons.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const frontend = path.join(__dirname, '../frontend');
const svgPath = path.join(frontend, 'icon.svg');

async function main () {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('ℹ️  sharp non installé — seuls les SVG seront utilisés (npm i -D sharp pour les PNG)');
    process.exit(0);
  }

  const svg = fs.readFileSync(svgPath);
  for (const size of [192, 512]) {
    const out = path.join(frontend, `icon-${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`✅ ${path.basename(out)}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
