import type { NextConfig } from "next";
import { reglesEntetes } from "./src/lib/securite/entetes";

/**
 * Routes réservées au développement.
 *
 * Un fichier `page.dev.tsx` n'est une route que si `dev.tsx` figure dans
 * `pageExtensions` — et il n'y figure qu'hors production. Dans un build de
 * production, ces fichiers ne sont pas compilés : l'URL correspondante
 * n'existe pas, il n'y a rien à atteindre ni à deviner. C'est ce que doit
 * valoir « impossible en production » pour un chemin de commodité, plutôt
 * qu'une condition écrite à la main dans le corps de la page.
 *
 * La liste de base reprend le défaut de Next (`pageExtensions` remplace le
 * défaut, il ne s'y ajoute pas).
 */
const EXTENSIONS_PAGES = ["tsx", "ts", "jsx", "js"];
const EXTENSIONS_PAGES_DEV = ["dev.tsx", "dev.ts"];

/**
 * La taille maximale d'un corps de requête : un rapport de vérification va
 * jusqu'à 20 Mo (`src/lib/rapports/validator.ts`), 25 laissent la marge des
 * métadonnées du FormData. Au-delà, passer à un upload S3 pré-signé.
 *
 * Une seule valeur pour deux réglages, qui doivent rester égaux : quand un
 * proxy tourne, Next garde le corps en mémoire et le COUPE à
 * `proxyClientMaxBodySize` (10 Mo par défaut) avant de le passer à l'action
 * — un rapport de 15 Mo arrivait tronqué, et l'action échouait sur un
 * fichier qu'elle déclare accepter (audit du proxy, 2026-11-05).
 */
const LIMITE_CORPS_REQUETE = "25mb";

const nextConfig: NextConfig = {
  // Serveur autonome (`.next/standalone/server.js`) pour Clever Cloud (plan
  // de bascule, 0.3) : seules les dépendances tracées sont copiées. `public/`
  // et `.next/static` ne le sont pas : `scripts/preparer-standalone.sh` les
  // ajoute après le build. Vercel construit à sa façon et n'en est pas gêné.
  output: "standalone",
  pageExtensions:
    process.env.NODE_ENV === "production"
      ? EXTENSIONS_PAGES
      : [...EXTENSIONS_PAGES, ...EXTENSIONS_PAGES_DEV],
  // Pas d'en-tête `x-powered-by: Next.js` : il n'apprend rien à l'utilisateur
  // et désigne le cadre à viser (audit du 2026-10-13).
  poweredByHeader: false,
  // AVIF d'abord : à qualité égale, la photo du hero pèse nettement moins
  // qu'en WebP — c'est l'image la plus lourde de la page publique et celle
  // qui compte pour le LCP. Les navigateurs sans AVIF reçoivent du WebP.
  images: { formats: ["image/avif", "image/webp"] },
  experimental: {
    serverActions: { bodySizeLimit: LIMITE_CORPS_REQUETE },
    proxyClientMaxBodySize: LIMITE_CORPS_REQUETE,
  },
  // En-têtes de sécurité sur toutes les réponses — le détail, la CSP à nonce
  // posée par le proxy et la CSP propre aux fichiers déposés sont dans
  // `src/lib/securite/entetes.ts`.
  async headers() {
    return reglesEntetes();
  },
};

export default nextConfig;
