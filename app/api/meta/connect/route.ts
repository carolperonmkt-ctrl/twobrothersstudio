import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isLoggedIn } from "@/lib/auth";

export const SCOPES = [
  "pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_messaging",
  "instagram_basic", "instagram_content_publish", "instagram_manage_messages",
  "business_management",
].join(",");

export async function GET() {
  if (!(await isLoggedIn())) return NextResponse.redirect(new URL("/login", process.env.PUBLIC_BASE_URL));
  const base = process.env.PUBLIC_BASE_URL!;
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("meta_state", state, { httpOnly: true, maxAge: 600, path: "/" });
  const url = new URL(`https://www.facebook.com/${process.env.META_GRAPH_VERSION || "v21.0"}/dialog/oauth`);
  url.searchParams.set("client_id", process.env.META_APP_ID ?? "");
  url.searchParams.set("redirect_uri", `${base}/api/meta/callback`);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
