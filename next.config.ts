import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  pageExtensions:
    process.env.NODE_ENV === "production"
      ? EXTENSIONS_PAGES
      : [...EXTENSIONS_PAGES, ...EXTENSIONS_PAGES_DEV],
  experimental: {
    serverActions: {
      // Les rapports de vérification peuvent atteindre 20 Mo (cf.
      // `src/lib/rapports/validator.ts`) ; on monte la limite à 25 Mo
      // pour garder une marge sur les métadonnées du FormData. Au-delà,
      // passer à un upload S3 pré-signé.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
