import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const [, , inputPath, outputNumber] = process.argv;

if (!inputPath || !outputNumber) {
  console.error("Usage: node scripts/resize-hero-gif.mjs <input-path> <output-number>");
  process.exit(1);
}

const outDir = path.resolve("apps/web/public/hero-gifs");
await mkdir(outDir, { recursive: true });

const outPath = path.join(outDir, `${outputNumber}.jpg`);

await sharp(inputPath)
  .resize({ width: 400, height: 400, fit: "cover" })
  .jpeg({ quality: 82 })
  .toFile(outPath);

console.log(outPath);
