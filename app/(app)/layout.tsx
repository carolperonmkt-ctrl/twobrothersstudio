import Link from "next/link";
import { redirect } from "next/navigation";
import { endSession, isLoggedIn } from "@/lib/auth";

async function logout() {
  "use server";
  await endSession();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLoggedIn())) redirect("/login");
  return (
    <>
      <nav>
        <b>Two Brothers Social</b>
        <Link href="/">Clientes</Link>
        <Link href="/posts/new">Agendar</Link>
        <Link href="/calendar">Calendário</Link>
        <Link href="/inbox">Mensagens</Link>
        <Link href="/rules">Respostas</Link>
        <Link href="/accounts">Contas</Link>
        <form action={logout} style={{ marginLeft: "auto" }}>
          <button className="ghost">Sair</button>
        </form>
      </nav>
      <main>{children}</main>
    </>
  );
}
