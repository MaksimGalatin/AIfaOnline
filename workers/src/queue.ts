// Phase 1 stub: a DB-backed job queue (table-based) to avoid extra services.
// Phase 2/3 will process generation jobs (song/video/sticker/astro) here.
export type JobKind = "song" | "lyric_video" | "stickerpack" | "astro";
export interface Job { id: string; kind: JobKind; orderId: string; payload: unknown; }
export async function enqueue(_job: Omit<Job, "id">): Promise<void> {
  // TODO: INSERT INTO jobs (...) — placeholder.
}
export async function processNext(): Promise<void> {
  // TODO: SELECT ... FOR UPDATE SKIP LOCKED; run generator; mark done.
}
