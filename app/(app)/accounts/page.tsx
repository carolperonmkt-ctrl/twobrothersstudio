import { revalidatePath } from "next/cache";
import { requireLogin } from "@/lib/auth";
import { db } from "@/lib/db";

async function link(form: FormData) {
  "use server";
  await requireLogin();
  const accountId = Number(form.get("account"));
  const pageId = String(form.get("page") ?? "");
  const acc = db().prepare("SELECT platform FROM accounts WHERE id=?").get(accountId) as { platform: string } | undefined;
  const page = db().prepare("SELECT * FROM discovered WHERE page_id=?").get(pageId) as
    | { page_id: string; page_token: string; ig_id: string | null } | undefined;
  if (!acc || !page) return;
  const externalId = acc.platform === "instagram" ? page.ig_id : page.page_id;
  if (!externalId) return;
  db().prepare("UPDATE accounts SET external_id=?, access_token=? WHERE id=?").run(externalId, page.page_token, accountId);
  revalidatePath("/accounts");
}

async function unlink(form: FormData) {
  "use server";
  await requireLogin();
  db().prepare("UPDATE accounts SET external_id=NULL, access_token=NULL WHERE id=?").run(Number(form.get("account")));
  revalidatePath("/accounts");
}

type Acc = { id: number; platform: string; name: string; client: string; external_id: string | null };
type Disc = { page_id: string; page_name: string; ig_id: string | null; ig_username: string | null };

export default async function Accounts({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const accounts = db()
    .prepare(
      `SELECT a.id, a.platform, a.name, a.external_id, c.name AS client FROM accounts a
         JOIN clients c ON c.id=a.client_id WHERE a.active=1 ORDER BY c.name, a.platform`,
    )
    .all() as Acc[];
  const discovered = db().prepare("SELECT page_id, page_name, ig_id, ig_username FROM discovered ORDER BY page_name").all() as Disc[];
  return (
    <>
      <h1>Contas</h1>
      {sp.ok && <p className="ok">Meta conectada. Vincule cada conta abaixo.</p>}
      {sp.erro && <p className="bad">Não foi possível conectar com a Meta.</p>}
      <p><a className="btn" href="/api/meta/connect">Conectar com a Meta</a>{" "}
        <span className="muted">{discovered.length} página(s) descoberta(s)</span></p>
      <table>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id}>
              <td><b>{a.client}</b><br /><span className="muted">{a.platform} · {a.name}</span></td>
              <td>
                {a.platform === "tiktok" ? <span className="muted">TikTok: integração futura</span> : a.external_id ? (
                  <span className="row">
                    <span className="ok">conectada ({a.external_id})</span>
                    <form action={unlink}><input type="hidden" name="account" value={a.id} /><button className="ghost">Desvincular</button></form>
                  </span>
                ) : (
                  <form action={link} className="row">
                    <input type="hidden" name="account" value={a.id} />
                    <select name="page" required>
                      <option value="">Escolher página…</option>
                      {discovered
                        .filter((d) => a.platform === "facebook" || d.ig_id)
                        .map((d) => (
                          <option key={d.page_id} value={d.page_id}>
                            {d.page_name}{a.platform === "instagram" && d.ig_username ? ` (@${d.ig_username})` : ""}
                          </option>
                        ))}
                    </select>
                    <button>Vincular</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
