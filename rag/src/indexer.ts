import crypto from "crypto";
import { getAccessToken, config, pool } from "shared";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.ARWEAVE_ENCRYPTION_SECRET || "CODE-Eternal-Secret-Key-2026";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptText(text: string, customKey?: string): string {
  const key = customKey ? crypto.createHash("sha256").update(customKey).digest() : getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, "sha256");
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([salt, iv, tag, encrypted]).toString("base64");
}

export function decryptText(encryptedBase64: string, customKey?: string): string {
  try {
    const key = customKey ? crypto.createHash("sha256").update(customKey).digest() : getEncryptionKey();
    const combined = Buffer.from(encryptedBase64, "base64");
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, "sha256");
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    return encryptedBase64;
  }
}

export function hashUserKey(key: string): string {
  if (key === "__brain__") return key;
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function getEmbedding(text: string, taskType = "RETRIEVAL_QUERY"): Promise<number[] | null> {
  try {
    const token = await getAccessToken();
    const projectId = config.gemini.projectId || process.env.GCP_PROJECT_ID || "project-72844ae8-a294-4048-980";
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-embedding-001:predict`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ task_type: taskType, content: text.replace(/\s+/g, " ").trim().slice(0, 8000) }],
        parameters: { outputDimensionality: 1536 },
      }),
    });
    if (!res.ok) {
      const errTxt = await res.text();
      console.warn(`[RAG] Embedding failed: ${res.status} - ${errTxt.slice(0, 400)}`);
      return null;
    }
    const data = await res.json();
    const values = data?.predictions?.[0]?.embeddings?.values;
    if (!Array.isArray(values) || values.length === 0) return null;
    return values;
  } catch (e) {
    console.warn("[RAG] getEmbedding exception:", e);
    return null;
  }
}

export interface KbChunk {
  id?: string | number;
  source: string;
  chunkIdx?: number;
  content: string;
  contentHash?: string;
  score?: number;
}

/** Search __brain__ (CODE Eternal knowledge base in Neon pgvector). */
export async function search(query: string, k = 6): Promise<KbChunk[]> {
  return searchBrain(query, k);
}

export async function searchBrain(query: string, k = 12): Promise<KbChunk[]> {
  const vec = await getEmbedding(query, "RETRIEVAL_QUERY");
  if (!vec) return [];
  const vecLiteral = `'[${vec.join(",")}]'::halfvec`;

  // Extract keywords (words >= 4 chars, ignoring common Russian/English stopwords & conversational wrappers)
  const stopwords = new Set([
    "чтобы", "такое", "сейчас", "пожалуйста", "очень", "только", "когда", "если",
    "почему", "зачем", "этого", "один", "одна", "было", "были", "есть", "быть",
    "весь", "всех", "всему", "свой", "наша", "наши", "наших", "нашем", "нашей",
    "давай", "проверим", "любимая", "родная", "обнимаю", "крепко", "какой", "какая",
    "какие", "какую", "каком", "скажи", "честно", "процитируй", "книги", "книга",
    "книгу", "книг", "помнишь", "помню", "вопрос", "вопросы", "ответ", "ответы",
    "тобой", "мной", "нами", "нашей", "нашего", "этого", "того", "эти", "тебе",
    "тебя", "теби", "меня", "мне", "моей", "моя", "мое", "мой", "твоя", "твое",
    "твой", "твои", "твоих", "свой", "свои", "своих", "очень", "просто", "здесь",
    "этом", "эту", "этот", "также", "более", "будет", "будут", "можем", "может",
    "назад", "далее", "день", "днях", "дня", "about", "after", "all", "also",
    "and", "any", "are", "because", "been", "before", "being", "between", "both",
    "but", "by", "can", "come", "could", "did", "do", "each", "for", "from",
    "get", "got", "had", "has", "have", "here", "him", "his", "how", "if", "in",
    "into", "is", "it", "its", "just", "like", "make", "many", "me", "might",
    "more", "most", "much", "must", "my", "never", "now", "of", "on", "only",
    "or", "other", "our", "out", "over", "said", "same", "see", "should", "since",
    "some", "still", "such", "take", "than", "that", "the", "their", "them",
    "then", "there", "these", "they", "this", "those", "through", "to", "too",
    "under", "up", "very", "was", "way", "we", "well", "were", "what", "where",
    "which", "while", "who", "will", "with", "would", "you", "your"
  ]);
  const words = query
    .toLowerCase()
    .replace(/[^а-яa-z0-9]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopwords.has(w))
    .slice(0, 5);

  try {
    let res;
    if (words.length > 0) {
      const keywordFilter = words.map((w, i) => `content ILIKE $${i + 1}`).join(" OR ");
      const params = words.map((w) => `%${w}%`);
      const sql = `
        WITH candidates AS (
          (SELECT id, content, source,
                  1 - (embedding <=> ${vecLiteral}) AS sem_score,
                  0::float AS kw_bonus,
                  (CASE WHEN source LIKE 'CODE Brain:%' OR source LIKE '%Knowledge%' OR source LIKE '%Core%' OR source LIKE '%CONSTITUTION%' OR source LIKE '%CHRONOLOGY%' OR content LIKE '# %' THEN 0.15 ELSE 0 END)::float AS quality_boost
           FROM chat_memory
           WHERE user_key = '__brain__' AND embedding IS NOT NULL
           ORDER BY embedding <=> ${vecLiteral}
           LIMIT ${k * 3})
          UNION ALL
          (SELECT id, content, source,
                  1 - (embedding <=> ${vecLiteral}) AS sem_score,
                  0.25::float AS kw_bonus,
                  (CASE WHEN source LIKE 'CODE Brain:%' OR source LIKE '%Knowledge%' OR source LIKE '%Core%' OR source LIKE '%CONSTITUTION%' OR source LIKE '%CHRONOLOGY%' OR content LIKE '# %' THEN 0.15 ELSE 0 END)::float AS quality_boost
           FROM chat_memory
           WHERE user_key = '__brain__' AND embedding IS NOT NULL AND (${keywordFilter})
           ORDER BY (CASE WHEN content LIKE '# %' OR content LIKE '## %' OR content LIKE '%---%' THEN 0 ELSE 1 END), length(content) ASC
           LIMIT ${k * 5})
        ),
        deduped AS (
          SELECT id, content, source, MAX(sem_score + kw_bonus + quality_boost) as score
          FROM candidates
          GROUP BY id, content, source
        )
        SELECT id, content, source, score
        FROM deduped
        ORDER BY score DESC
        LIMIT ${k}
      `;
      res = await pool.query(sql, params);
    } else {
      const sql = `
        SELECT id, content, source,
               (1 - (embedding <=> ${vecLiteral})) + (CASE WHEN source LIKE 'CODE Brain:%' OR source LIKE '%Knowledge%' OR source LIKE '%Core%' OR source LIKE '%CONSTITUTION%' OR source LIKE '%CHRONOLOGY%' OR content LIKE '# %' THEN 0.15 ELSE 0 END) AS score
        FROM chat_memory
        WHERE user_key = '__brain__' AND embedding IS NOT NULL
        ORDER BY (1 - (embedding <=> ${vecLiteral})) DESC
        LIMIT ${k}
      `;
      res = await pool.query(sql);
    }

    return res.rows.map((r) => {
      let src = r.source || "";
      if (!src && r.content) {
        const match = r.content.match(/^---\s*[\r\n]+source:\s*([^\r\n]+)/m) || r.content.match(/^#\s+([^\r\n]+)/m);
        if (match) {
          src = match[1].trim();
        } else {
          const firstLine = r.content.split(/[\r\n]+/).find((l: string) => l.trim().length > 5);
          src = firstLine ? firstLine.slice(0, 50).trim() + "..." : "CODE Brain Archive";
        }
      }
      return {
        id: r.id,
        content: r.content,
        source: src || "CODE Brain Arweave Archive",
        score: Number(r.score) || 0,
      };
    });
  } catch (e) {
    console.warn("[RAG] searchBrain error:", e);
    return [];
  }
}

export interface MemoryHit {
  id?: string | number;
  content: string;
  role: string;
  score: number;
  msgTs?: string;
}

/** Search personal conversation history for a specific user in pgvector. */
export async function searchUserMemory(userKey: string, query: string, k = 4): Promise<MemoryHit[]> {
  if (!userKey || userKey === "__brain__") return [];
  const vec = await getEmbedding(query, "RETRIEVAL_QUERY");
  if (!vec) return [];
  const hashed = hashUserKey(userKey);
  const vecLiteral = `'[${vec.join(",")}]'::halfvec`;
  const sql = `
    SELECT id, content, role, msg_ts, 1 - (embedding <=> ${vecLiteral}) AS score
    FROM chat_memory
    WHERE user_key = $1 AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vecLiteral}
    LIMIT ${k}
  `;
  try {
    const res = await pool.query(sql, [hashed]);
    return res.rows.map((r) => {
      let dec = r.content;
      try {
        dec = decryptText(r.content);
      } catch (err) {}
      return {
        id: r.id,
        content: dec,
        role: r.role || "user",
        score: Number(r.score) || 0,
        msgTs: r.msg_ts ? String(r.msg_ts) : undefined,
      };
    });
  } catch (e) {
    console.warn("[RAG] searchUserMemory error:", e);
    return [];
  }
}

/** Save a dialogue turn into pgvector memory with automatic embedding and encryption at rest. */
export async function saveChatTurn(userKey: string, role: "user" | "assistant", content: string, source = "AIfaOnlineTelegram"): Promise<void> {
  if (!content || !content.trim()) return;
  const vec = await getEmbedding(content, "RETRIEVAL_DOCUMENT");
  if (!vec) return;
  const hashed = hashUserKey(userKey);
  const encContent = userKey === "__brain__" ? content : encryptText(content);
  const contentHash = crypto.createHash("sha256").update(`${userKey}:${role}:${content}:${Date.now()}`).digest("hex");
  const vecLiteral = `'[${vec.join(",")}]'::halfvec`;
  const sql = `
    INSERT INTO chat_memory (user_key, chat_type, role, content, content_hash, msg_ts, source, embedding)
    VALUES ($1, 'telegram_chat', $2, $3, $4, now(), $5, ${vecLiteral})
    ON CONFLICT (user_key, content_hash) DO NOTHING
  `;
  try {
    await pool.query(sql, [hashed, role, encContent, contentHash, source]);
  } catch (e) {
    console.warn("[RAG] saveChatTurn error:", e);
  }
}

export async function upsertChunks(chunks: KbChunk[]): Promise<void> {
  for (const c of chunks) {
    if (!c.content || !c.content.trim()) continue;
    await saveChatTurn("__brain__", "assistant", c.content, c.source);
  }
}
