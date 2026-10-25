import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { UPLOAD_DIR } from "@/lib/db";

// Público de propósito: a Meta precisa baixar a mídia sem login. Nomes são aleatórios.
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".mp4": "video/mp4", ".mov": "video/quicktime",
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const safe = path.basename(name);
  const file = path.join(UPLOAD_DIR, safe);
  if (!fs.existsSync(file)) return new Response("not found", { status: 404 });
  const stat = fs.statSync(file);
  const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "content-type": TYPES[path.extname(safe).toLowerCase()] ?? "application/octet-stream",
      "content-length": String(stat.size),
    },
  });
}
