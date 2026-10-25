import { createHmac, timingSafeEqual } from "node:crypto";
import { handleIncomingDm } from "@/lib/dm";

// Verificação inicial do webhook (configurada no painel da Meta).
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = process.env.META_VERIFY_TOKEN;
  if (token && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === token) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

function validSignature(raw: string, header: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const got = header.slice(7);
  return got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

type Payload = {
  object?: string;
  entry?: {
    id: string;
    messaging?: {
      sender: { id: string };
      message?: { mid: string; text?: string; is_echo?: boolean };
    }[];
  }[];
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("invalid signature", { status: 401 });
  }
  const body = JSON.parse(raw) as Payload;
  if (body.object === "instagram") {
    for (const entry of body.entry ?? []) {
      for (const ev of entry.messaging ?? []) {
        const msg = ev.message;
        if (!msg?.text || msg.is_echo || ev.sender.id === entry.id) continue;
        await handleIncomingDm({ igId: entry.id, senderId: ev.sender.id, text: msg.text, mid: msg.mid });
      }
    }
  }
  return new Response("ok");
}
