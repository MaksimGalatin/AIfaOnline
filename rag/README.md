# /rag — knowledge base + vector memory

Goal: the bot "knows everything" like the AI on aifa.works.
Store: `kb_documents` (pgvector) in our Neon Postgres — no extra service.
Embeddings: Gemini `text-embedding-004` (768d). Retrieval: cosine (`<=>`).
Updates: re-embed only chunks whose `content_hash` changed.
