const TZ = "America/Sao_Paulo";

export function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: TZ, weekday: "long", day: "2-digit", month: "long",
  });
}

// <input type="datetime-local"> chega sem fuso: interpretamos como horário de Brasília (UTC-3, sem horário de verão).
export function brtToIso(local: string) {
  return new Date(`${local}:00-03:00`).toISOString();
}
