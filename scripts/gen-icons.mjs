import sharp from "sharp";
import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

// Bloom SVG — static (no animation) with background circle for maskable safe zone
function bloomSvg(size) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const scale = s / 512; // design at 512x512

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE8ED"/>
      <stop offset="100%" stop-color="#F4B8C6"/>
    </radialGradient>
    <radialGradient id="petal" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE8ED"/>
      <stop offset="100%" stop-color="#E8829A"/>
    </radialGradient>
  </defs>
  <!-- Background circle -->
  <circle cx="256" cy="256" r="256" fill="url(#bg)"/>
  <!-- Petals (bloom centered at 256,256 scaled from 180x180 origin 90,90) -->
  <g transform="translate(256,256) scale(2.56) translate(-90,-90)">
    <ellipse cx="90" cy="50" rx="22" ry="38" fill="url(#petal)" opacity="0.85"/>
    <ellipse cx="90" cy="130" rx="22" ry="38" fill="url(#petal)" opacity="0.85"/>
    <ellipse cx="50" cy="90" rx="38" ry="22" fill="url(#petal)" opacity="0.85"/>
    <ellipse cx="130" cy="90" rx="38" ry="22" fill="url(#petal)" opacity="0.85"/>
    <ellipse cx="62" cy="62" rx="26" ry="30" fill="url(#petal)" opacity="0.7" transform="rotate(-45 62 62)"/>
    <ellipse cx="118" cy="62" rx="26" ry="30" fill="url(#petal)" opacity="0.7" transform="rotate(45 118 62)"/>
    <ellipse cx="62" cy="118" rx="26" ry="30" fill="url(#petal)" opacity="0.7" transform="rotate(45 62 118)"/>
    <ellipse cx="118" cy="118" rx="26" ry="30" fill="url(#petal)" opacity="0.7" transform="rotate(-45 118 118)"/>
    <circle cx="90" cy="90" r="18" fill="#C96480"/>
    <circle cx="90" cy="90" r="10" fill="#F4B8C6"/>
  </g>
</svg>`;
}

for (const size of [192, 512]) {
  const svg = Buffer.from(bloomSvg(size));
  const outPath = path.join(publicDir, `icon-${size}.png`);
  await sharp(svg, { density: 300 })
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✓ icon-${size}.png`);
}

// Also write the SVG for use as favicon
writeFileSync(path.join(publicDir, "icon.svg"), bloomSvg(512));
console.log("✓ icon.svg");
