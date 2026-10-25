import { redirect } from "next/navigation";
import { checkPassword, startSession } from "@/lib/auth";

async function login(form: FormData) {
  "use server";
  if (checkPassword(String(form.get("password") ?? ""))) {
    await startSession();
    redirect("/");
  }
  redirect("/login?erro=1");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main style={{ maxWidth: 360, marginTop: 80 }}>
      <h1>Two Brothers Social</h1>
      <form action={login} className="stack">
        <label>Senha
          <input type="password" name="password" autoFocus required />
        </label>
        {erro && <span className="bad">Senha incorreta.</span>}
        <button>Entrar</button>
      </form>
    </main>
  );
}
