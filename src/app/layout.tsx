import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { variablesPolices } from "./polices";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rojer — Conformité santé-sécurité TPE/PME",
  description:
    "Plateforme continue d'accompagnement à la conformité santé-sécurité pour dirigeants de TPE/PME : DUERP, calendrier de vérifications, registre de sécurité, plan d'actions.",
};

/**
 * `viewportFit: "cover"` : sur un iPhone à encoche, la page va jusqu'aux
 * bords et les barres fixes s'écartent d'elles-mêmes de la barre d'accueil
 * (`env(safe-area-inset-bottom)`, `NavigationMobile`). La couleur du thème est
 * le fond de page (`--board-canvas`).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f9fb",
};

/**
 * `await connection()` : TOUTE page est rendue à la requête (audit OWASP S7,
 * 2026-10-14). La CSP est bloquante et à nonce (`src/proxy.ts`) ; une page
 * prérendue au build porte des scripts sans nonce, que le navigateur refuse —
 * mesuré dans Chrome sur `/_not-found`, seule page statique jusque-là : treize
 * scripts bloqués, page morte. Posé ici et non page par page, pour qu'une page
 * statique ajoutée demain ne casse pas en silence.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  return (
    <html
      lang="fr"
      className={`${variablesPolices} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Plus d'en-tête ici (audit Next.js du 2026-10-14, M2) : il est
            rendu par les segments qui l'affichent (`LayoutAvecEnTete`), et
            seulement par eux : ni la page introuvable ni `error.tsx` ne
            l'ont (sous `not-found.tsx`, Next le sérialisait dans chaque
            page). Rendu ici puis masqué côté client, il lisait
            la session et la base sur chaque écran de l'application. */}
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
