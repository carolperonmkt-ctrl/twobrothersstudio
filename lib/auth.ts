import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "tb_session";

function secret() {
  return process.env.APP_PASSWORD ?? "";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function checkPassword(input: string) {
  const a = Buffer.from(input);
  const b = Buffer.from(secret());
  return secret() !== "" && a.length === b.length && timingSafeEqual(a, b);
}

export async function startSession() {
  const exp = String(Date.now() + 1000 * 60 * 60 * 24 * 30);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isLoggedIn() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw || !secret()) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = sign(exp);
  return sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// Server actions são endpoints públicos: toda ação checa a sessão.
export async function requireLogin() {
  if (!(await isLoggedIn())) redirect("/login");
}
