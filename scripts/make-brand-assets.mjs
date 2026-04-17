/**
 * Generates transparent brand assets from provided PNGs by chroma-keying the
 * beige background and trimming excess padding.
 *
 * Outputs:
 * - public/brand/logo.png  (transparent wordmark)
 * - public/brand/icon.png  (transparent S icon)
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();

const INPUT_LOGO = path.join(ROOT, "app", "logo.png");
const INPUT_ICON = path.join(ROOT, "app", "icon.png");

const OUT_DIR = path.join(ROOT, "public", "brand");
const OUT_LOGO = path.join(OUT_DIR, "logo.png");
const OUT_ICON = path.join(OUT_DIR, "icon.png");

// Your images have a very consistent beige background; use it as the key color.
const KEY = { r: 248, g: 245, b: 240 }; // ~ #f8f5f0

async function fileExists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Convert beige background to transparency.
 * We compute per-pixel distance to the key color, then map it to alpha with a soft edge
 * to avoid jagged outlines.
 */
async function makeTransparent({
  inputPath,
  outPath,
  trim = true,
  // Soft threshold range (in RGB distance units). Lower = more transparent.
  t0 = 6,
  t1 = 28,
}) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data); // copy
  const channels = info.channels; // should be 4 after ensureAlpha()
  if (channels !== 4) throw new Error(`Expected 4 channels, got ${channels}`);

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];

    // Cheaper than euclidean; works fine for a flat background.
    const d = Math.max(
      Math.abs(r - KEY.r),
      Math.abs(g - KEY.g),
      Math.abs(b - KEY.b),
    );

    const a = clamp((d - t0) / (t1 - t0), 0, 1);
    out[i + 3] = Math.round(a * 255);
  }

  let img = sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });

  if (trim) img = img.trim();

  await img.png({ compressionLevel: 9 }).toFile(outPath);
}

async function run() {
  if (!(await fileExists(INPUT_LOGO)) || !(await fileExists(INPUT_ICON))) {
    throw new Error(
      `Missing inputs. Expected:\n- ${INPUT_LOGO}\n- ${INPUT_ICON}\n`,
    );
  }
  await ensureDir(OUT_DIR);

  // Wordmark: tighter edge preservation.
  await makeTransparent({ inputPath: INPUT_LOGO, outPath: OUT_LOGO, trim: true, t0: 6, t1: 24 });
  // Icon: slightly more aggressive removal.
  await makeTransparent({ inputPath: INPUT_ICON, outPath: OUT_ICON, trim: true, t0: 6, t1: 30 });

  // eslint-disable-next-line no-console
  console.log("Wrote:", OUT_LOGO, OUT_ICON);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});

