/**
 * Generates PWA / home-screen icon sizes from branding/app-icon-source.png.
 * Writes public/brand/* and app/icon.png + app/apple-icon.png for Next.js metadata.
 *
 * Usage: node scripts/generate-app-icons.mjs [optional-input.png]
 * Location: scripts/generate-app-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_SOURCE = path.join(ROOT, "branding", "app-icon-source.png");
const BRAND_DIR = path.join(ROOT, "public", "brand");
const APP_DIR = path.join(ROOT, "app");

const OUTPUTS = [
  { size: 16, rel: "public/brand/favicon-16.png" },
  { size: 32, rel: "public/brand/favicon-32.png" },
  { size: 180, rel: "public/brand/apple-touch-icon.png" },
  { size: 192, rel: "public/brand/icon-192.png" },
  { size: 512, rel: "public/brand/icon-512.png" },
  { size: 512, rel: "public/brand/icon.png" },
  { size: 512, rel: "app/icon.png" },
  { size: 180, rel: "app/apple-icon.png" },
];

function sampleBackgroundHex(data, width, height) {
  const sample = (x, y) => {
    const xi = Math.min(Math.max(x, 0), width - 1);
    const yi = Math.min(Math.max(y, 0), height - 1);
    const i = (yi * width + xi) * 3;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const pts = [
    sample(0, 0),
    sample(width - 1, 0),
    sample(0, height - 1),
    sample(width - 1, height - 1),
  ];
  const r = Math.round(pts.reduce((s, p) => s + p[0], 0) / 4);
  const g = Math.round(pts.reduce((s, p) => s + p[1], 0) / 4);
  const b = Math.round(pts.reduce((s, p) => s + p[2], 0) / 4);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

async function writeSquareIcon(input, size, outPath) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bg = sampleBackgroundHex(data, info.width, info.height);

  await sharp(input)
    .resize(size, size, {
      fit: "contain",
      background: bg,
      position: "centre",
    })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function main() {
  const input = process.argv[2]?.trim() || DEFAULT_SOURCE;
  if (!fs.existsSync(input)) {
    console.error(`Missing icon source: ${input}`);
    process.exit(1);
  }

  fs.mkdirSync(BRAND_DIR, { recursive: true });
  fs.mkdirSync(APP_DIR, { recursive: true });

  for (const { size, rel } of OUTPUTS) {
    const out = path.join(ROOT, rel);
    await writeSquareIcon(input, size, out);
    console.log(`Wrote ${rel} (${size}x${size})`);
  }

  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const backgroundColor = sampleBackgroundHex(data, info.width, info.height);
  const metaPath = path.join(BRAND_DIR, "app-icon-meta.json");
  fs.writeFileSync(metaPath, `${JSON.stringify({ backgroundColor }, null, 2)}\n`);
  console.log("Wrote public/brand/app-icon-meta.json", backgroundColor);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
