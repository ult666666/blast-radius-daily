import { inflateSync } from 'node:zlib';

/** Decode the 8-bit, non-interlaced RGB or RGBA PNGs that Playwright screenshots use. */
export function decodePng(png: Buffer): {
  width: number;
  height: number;
  rgba: Buffer;
} {
  if (png.readUInt32BE(0) !== 0x89504e47) throw new Error('Not a PNG');
  let offset = 8,
    width = 0,
    height = 0,
    channels = 0;
  const chunks: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0 || ![2, 6].includes(data[9]!))
        throw new Error('Unsupported PNG layout');
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') chunks.push(data);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const rgba = Buffer.alloc(width * height * 4);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels]! : 0;
      const b = previous[x]!;
      const c = x >= channels ? previous[x - channels]! : 0;
      const p = a + b - c;
      const paeth =
        Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c)
          ? a
          : Math.abs(p - b) <= Math.abs(p - c)
            ? b
            : c;
      const predictor = [0, a, b, (a + b) >> 1, paeth][filter] ?? 0;
      row[x] = (line[x]! + predictor) & 0xff;
    }
    for (let x = 0; x < width; x++)
      for (let k = 0; k < 4; k++)
        rgba[(y * width + x) * 4 + k] =
          k < channels ? row[x * channels + k]! : 255;
    previous = row;
  }
  return { width, height, rgba };
}
