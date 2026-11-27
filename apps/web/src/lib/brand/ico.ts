/**
 * Wraps one PNG in an ICO container (a 6 byte header and a 16 byte entry,
 * then the PNG as is), so `/favicon.ico` can serve the brand icon. Search
 * engines and old browsers ask for that path without reading the page.
 */
export function pngToIco(png: Uint8Array, size: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(22 + png.length);
  const view = new DataView(out.buffer);
  view.setUint16(2, 1, true); // image type: icon
  view.setUint16(4, 1, true); // one image
  out[6] = size >= 256 ? 0 : size; // width (0 means 256)
  out[7] = size >= 256 ? 0 : size; // height
  view.setUint16(10, 1, true); // colour planes
  view.setUint16(12, 32, true); // bits per pixel
  view.setUint32(14, png.length, true); // image data size
  view.setUint32(18, 22, true); // image data offset
  out.set(png, 22);
  return out;
}
