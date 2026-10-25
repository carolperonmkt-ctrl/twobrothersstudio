import { revalidatePath } from "next/cache";
import { requireLogin } from "@/lib/auth";
import { db } from "@/lib/db";
import { dayKey, fmt } from "@/lib/time";

async function cancel(form: FormData) {
  "use server";
  await requireLogin();
  db().prepare("DELETE FROM posts WHERE id=? AND status IN ('scheduled','failed')").run(Number(form.get("id")));
  revalidatePath("/calendar");
}

async function retry(form: FormData) {
  "use server";
  await requireLogin();
  db().prepare("UPDATE posts SET status='scheduled', attempts=0, error=NULL WHERE id=? AND status='failed'")
    .run(Number(form.get("id")));
  revalidatePath("/calendar");
}

type Row = {
  id: number; client: string; platform: string; type: string; caption: string;
  scheduled_at: string; status: string; error: string | null; media_file: string; media_kind: string;
};

export default async function Calendar() {
  const posts = db()
    .prepare(
      `SELECT p.id, c.name AS client, a.platform, p.type, p.caption, p.scheduled_at, p.status, p.error,
              p.media_file, p.media_kind
         FROM posts p JOIN accounts a ON a.id=p.account_id JOIN clients c ON c.id=a.client_id
        WHERE p.scheduled_at >= datetime('now','-7 day') ORDER BY p.scheduled_at`,
    )
    .all() as Row[];
  const days = Map.groupBy(posts, (p) => dayKey(p.scheduled_at));
  return (
    <>
      <h1>Calendário</h1>
      {posts.length === 0 && <p className="muted">Nada agendado.</p>}
      {[...days].map(([day, list]) => (
        <section key={day}>
          <h2 style={{ textTransform: "capitalize" }}>{day}</h2>
          <div className="grid">
            {list.map((p) => (
              <div key={p.id} className="card">
                {p.media_kind === "image"
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={`/api/media/${p.media_file}`} alt="" style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }} />
                  : <video src={`/api/media/${p.media_file}`} muted style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }} />}
                <div><b>{p.client}</b> · {p.platform} · {p.type}</div>
                <div className="muted">{fmt(p.scheduled_at)}</div>
                <div>{p.caption.slice(0, 80)}</div>
                <div className={p.status === "published" ? "ok" : p.status === "failed" ? "bad" : "muted"}>
                  {p.status}{p.error ? ` — ${p.error}` : ""}
                </div>
                <div className="row" style={{ marginTop: 6 }}>
                  {p.status === "failed" && (
                    <form action={retry}><input type="hidden" name="id" value={p.id} /><button className="ghost">Tentar de novo</button></form>
                  )}
                  {(p.status === "scheduled" || p.status === "failed") && (
                    <form action={cancel}><input type="hidden" name="id" value={p.id} /><button className="ghost">Cancelar</button></form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
