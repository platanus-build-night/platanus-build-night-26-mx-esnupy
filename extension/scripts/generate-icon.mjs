/**
 * Genera iconos Priora (P sobre squircle charcoal, fondo transparente).
 *
 *   node extension/scripts/generate-icon.mjs
 *   node extension/scripts/generate-icon.mjs --size 1000 --out project-logo.png
 */
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const BG = [55, 53, 47, 255]; // #37352f
const FG = [255, 255, 255, 255];

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

const parseArgs = () => {
  const args = process.argv.slice(2);
  let size = 128;
  let out = join(__dirname, "../icons/icon128.png");

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--size" && args[i + 1]) size = Number(args[++i]);
    if (args[i] === "--out" && args[i + 1]) out = resolve(repoRoot, args[++i]);
  }

  return { size, out };
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data) => {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const combined = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(combined));
  return Buffer.concat([len, combined, crc]);
};

const generatePng = (size, outPath) => {
  const margin = Math.round(size * 0.125);
  const radius = Math.round(size * 0.172);
  const cx = size / 2;
  const cy = size / 2 + size * 0.016;
  const scaleX = size * 0.219;
  const scaleY = size * 0.266;

  const inRoundedRect = (x, y) => {
    const left = margin;
    const right = size - margin - 1;
    const top = margin;
    const bottom = size - margin - 1;
    if (x < left || x > right || y < top || y > bottom) return false;

    if (x < left + radius && y < top + radius) {
      return (x - (left + radius)) ** 2 + (y - (top + radius)) ** 2 <= radius ** 2;
    }
    if (x > right - radius && y < top + radius) {
      return (x - (right - radius)) ** 2 + (y - (top + radius)) ** 2 <= radius ** 2;
    }
    if (x < left + radius && y > bottom - radius) {
      return (x - (left + radius)) ** 2 + (y - (bottom - radius)) ** 2 <= radius ** 2;
    }
    if (x > right - radius && y > bottom - radius) {
      return (x - (right - radius)) ** 2 + (y - (bottom - radius)) ** 2 <= radius ** 2;
    }
    return true;
  };

  const inLetterP = (x, y) => {
    const sx = (x - cx) / scaleX;
    const sy = (y - cy) / scaleY;
    if (sx < -0.42 || sx > 0.42 || sy < -0.95 || sy > 0.95) return false;

    const stem = sx >= -0.42 && sx <= -0.18;
    const bowlTop = sy >= -0.95 && sy <= 0.05 && sx >= -0.18 && sx <= 0.38;
    const bowlMid = sy >= -0.05 && sy <= 0.05 && sx >= -0.18 && sx <= 0.28;
    const bowlOuter =
      sy >= -0.95 &&
      sy <= 0.05 &&
      sx > 0.28 &&
      sx <= 0.42 &&
      (sy - 0.05) ** 2 + (sx - 0.28) ** 2 <= 0.16;

    return stem || bowlTop || bowlMid || bowlOuter;
  };

  const pixels = Buffer.alloc(size * (1 + size * 4));

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4) + 1;
    pixels[rowStart - 1] = 0;
    for (let x = 0; x < size; x++) {
      const i = rowStart + x * 4;
      const onCard = inRoundedRect(x, y);
      const onLetter = onCard && inLetterP(x, y);
      const color = onLetter ? FG : onCard ? BG : [0, 0, 0, 0];
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = color[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(pixels);
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);

  writeFileSync(outPath, png);
  console.log(`Icono generado (${size}px): ${outPath}`);
};

const { size, out } = parseArgs();
generatePng(size, out);
