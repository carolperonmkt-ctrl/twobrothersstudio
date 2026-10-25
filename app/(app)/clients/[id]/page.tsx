import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmt } from "@/lib/time";

type Post = {
  id: number; platform: string; type: string; caption: string;
  scheduled_at: string; status: string; error: string | null;
};

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = db().prepare("SELECT id, name FROM clients WHERE id=?").get(Number(id)) as
    | { id: number; name: string } | undefined;
  if (!client) notFound();
  const accounts = db()
    .prepare("SELECT id, platform, name, external_id FROM accounts WHERE client_id=? AND active=1")
    .all(client.id) as { id: number; platform: string; name: string; external_id: string | null }[];
  const posts = db()
    .prepare(
      `SELECT p.id, a.platform, p.type, p.caption, p.scheduled_at, p.status, p.error
         FROM posts p JOIN accounts a ON a.id=p.account_id
        WHERE a.client_id=? ORDER BY p.scheduled_at DESC LIMIT 50`,
    )
    .all(client.id) as Post[];
  return (
    <>
      <h1>{client.name}</h1>
      <div className="row">
        {accounts.map((a) => (
          <span key={a.id} className="card">
            <b>{a.platform}</b> · {a.name}{" "}
            <span className={a.external_id ? "ok" : "muted"}>{a.external_id ? "conectada" : "não conectada"}</span>
          </span>
        ))}
        <Link className="btn" href="/posts/new">Agendar post</Link>
      </div>
      <h2>Posts</h2>
      <table>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id}>
              <td>{fmt(p.scheduled_at)}</td>
              <td>{p.platform} · {p.type}</td>
              <td>{p.caption.slice(0, 70)}</td>
              <td className={p.status === "published" ? "ok" : p.status === "failed" ? "bad" : "muted"}>
                {p.status}{p.error ? ` — ${p.error}` : ""}
              </td>
            </tr>
          ))}
          {posts.length === 0 && <tr><td className="muted">Nenhum post ainda.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
