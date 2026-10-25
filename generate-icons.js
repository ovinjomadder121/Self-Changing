const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPNG(size, primaryColor, bgColor) {
  // Simple uncompressed/deflated raw pixel generator for a clean rounded icon
  const width = size;
  const height = size;
  
  // Buffer for scanlines: each line starts with filter byte 0, then 4 bytes per pixel (RGBA)
  const lineLength = 1 + width * 4;
  const rawData = Buffer.alloc(lineLength * height);

  const radius = size * 0.22;
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const lineOffset = y * lineLength;
    rawData[lineOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = lineOffset + 1 + x * 4;
      
      // Determine if inside rounded squircle
      let dx = Math.abs(x - cx);
      let dy = Math.abs(y - cy);
      let cornerDist = 0;
      let maxDist = size * 0.46;
      let inBounds = true;

      if (dx > maxDist - radius && dy > maxDist - radius) {
        let cornerX = dx - (maxDist - radius);
        let cornerY = dy - (maxDist - radius);
        cornerDist = Math.sqrt(cornerX * cornerX + cornerY * cornerY);
        if (cornerDist > radius) {
          inBounds = false;
        }
      } else if (dx > maxDist || dy > maxDist) {
        inBounds = false;
      }

      if (!inBounds) {
        // Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Inside app icon: Draw dark background (#0f172a) with emerald accent (#10b981)
      let distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      
      // Outer ring
      let isRing = Math.abs(distFromCenter - size * 0.32) < size * 0.04;
      
      // Inner checkmark: check formula
      // Checkmark points: p1(0.35, 0.52), p2(0.46, 0.63), p3(0.68, 0.38)
      let nx = x / size;
      let ny = y / size;
      let isCheck = false;
      
      // Line 1: from (0.35, 0.52) to (0.46, 0.63)
      let d1 = distToSegment(nx, ny, 0.34, 0.52, 0.46, 0.64);
      let d2 = distToSegment(nx, ny, 0.46, 0.64, 0.68, 0.36);
      if (d1 < 0.038 || d2 < 0.038) {
        isCheck = true;
      }

      if (isCheck) {
        rawData[pixelOffset] = 255;
        rawData[pixelOffset + 1] = 255;
        rawData[pixelOffset + 2] = 255;
        rawData[pixelOffset + 3] = 255;
      } else if (isRing) {
        rawData[pixelOffset] = 16;
        rawData[pixelOffset + 1] = 185;
        rawData[pixelOffset + 2] = 129;
        rawData[pixelOffset + 3] = 255;
      } else {
        // Background gradient from #0f172a to #022c22
        let t = (x + y) / (width + height);
        rawData[pixelOffset] = Math.round(15 * (1 - t) + 2 * t);
        rawData[pixelOffset + 1] = Math.round(23 * (1 - t) + 44 * t);
        rawData[pixelOffset + 2] = Math.round(42 * (1 - t) + 34 * t);
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    let l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    let t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
    let projX = x1 + t * (x2 - x1);
    let projY = y1 + t * (y2 - y1);
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  // Deflate raw pixel data
  const compressedData = zlib.deflateSync(rawData);

  // Build PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

const iconsDir = path.join(__dirname, 'icons');
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPNG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPNG(512));
console.log('Icons generated successfully!');
