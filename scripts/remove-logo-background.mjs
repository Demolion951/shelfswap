/**
 * Makes near-uniform light background pixels transparent (flat export from WhatsApp, etc.).
 * Writes: public/brand/logo.png
 *
 * Usage:
 *   node scripts/remove-logo-background.mjs
 *     → reads branding/logo-source.png (replace that file when the logo changes)
 *   node scripts/remove-logo-background.mjs <path/to/other.png>
 *
 * Location: scripts/remove-logo-background.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "brand", "logo.png");
const DEFAULT_SOURCE = path.join(ROOT, "branding", "logo-source.png");

function main() {
  const input = process.argv[2]?.trim() || DEFAULT_SOURCE;
  if (!fs.existsSync(input)) {
    console.error(
      `Missing input image.\nEither add ${DEFAULT_SOURCE} or run:\n  node scripts/remove-logo-background.mjs <input.png>`,
    );
    process.exit(1);
  }

  void (async () => {
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const ch = info.channels;
    if (ch !== 4) {
      console.error("Expected RGBA");
      process.exit(1);
    }

    const sample = (x, y) => {
      const xi = Math.min(Math.max(x, 0), w - 1);
      const yi = Math.min(Math.max(y, 0), h - 1);
      const i = (yi * w + xi) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    };

    const corners = [
      sample(0, 0),
      sample(w - 1, 0),
      sample(0, h - 1),
      sample(w - 1, h - 1),
    ];
    let br = 0,
      bg = 0,
      bb = 0;
    for (const [r, g, b] of corners) {
      br += r;
      bg += g;
      bb += b;
    }
    br /= 4;
    bg /= 4;
    bb /= 4;

    const HARD = 38;
    const SOFT = 28;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const dist = Math.hypot(r - br, g - bg, b - bb);
        if (dist <= HARD) {
          data[i + 3] = 0;
        } else if (dist < HARD + SOFT) {
          const t = (dist - HARD) / SOFT;
          data[i + 3] = Math.round(data[i + 3] * Math.min(1, Math.max(0, t)));
        }
      }
    }

    const trimmed = await sharp(Buffer.from(data), {
      raw: { width: w, height: h, channels: 4 },
    })
      .trim({ threshold: 12 })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();

    await sharp(trimmed).toFile(OUT);
    const meta = await sharp(trimmed).metadata();
    console.log("Wrote", OUT, `${meta.width}x${meta.height} (trimmed)`);
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

main();
