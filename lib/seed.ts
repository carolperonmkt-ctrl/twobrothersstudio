// Clientes e contas migrados do mLabs (apenas os canais ativos).
export type SeedClient = {
  name: string;
  accounts: { platform: "instagram" | "facebook" | "tiktok"; name: string }[];
};

export const SEED: SeedClient[] = [
  { name: "Jabá do Ribamar", accounts: [
    { platform: "instagram", name: "Jabá do Ribamar" },
    { platform: "facebook", name: "Jabá do Ribamar" } ] },
  { name: "Seu Perfil Gourmet", accounts: [
    { platform: "instagram", name: "Seu Perfil Gourmet®" },
    { platform: "facebook", name: "Seu perfil Gourmet" } ] },
  { name: "York Cookie", accounts: [
    { platform: "instagram", name: "COOKIES RECHEADOS" },
    { platform: "facebook", name: "yorkcookieshop" },
    { platform: "tiktok", name: "YORK COOKIE SHOP 🤎" } ] },
  { name: "York Burguer", accounts: [
    { platform: "instagram", name: "York Burguer Shop Hamburgueria" },
    { platform: "facebook", name: "yorkburguershop" } ] },
  { name: "Maki Burger", accounts: [
    { platform: "instagram", name: "Maki Burger" },
    { platform: "facebook", name: "Maki Burger" } ] },
  { name: "Morelatto", accounts: [
    { platform: "instagram", name: "Morelatto Steak House ®" },
    { platform: "facebook", name: "Morelatto Steak House" } ] },
  { name: "Monstrões", accounts: [
    { platform: "instagram", name: "Monstrões Burguer | Hamburgueria Artesanal" } ] },
  { name: "Bistrô 7", accounts: [{ platform: "instagram", name: "Bistrô 7" }] },
  { name: "Keké Pizzaria", accounts: [{ platform: "instagram", name: "KEKÉ PIZZA" }] },
  { name: "HR Acabamentos", accounts: [
    { platform: "instagram", name: "HR Acabamentos Gráficos" } ] },
];
