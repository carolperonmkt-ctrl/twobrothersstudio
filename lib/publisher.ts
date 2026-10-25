import { db } from "./db";
import { publishFacebook, publishInstagram } from "./meta";

type Due = {
  id: number;
  type: "feed" | "reel" | "story";
  caption: string;
  media_file: string;
  media_kind: "image" | "video";
  attempts: number;
  platform: "instagram" | "facebook" | "tiktok";
  external_id: string | null;
  access_token: string | null;
};

const MAX_ATTEMPTS = 3;
let running = false;

export async function processDuePosts() {
  if (running) return;
  running = true;
  try {
    const d = db();
    const due = d
      .prepare(
        `SELECT p.id, p.type, p.caption, p.media_file, p.media_kind, p.attempts,
                a.platform, a.external_id, a.access_token
           FROM posts p JOIN accounts a ON a.id = p.account_id
          WHERE p.status = 'scheduled' AND p.scheduled_at <= ?
          ORDER BY p.scheduled_at LIMIT 10`,
      )
      .all(new Date().toISOString()) as Due[];

    for (const post of due) {
      d.prepare("UPDATE posts SET status='publishing', attempts=attempts+1 WHERE id=?").run(post.id);
      try {
        if (post.platform === "tiktok") throw new Error("TikTok ainda não conectado");
        if (!post.external_id || !post.access_token) {
          throw new Error("Conta sem ID/token — conecte a conta em Contas");
        }
        const base = (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
        if (!base) throw new Error("PUBLIC_BASE_URL não configurada");
        const input = {
          type: post.type,
          caption: post.caption,
          mediaKind: post.media_kind,
          mediaUrl: `${base}/api/media/${encodeURIComponent(post.media_file)}`,
        };
        const remoteId =
          post.platform === "instagram"
            ? await publishInstagram(post.external_id, post.access_token, input)
            : await publishFacebook(post.external_id, post.access_token, input);
        d.prepare(
          "UPDATE posts SET status='published', remote_id=?, published_at=?, error=NULL WHERE id=?",
        ).run(remoteId, new Date().toISOString(), post.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const retry = post.attempts + 1 < MAX_ATTEMPTS && !msg.includes("conecte a conta");
        d.prepare("UPDATE posts SET status=?, error=? WHERE id=?").run(
          retry ? "scheduled" : "failed",
          msg,
          post.id,
        );
      }
    }
  } finally {
    running = false;
  }
}
