import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prognósticos Desportivos",
  description: "Prognósticos de futebol baseados em dados reais para apostas",
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
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <span className="text-2xl">⚽</span>
              <span>Prognósticos Desportivos</span>
            </Link>
            <nav className="text-sm text-slate-300">
              Football-Data.org + TheSportsDB
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t mt-12 py-6 text-center text-sm text-slate-500">
          <p>
            Dados: Football-Data.org · Logos: TheSportsDB. Apenas para fins informativos.
            Jogue com responsabilidade.
          </p>
        </footer>
      </body>
    </html>
  );
}
