const V = () => process.env.META_GRAPH_VERSION || "v21.0";
const GRAPH = () => `https://graph.facebook.com/${V()}`;

type Json = Record<string, unknown>;

async function graph(method: "GET" | "POST", path: string, params: Json, token: string) {
  const url = new URL(`${GRAPH()}/${path}`);
  const init: RequestInit = { method };
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    url.searchParams.set("access_token", token);
  } else {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      body.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
    }
    body.set("access_token", token);
    init.body = body;
  }
  const res = await fetch(url, init);
  const data = (await res.json()) as Json & { error?: { message: string; code?: number } };
  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? `Meta HTTP ${res.status}`);
  }
  return data;
}

export type PublishInput = {
  type: "feed" | "reel" | "story";
  caption: string;
  mediaUrl: string;
  mediaKind: "image" | "video";
};

async function waitContainer(id: string, token: string) {
  for (let i = 0; i < 60; i++) {
    const s = await graph("GET", id, { fields: "status_code,status" }, token);
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") {
      throw new Error(`Processamento da mídia falhou: ${String(s.status ?? s.status_code)}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Tempo esgotado processando o vídeo na Meta");
}

export async function publishInstagram(igId: string, token: string, p: PublishInput) {
  const params: Json = {};
  if (p.type === "reel") {
    params.media_type = "REELS";
    params.video_url = p.mediaUrl;
    params.caption = p.caption;
  } else if (p.type === "story") {
    params.media_type = "STORIES";
    params[p.mediaKind === "video" ? "video_url" : "image_url"] = p.mediaUrl;
  } else if (p.mediaKind === "video") {
    params.media_type = "REELS"; // a API não publica mais vídeo de feed comum
    params.video_url = p.mediaUrl;
    params.caption = p.caption;
  } else {
    params.image_url = p.mediaUrl;
    params.caption = p.caption;
  }
  const container = await graph("POST", `${igId}/media`, params, token);
  const creationId = String(container.id);
  if (p.mediaKind === "video") await waitContainer(creationId, token);
  const published = await graph("POST", `${igId}/media_publish`, { creation_id: creationId }, token);
  return String(published.id);
}

export async function publishFacebook(pageId: string, token: string, p: PublishInput) {
  if (p.type === "story") {
    if (p.mediaKind === "video") throw new Error("Story em vídeo no Facebook ainda não suportado");
    const photo = await graph("POST", `${pageId}/photos`, { url: p.mediaUrl, published: false }, token);
    const story = await graph("POST", `${pageId}/photo_stories`, { photo_id: String(photo.id) }, token);
    return String(story.post_id ?? story.id);
  }
  if (p.mediaKind === "video") {
    const r = await graph("POST", `${pageId}/videos`, { file_url: p.mediaUrl, description: p.caption }, token);
    return String(r.id);
  }
  const r = await graph("POST", `${pageId}/photos`, { url: p.mediaUrl, caption: p.caption }, token);
  return String(r.post_id ?? r.id);
}

// Resposta a DM do Instagram (janela de 24h após a mensagem do usuário).
export async function sendInstagramDm(igId: string, token: string, recipientId: string, text: string) {
  const r = await graph(
    "POST",
    `${igId}/messages`,
    { recipient: { id: recipientId }, message: { text } },
    token,
  );
  return String(r.message_id ?? "");
}

export async function exchangeCode(code: string, redirectUri: string) {
  const url = new URL(`${GRAPH()}/oauth/access_token`);
  url.searchParams.set("client_id", process.env.META_APP_ID ?? "");
  url.searchParams.set("client_secret", process.env.META_APP_SECRET ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);
  const short = (await (await fetch(url)).json()) as { access_token?: string; error?: { message: string } };
  if (!short.access_token) throw new Error(short.error?.message ?? "Falha ao trocar o code");

  const longUrl = new URL(`${GRAPH()}/oauth/access_token`);
  longUrl.searchParams.set("grant_type", "fb_exchange_token");
  longUrl.searchParams.set("client_id", process.env.META_APP_ID ?? "");
  longUrl.searchParams.set("client_secret", process.env.META_APP_SECRET ?? "");
  longUrl.searchParams.set("fb_exchange_token", short.access_token);
  const long = (await (await fetch(longUrl)).json()) as { access_token?: string; error?: { message: string } };
  if (!long.access_token) throw new Error(long.error?.message ?? "Falha ao gerar token longo");
  return long.access_token;
}

export type Page = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
};

// Com um token de usuário de longa duração, os page tokens retornados não expiram.
export async function listPages(userToken: string) {
  const pages: Page[] = [];
  let next: string | undefined;
  let data = await graph(
    "GET",
    "me/accounts",
    { fields: "id,name,access_token,instagram_business_account{id,username}", limit: 100 },
    userToken,
  );
  for (;;) {
    pages.push(...((data.data as Page[]) ?? []));
    next = (data.paging as { next?: string } | undefined)?.next;
    if (!next) break;
    data = (await (await fetch(next)).json()) as Json;
  }
  return pages;
}
