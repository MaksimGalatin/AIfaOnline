// Concatenate multiple WAV buffers (same format) into one longer WAV.
function findData(buf: Buffer): { start: number; size: number } {
  let p = 12; // after RIFF....WAVE
  while (p + 8 <= buf.length) {
    const id = buf.toString("ascii", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === "data") return { start: p + 8, size };
    p += 8 + size + (size % 2);
  }
  return { start: 44, size: buf.length - 44 };
}
export function concatWav(buffers: Buffer[]): Buffer {
  if (buffers.length === 1) return buffers[0];
  const first = buffers[0];
  const fmtStart = first.indexOf("fmt ");
  const fmtChunk = first.subarray(fmtStart, fmtStart + 8 + 16); // standard 16-byte fmt
  const datas = buffers.map(findData).map((d, i) => buffers[i].subarray(d.start, d.start + d.size));
  const pcm = Buffer.concat(datas);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0); header.writeUInt32LE(4 + fmtChunk.length + 8 + pcm.length, 4); header.write("WAVE", 8);
  const dataHdr = Buffer.alloc(8); dataHdr.write("data", 0); dataHdr.writeUInt32LE(pcm.length, 4);
  return Buffer.concat([header, fmtChunk, dataHdr, pcm]);
}
