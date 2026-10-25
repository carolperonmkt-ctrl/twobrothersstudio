import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isLoggedIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { exchangeCode, listPages } from "@/lib/meta";

export async function GET(req: Request) {
  const base = process.env.PUBLIC_BASE_URL!;
  if (!(await isLoggedIn())) return NextResponse.redirect(new URL("/login", base));
  const q = new URL(req.url).searchParams;
  const jar = await cookies();
  if (!q.get("code") || q.get("state") !== jar.get("meta_state")?.value) {
    return NextResponse.redirect(new URL("/accounts?erro=conexao", base));
  }
  try {
    const userToken = await exchangeCode(q.get("code")!, `${base}/api/meta/callback`);
    const pages = await listPages(userToken);
    const up = db().prepare(
      `INSERT INTO discovered (page_id, page_name, page_token, ig_id, ig_username) VALUES (?,?,?,?,?)
       ON CONFLICT(page_id) DO UPDATE SET page_name=excluded.page_name, page_token=excluded.page_token,
         ig_id=excluded.ig_id, ig_username=excluded.ig_username`,
    );
    for (const p of pages) {
      up.run(p.id, p.name, p.access_token, p.instagram_business_account?.id ?? null,
        p.instagram_business_account?.username ?? null);
    }
  } catch (e) {
    console.error("[meta callback]", e);
    return NextResponse.redirect(new URL("/accounts?erro=conexao", base));
  }
  jar.delete("meta_state");
  return NextResponse.redirect(new URL("/accounts?ok=1", base));
}
