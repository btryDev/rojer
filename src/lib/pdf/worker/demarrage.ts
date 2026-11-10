import { drapeauQuiLEmporte } from "./borne";
import { workerDisponible } from "./lancer";

/**
 * Ce qui empêche le rendu des PDF de tenir sa promesse, vu AU DÉMARRAGE du
 * serveur (`src/instrumentation.ts`, ADR-059) plutôt qu'au premier export
 * (revue de B1, 2026-11-10) : le fichier du rendu manque (un build sans
 * `build:cc`, une image faite à la main). Sinon le serveur démarre, passe le
 * contrôle de santé, puis tous les PDF tombent en 500 et le ZIP part sans
 * ses pièces.
 *
 * ~~`--max-old-space-size` posé : refusé.~~ [2026-11-10, soir : Clever Cloud
 * le pose lui-même — le refuser refusait chaque déploiement. Le rendu se fait
 * désormais dans un processus enfant (`lancer.ts`), lancé avec ses propres
 * drapeaux et sans `NODE_OPTIONS` : le drapeau du serveur ne l'atteint plus.
 * Il est seulement noté au démarrage (`informationsDuRendu`), pour qu'on sache
 * ce que la plateforme pose.]
 *
 * En production, un problème lève dans `register()`. [2026-11-10, vérifié sur
 * le serveur autonome : Next ne s'arrête pas, il répond 500 à toute requête —
 * le message est écrit, aucune page n'est servie. Que Clever Cloud refuse
 * alors le déploiement reste à vérifier, `docs/chantiers-ouverts.md` § 23.]
 * Rend le problème, `null` si tout va bien ; pure, pour ses tests.
 */
export function problemeDuRenduDesPdf(contexte: { production: boolean; workerPresent: boolean }): string | null {
  if (!contexte.production || contexte.workerPresent) return null;
  return "dist-pdf/pdf-worker.mjs absent : le build CC (`pnpm build:cc`) le construit et le copie dans le serveur autonome.";
}

/**
 * Ce que la plateforme pose sur la mémoire du SERVEUR (pas du rendu, qui a
 * ses propres drapeaux) : à lire dans les journaux de démarrage. `null` si
 * rien n'est posé. (Clever Cloud : la variable `NODE_OPTIONS`, 644 Mo en XS,
 * relevé le 2026-11-10.)
 */
export function informationsDuRendu(contexte: {
  execArgv: readonly string[];
  nodeOptions: string | undefined;
}): string | null {
  const tas = drapeauQuiLEmporte(contexte.execArgv, contexte.nodeOptions);
  return tas === null
    ? null
    : `pdf : le serveur tourne avec --max-old-space-size=${tas} ; le rendu des PDF a sa propre borne (EXPORT_TAS_MAX_MO).`;
}

export function verifierRenduDesPdfAuDemarrage(): void {
  const probleme = problemeDuRenduDesPdf({
    production: process.env.NODE_ENV === "production",
    workerPresent: workerDisponible(),
  });
  if (probleme) throw new Error(`Rendu des PDF (ADR-059) : ${probleme}`);
  const info = informationsDuRendu({
    execArgv: process.execArgv,
    nodeOptions: process.env.NODE_OPTIONS,
  });
  if (info) console.info(info);
}
