import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { db, UPLOAD_DIR } from "@/lib/db";
import { brtToIso } from "@/lib/time";

const IMAGE = new Set([".jpg", ".jpeg", ".png"]);
const VIDEO = new Set([".mp4", ".mov"]);

async function schedule(form: FormData) {
  "use server";
  await requireLogin();
  const ids = form.getAll("account").map(Number).filter(Boolean);
  const file = form.get("media") as File | null;
  const when = String(form.get("when") ?? "");
  const type = String(form.get("type") ?? "feed");
  if (!ids.length || !file || file.size === 0 || !when || !["feed", "reel", "story"].includes(type)) {
    redirect("/posts/new?erro=campos");
  }
  const ext = path.extname(file.name).toLowerCase();
  const kind = IMAGE.has(ext) ? "image" : VIDEO.has(ext) ? "video" : null;
  if (!kind) redirect("/posts/new?erro=formato");
  if (type === "reel" && kind !== "video") redirect("/posts/new?erro=formato");

  const name = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

  const ins = db().prepare(
    `INSERT INTO posts (account_id, type, caption, media_file, media_kind, scheduled_at) VALUES (?,?,?,?,?,?)`,
  );
  const iso = brtToIso(when);
  const caption = String(form.get("caption") ?? "");
  db().transaction(() => { for (const id of ids) ins.run(id, type, caption, name, kind, iso); })();
  redirect("/calendar");
}

type Acc = { id: number; platform: string; name: string; client: string };

export default async function NewPost({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const accounts = db()
    .prepare(
      `SELECT a.id, a.platform, a.name, c.name AS client FROM accounts a JOIN clients c ON c.id=a.client_id
        WHERE a.active=1 AND c.active=1 ORDER BY c.name, a.platform`,
    )
    .all() as Acc[];
  const byClient = Map.groupBy(accounts, (a) => a.client);
  return (
    <>
      <h1>Agendar publicação</h1>
      {erro && <p className="bad">{erro === "formato" ? "Formato inválido (Reel exige vídeo mp4/mov; demais aceitam jpg, png, mp4, mov)." : "Preencha todos os campos."}</p>}
      <form action={schedule} className="stack" encType="multipart/form-data">
        <div className="grid">
          {[...byClient].map(([client, list]) => (
            <div key={client} className="card">
              <b>{client}</b>
              {list.map((a) => (
                <label key={a.id} className="chk">
                  <input type="checkbox" name="account" value={a.id} /> {a.platform}
                </label>
              ))}
            </div>
          ))}
        </div>
        <div className="row">
          <label>Tipo
            <select name="type"><option value="feed">Feed</option><option value="reel">Reel</option><option value="story">Story</option></select>
          </label>
          <label>Data e hora (Brasília)
            <input type="datetime-local" name="when" required />
          </label>
          <label>Mídia
            <input type="file" name="media" accept=".jpg,.jpeg,.png,.mp4,.mov" required />
          </label>
        </div>
        <label>Legenda
          <textarea name="caption" rows={5} />
        </label>
        <div><button>Agendar</button></div>
      </form>
    </>
  );
}
