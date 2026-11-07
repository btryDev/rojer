import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { variablesPolices } from "./polices";
import "./globals.css";
import { OUVERT_AUX_MOTEURS } from "@/lib/indexation";

const TITRE = "Rojer — Conformité santé-sécurité TPE/PME";
const DESCRIPTION =
  "Plateforme continue d'accompagnement à la conformité santé-sécurité pour dirigeants de TPE/PME : DUERP, calendrier de vérifications, registre de sécurité, plan d'actions.";

export const metadata: Metadata = {
  // Les images de partage (`opengraph-image.jpg`) sont annoncées en adresse
  // absolue : la base est l'adresse publique du déploiement. Sans elle, Next
  // retombe sur l'URL de Vercel, ou sur localhost.
  ...(process.env.PUBLIC_APP_URL ? { metadataBase: new URL(process.env.PUBLIC_APP_URL) } : {}),
  // Fermé aux moteurs tant que le site n'est pas ouvert (`lib/indexation.ts`).
  ...(OUVERT_AUX_MOTEURS ? {} : { robots: { index: false, follow: false } }),
  title: TITRE,
  description: DESCRIPTION,
  // L'aperçu d'un lien partagé (LinkedIn, WhatsApp, mail) : l'image vient de
  // `opengraph-image.jpg`, posée à côté de ce fichier.
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Rojer",
    title: TITRE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
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
