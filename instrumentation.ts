// Roda o agendador dentro do próprio servidor: a cada 30s publica o que venceu.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { processDuePosts } = await import("./lib/publisher");
  setInterval(() => {
    processDuePosts().catch((e) => console.error("[publisher]", e));
  }, 30_000);
}
