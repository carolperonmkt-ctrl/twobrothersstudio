import { revalidatePath } from "next/cache";
import { requireLogin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInstagramDm } from "@/lib/meta";
import { fmt } from "@/lib/time";

async function reply(form: FormData) {
  "use server";
  await requireLogin();
  const accountId = Number(form.get("account"));
  const contact = String(form.get("contact"));
  const text = String(form.get("text") ?? "").trim();
  const acc = db().prepare("SELECT external_id, access_token FROM accounts WHERE id=?").get(accountId) as
    | { external_id: string | null; access_token: string | null } | undefined;
  if (!text || !acc?.external_id || !acc.access_token) return;
  const mid = await sendInstagramDm(acc.external_id, acc.access_token, contact, text);
  db().prepare("INSERT INTO messages (account_id, remote_id, contact_id, direction, text, handled) VALUES (?,?,?,?,?,1)")
    .run(accountId, mid || null, contact, "out", text);
  db().prepare("UPDATE messages SET handled=1 WHERE account_id=? AND contact_id=? AND direction='in'").run(accountId, contact);
  revalidatePath("/inbox");
}

type Msg = { id: number; account_id: number; contact_id: string; direction: string; text: string; auto: number; created_at: string; handled: number; client: string };

export default async function Inbox() {
  const msgs = db()
    .prepare(
      `SELECT m.*, c.name AS client FROM messages m JOIN accounts a ON a.id=m.account_id
         JOIN clients c ON c.id=a.client_id ORDER BY m.created_at DESC LIMIT 300`,
    )
    .all() as Msg[];
  const threads = Map.groupBy(msgs, (m) => `${m.account_id}:${m.contact_id}`);
  return (
    <>
      <h1>Mensagens</h1>
      {threads.size === 0 && <p className="muted">Nenhuma mensagem ainda. Elas chegam pelo webhook da Meta.</p>}
      <div className="grid">
        {[...threads].map(([key, list]) => {
          const last = list[0];
          const pending = list.some((m) => m.direction === "in" && !m.handled);
          return (
            <div key={key} className="card">
              <b>{last.client}</b> {pending && <span className="tag bad">sem resposta</span>}
              <div className="muted">contato …{last.contact_id.slice(-6)} · {fmt(last.created_at)}</div>
              {[...list].reverse().slice(-6).map((m) => (
                <div key={m.id} style={{ textAlign: m.direction === "out" ? "right" : "left", margin: "4px 0" }}>
                  <span className="tag">{m.direction === "out" ? (m.auto ? "auto" : "você") : "cliente"}</span> {m.text}
                </div>
              ))}
              <form action={reply} className="row" style={{ marginTop: 8 }}>
                <input type="hidden" name="account" value={last.account_id} />
                <input type="hidden" name="contact" value={last.contact_id} />
                <input name="text" placeholder="Responder…" required />
                <button>Enviar</button>
              </form>
            </div>
          );
        })}
      </div>
    </>
  );
}
