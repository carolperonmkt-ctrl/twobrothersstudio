import { revalidatePath } from "next/cache";
import { requireLogin } from "@/lib/auth";
import { db } from "@/lib/db";

async function addRule(form: FormData) {
  "use server";
  await requireLogin();
  const keyword = String(form.get("keyword") ?? "").trim();
  const reply = String(form.get("reply") ?? "").trim();
  const account = Number(form.get("account"));
  if (keyword && reply && account) {
    db().prepare("INSERT INTO dm_rules (account_id, keyword, reply) VALUES (?,?,?)").run(account, keyword, reply);
  }
  revalidatePath("/rules");
}

async function toggle(form: FormData) {
  "use server";
  await requireLogin();
  db().prepare("UPDATE dm_rules SET active = 1 - active WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/rules");
}

async function remove(form: FormData) {
  "use server";
  await requireLogin();
  db().prepare("DELETE FROM dm_rules WHERE id=?").run(Number(form.get("id")));
  revalidatePath("/rules");
}

export default async function Rules() {
  const accounts = db()
    .prepare(
      `SELECT a.id, a.name, c.name AS client FROM accounts a JOIN clients c ON c.id=a.client_id
        WHERE a.platform='instagram' AND a.active=1 ORDER BY c.name`,
    )
    .all() as { id: number; name: string; client: string }[];
  const rules = db()
    .prepare(
      `SELECT r.id, r.keyword, r.reply, r.active, c.name AS client FROM dm_rules r
         JOIN accounts a ON a.id=r.account_id JOIN clients c ON c.id=a.client_id ORDER BY c.name, r.id`,
    )
    .all() as { id: number; keyword: string; reply: string; active: number; client: string }[];
  return (
    <>
      <h1>Respostas automáticas de DM</h1>
      <p className="muted">Quando a mensagem contém a palavra-chave, a resposta é enviada (dentro da janela de 24h da Meta).</p>
      <form action={addRule} className="stack card">
        <label>Conta do Instagram
          <select name="account" required>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.client} — {a.name}</option>)}
          </select>
        </label>
        <label>Palavra-chave <input name="keyword" placeholder="cardápio" required /></label>
        <label>Resposta <textarea name="reply" rows={3} required /></label>
        <div><button>Criar regra</button></div>
      </form>
      <table style={{ marginTop: 16 }}>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
              <td><b>{r.client}</b><br /><span className="tag">{r.keyword}</span></td>
              <td>{r.reply}</td>
              <td className="row">
                <form action={toggle}><input type="hidden" name="id" value={r.id} /><button className="ghost">{r.active ? "Pausar" : "Ativar"}</button></form>
                <form action={remove}><input type="hidden" name="id" value={r.id} /><button className="ghost">Excluir</button></form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
