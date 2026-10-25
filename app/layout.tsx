import "./globals.css";

export const metadata = { title: "Two Brothers Social" };

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
