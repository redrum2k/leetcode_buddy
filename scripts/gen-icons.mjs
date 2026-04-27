/**
 * Pure-Node.js PNG icon generator — no native dependencies.
 * Creates solid orange-circle placeholder icons.
 */
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';

mkdirSync('public/icons', { recursive: true });

// CRC-32 table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeB, data]));
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function generateIconPng(size) {
  const pixels = new Uint8Array(size * size * 3);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 3;

      if (dist <= r) {
        pixels[idx]     = 0xf8; // R  (LeetCode orange #f89f1b)
        pixels[idx + 1] = 0x9f; // G
        pixels[idx + 2] = 0x1b; // B
      } else {
        pixels[idx]     = 0xff; // white background
        pixels[idx + 1] = 0xff;
        pixels[idx + 2] = 0xff;
      }
    }
  }

  // Build filtered image rows (filter byte 0 = None prepended to each row)
  const rowSize = size * 3;
  const raw = Buffer.alloc((rowSize + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (rowSize + 1)] = 0;
    for (let x = 0; x < rowSize; x++) {
      raw[y * (rowSize + 1) + 1 + x] = pixels[y * rowSize + x];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 48, 128]) {
  const png = generateIconPng(size);
  writeFileSync(`public/icons/icon${size}.png`, png);
  console.log(`Generated icon${size}.png (${png.length} bytes)`);
}
