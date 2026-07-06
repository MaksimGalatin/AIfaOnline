import { pool } from "./repo.js";
export interface SessState { flow?: string; sku?: string; orderId?: string; redeemed?: boolean; data?: Record<string, unknown>; }
const memSessions = new Map<number, SessState>();
export async function getState(tgId: number): Promise<SessState> {
  try {
    const r = await pool.query(`SELECT state FROM bot_sessions WHERE tg_id=$1`, [tgId]);
    return (r.rows[0]?.state as SessState) ?? memSessions.get(tgId) ?? {};
  } catch {
    return memSessions.get(tgId) ?? {};
  }
}
export async function setState(tgId: number, state: SessState): Promise<void> {
  memSessions.set(tgId, state);
  try {
    await pool.query(
      `INSERT INTO bot_sessions (tg_id, state, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (tg_id) DO UPDATE SET state=EXCLUDED.state, updated_at=now()`, [tgId, JSON.stringify(state)]);
  } catch {}
}
export async function clearState(tgId: number): Promise<void> {
  memSessions.delete(tgId);
  try {
    await pool.query(`DELETE FROM bot_sessions WHERE tg_id=$1`, [tgId]);
  } catch {}
}
export async function setOrderInput(orderId: string, input: Record<string, unknown>): Promise<void> {
  try {
    await pool.query(`UPDATE orders SET input=$2 WHERE id=$1`, [orderId, JSON.stringify(input)]);
  } catch {}
}

