import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prognósticos Desportivos",
  description: "Prognósticos de futebol baseados em dados reais",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className="min-h-screen antialiased">
        <header className="bg-slate-900 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <span className="text-2xl">⚽</span>
              <span>Prognósticos Desportivos</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-slate-300">
              <Link href="/" className="hover:text-white">
                Jogos
              </Link>
              <Link href="/desempenho" className="hover:text-white">
                Desempenho
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t mt-12 py-6 text-center text-sm text-slate-500">
          <p>
            Fonte principal: Football-Data.org. Complementos: football.json e ClubElo.
            Apenas informativo.
          </p>
        </footer>
      </body>
    </html>
  );
}
