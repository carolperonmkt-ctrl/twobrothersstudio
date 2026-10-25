import { db } from "./db";
import { sendInstagramDm } from "./meta";

type Account = { id: number; external_id: string; access_token: string | null };

export type IncomingDm = { igId: string; senderId: string; text: string; mid: string };

// Guarda a mensagem recebida e responde se alguma regra ativa casar com o texto.
export async function handleIncomingDm(m: IncomingDm) {
  const d = db();
  const account = d
    .prepare("SELECT id, external_id, access_token FROM accounts WHERE platform='instagram' AND external_id=?")
    .get(m.igId) as Account | undefined;
  if (!account) return;

  const inserted = d
    .prepare("INSERT OR IGNORE INTO messages (account_id, remote_id, contact_id, direction, text) VALUES (?,?,?,?,?)")
    .run(account.id, m.mid, m.senderId, "in", m.text);
  if (inserted.changes === 0) return; // evento duplicado

  const rules = d
    .prepare("SELECT keyword, reply FROM dm_rules WHERE account_id=? AND active=1")
    .all(account.id) as { keyword: string; reply: string }[];
  const text = m.text.toLowerCase();
  const rule = rules.find((r) => text.includes(r.keyword.toLowerCase()));
  if (!rule || !account.access_token) return;

  try {
    const mid = await sendInstagramDm(account.external_id, account.access_token, m.senderId, rule.reply);
    d.prepare(
      "INSERT INTO messages (account_id, remote_id, contact_id, direction, text, auto, handled) VALUES (?,?,?,?,?,1,1)",
    ).run(account.id, mid || null, m.senderId, "out", rule.reply);
    d.prepare("UPDATE messages SET handled=1 WHERE remote_id=?").run(m.mid);
  } catch (e) {
    console.error("[dm] falha ao responder", e);
  }
}
