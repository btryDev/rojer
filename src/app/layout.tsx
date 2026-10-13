import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppHeaderGate } from "@/components/layout/AppHeaderGate";
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
        <AppHeaderGate>
          <AppHeader />
        </AppHeaderGate>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
