import { pool } from "./repo.js";
export interface SessState { flow?: string; sku?: string; orderId?: string; redeemed?: boolean; data?: Record<string, unknown>; }
export async function getState(tgId: number): Promise<SessState> {
  const r = await pool.query(`SELECT state FROM bot_sessions WHERE tg_id=$1`, [tgId]);
  return (r.rows[0]?.state as SessState) ?? {};
}
export async function setState(tgId: number, state: SessState): Promise<void> {
  await pool.query(
    `INSERT INTO bot_sessions (tg_id, state, updated_at) VALUES ($1,$2,now())
     ON CONFLICT (tg_id) DO UPDATE SET state=EXCLUDED.state, updated_at=now()`, [tgId, JSON.stringify(state)]);
}
export async function clearState(tgId: number): Promise<void> {
  await pool.query(`DELETE FROM bot_sessions WHERE tg_id=$1`, [tgId]);
}
export async function setOrderInput(orderId: string, input: Record<string, unknown>): Promise<void> {
  await pool.query(`UPDATE orders SET input=$2 WHERE id=$1`, [orderId, JSON.stringify(input)]);
}
