import type { MetadataRoute } from "next";
import { OUVERT_AUX_MOTEURS } from "@/lib/indexation";

/**
 * `robots.txt` (audit Next.js du 2026-10-14, B11).
 *
 * Seules la page d'accueil et les pages d'entrée (`/login`, `/signup`) sont
 * offertes aux moteurs. Tout le reste est exclu :
 * - **les pages publiques à lien** — `/acces/[jeton]`, `/signe/[id]`,
 *   `/verifier/[id]` : elles ne valent que pour qui a reçu le lien, et un robot
 *   qui suivrait un jeton n'a rien à y faire ;
 * - **le registre public d'accessibilité** — `/accessibilite/[slug]` et son
 *   affiche. Tranché à la lecture du code : l'obligation est de tenir le
 *   registre consultable « sur place ou en ligne » (schéma, `RegistreAccessibilite`),
 *   et le produit le sert par le QR code collé à l'entrée et par le lien
 *   transmis (commentaire de la page : « tel qu'un visiteur le lit après avoir
 *   scanné le QR code […], et tel qu'un contrôleur l'ouvre »). Aucune ADR ne
 *   demande qu'il soit trouvé par un moteur ; l'indexer publierait la liste des
 *   établissements clients de Rojer. Un exploitant qui veut le référencer le
 *   lie depuis son propre site ;
 * - **l'application authentifiée** et **`/api`**.
 *
 * `Disallow` empêche l'exploration, pas la mention d'une URL qu'un tiers
 * aurait publiée : c'est le bon outil pour des liens porteurs de jeton, qu'on
 * ne veut pas voir ouverts par un robot.
 *
 * Toute nouvelle racine de `src/app` doit être rangée ici, d'un côté ou de
 * l'autre : `robots.test.ts` le vérifie.
 *
 * Tant que le site n'est pas ouvert aux moteurs (`OUVERT_AUX_MOTEURS`,
 * `lib/indexation.ts`), tout est interdit, accueil compris.
 */
export const RACINES_INDEXABLES = ["/", "/login", "/signup"] as const;

export const RACINES_EXCLUES = [
  // Les conditions générales (ADR-053 § 8) : publiques, mais provisoires —
  // à rendre indexables quand le texte relu par un juriste les remplacera.
  "/conditions",
  // L'écran d'essai gratuit (ADR-053 § 8), derrière la connexion.
  "/essai",
  // Pages publiques, à lien ou par slug.
  "/acces/",
  "/accessibilite/",
  "/signe/",
  "/verifier/",
  // Application authentifiée et parcours de compte.
  "/auth/",
  "/compte",
  "/dev/",
  "/duerp/",
  "/entreprises",
  "/etablissements/",
  "/invitation/",
  "/onboarding",
  // Routes.
  "/api/",
  "/.well-known/",
] as const;

export default function robots(): MetadataRoute.Robots {
  if (!OUVERT_AUX_MOTEURS) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...RACINES_EXCLUES],
    },
  };
}
