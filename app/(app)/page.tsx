import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireLogin } from "@/lib/auth";
import { db } from "@/lib/db";

async function addClient(form: FormData) {
  "use server";
  await requireLogin();
  const name = String(form.get("name") ?? "").trim();
  if (name) db().prepare("INSERT INTO clients (name) VALUES (?)").run(name);
  revalidatePath("/");
}

type Row = { id: number; name: string; platforms: string | null; queued: number };

export default async function Home() {
  const clients = db()
    .prepare(
      `SELECT c.id, c.name,
              (SELECT group_concat(platform, ',') FROM accounts WHERE client_id=c.id AND active=1) AS platforms,
              (SELECT count(*) FROM posts p JOIN accounts a ON a.id=p.account_id
                WHERE a.client_id=c.id AND p.status='scheduled') AS queued
         FROM clients c WHERE c.active=1 ORDER BY c.name`,
    )
    .all() as Row[];
  return (
    <>
      <h1>Clientes</h1>
      <div className="grid">
        {clients.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="card" style={{ textDecoration: "none" }}>
            <b>{c.name}</b>
            <div className="row" style={{ margin: "6px 0" }}>
              {(c.platforms ?? "").split(",").filter(Boolean).map((p, i) => (
                <span key={i} className="tag">{p}</span>
              ))}
            </div>
            <span className="muted">{c.queued} agendado(s)</span>
          </Link>
        ))}
      </div>
      <h2>Novo cliente</h2>
      <form action={addClient} className="row">
        <input name="name" placeholder="Nome do cliente" required style={{ maxWidth: 280 }} />
        <button>Adicionar</button>
      </form>
    </>
  );
}
