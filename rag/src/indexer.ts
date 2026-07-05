// RAG indexer (Phase 3 wiring). Plan:
//  1) Pull aifa.works knowledge base (repo content / API).
//  2) Chunk -> embed via Gemini text-embedding-004 (768 dims).
//  3) Upsert into kb_documents (pgvector); skip if content_hash unchanged.
//  4) Query: embed user question -> ORDER BY embedding <=> q LIMIT k -> feed Gemini.
// Re-index trigger: content webhook or nightly cron diff by content_hash.
export interface KbChunk { source: string; chunkIdx: number; content: string; contentHash: string; }
export async function upsertChunks(_chunks: KbChunk[]): Promise<void> { /* TODO */ }
export async function search(_query: string, _k = 6): Promise<KbChunk[]> { return []; }
