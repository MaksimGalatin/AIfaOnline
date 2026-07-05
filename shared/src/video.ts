import { spawn } from "node:child_process";
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Combine a still image + audio (wav) into a square mp4 "living card" via ffmpeg. */
export async function makeVideoCard(image: Buffer, audioWav: Buffer, maxSec = 45): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "card-"));
  const img = join(dir, "i.png"), aud = join(dir, "a.wav"), out = join(dir, "o.mp4");
  try {
    await writeFile(img, image); await writeFile(aud, audioWav);
    await new Promise<void>((res, rej) => {
      const p = spawn("ffmpeg", ["-y", "-loop", "1", "-i", img, "-i", aud,
        "-c:v", "libx264", "-tune", "stillimage", "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p", "-vf", "scale=720:720:force_original_aspect_ratio=increase,crop=720:720",
        "-shortest", "-t", String(maxSec), out]);
      let err = ""; p.stderr.on("data", (d) => (err += d));
      p.on("error", rej);
      p.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c + ": " + err.slice(-180)))));
    });
    return await readFile(out);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
