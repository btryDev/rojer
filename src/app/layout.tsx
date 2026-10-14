import type { Metadata } from "next";
import { variablesPolices } from "./polices";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rojer — Conformité santé-sécurité TPE/PME",
  description:
    "Plateforme continue d'accompagnement à la conformité santé-sécurité pour dirigeants de TPE/PME : DUERP, calendrier de vérifications, registre de sécurité, plan d'actions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${variablesPolices} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Plus d'en-tête ici (audit Next.js du 2026-10-14, M2) : il est
            rendu par les segments qui l'affichent (`LayoutAvecEnTete`), et
            par `not-found.tsx`. Rendu ici puis masqué côté client, il lisait
            la session et la base sur chaque écran de l'application. */}
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
