import type { MetadataRoute } from "next";
import { OUVERT_AUX_MOTEURS } from "@/lib/indexation";
import { adressePubliqueOuNull } from "@/lib/url-publique";

/**
 * `robots.txt` (audit Next.js du 2026-10-14, B11).
 *
 * Seules la page d'accueil, les pages d'entrée (`/login`, `/signup`), les
 * pages légales (`/legal/…`), les conditions générales et la page d'attente
 * (`/bientot`, 2026-11-23) sont offertes aux moteurs. Tout le reste est exclu :
 * - **les pages publiques à lien** — `/acces/[jeton]` (~~`/signe/[id]`,
 *   `/verifier/[id]`~~, retirées le 2026-11-21) : elles ne valent que pour qui
 *   a reçu le lien, et un robot qui suivrait un jeton n'a rien à y faire ;
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
// [2026-11-23, décision de la propriétaire : la page publique part en ligne
// et doit être trouvée — « enlever, et justement favoriser ». Les pages
// légales et les conditions générales, rédigées depuis (#360), et la page
// d'attente passent du côté indexable ; `sitemap.xml` les annonce.]
export const RACINES_INDEXABLES = ["/", "/login", "/signup", "/legal/", "/conditions", "/bientot"] as const;

export const RACINES_EXCLUES = [
  // ~~Les conditions générales (ADR-053 § 8) : publiques, mais provisoires —
  // à rendre indexables quand le texte relu par un juriste les remplacera.~~
  // ~~Mentions légales, confidentialité, cookies : publiques, mais leur texte
  // reste à écrire — à rendre indexables avec lui.~~
  // ~~« Rojer ouvre bientôt » : page d'attente, rien à y trouver par un
  // moteur.~~ [2026-11-23 : les trois sont indexables, voir plus haut.]
  // L'écran d'essai gratuit (ADR-053 § 8), derrière la connexion.
  "/essai",
  // Pages publiques, à lien ou par slug.
  "/acces/",
  "/accessibilite/",
  // Application authentifiée et parcours de compte.
  "/auth/",
  "/compte",
  "/dev/",
  "/duerp/",
  "/entreprises",
  "/etablissements/",
  "/invitation/",
  "/onboarding",
  // Écrans du connecteur d'assistant (ADR-062) : consentement et choix du
  // compte d'une autorisation OAuth, rien à explorer.
  "/oauth/",
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
    // Annoncé seulement quand l'adresse publique est connue : jamais un
    // `localhost` dans un robots.txt servi.
    ...(process.env.PUBLIC_APP_URL && adressePubliqueOuNull()
      ? { sitemap: `${adressePubliqueOuNull()}/sitemap.xml` }
      : {}),
  };
}
