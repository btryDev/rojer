import { workerDisponible } from "./lancer";

/**
 * Ce qui empêche le fil des PDF de tenir sa promesse, vu AU DÉMARRAGE du
 * serveur (`src/instrumentation.ts`, ADR-059) plutôt qu'au premier export
 * (revue de B1, 2026-11-10) :
 *
 *   - le fichier du fil manque (un build sans `build:cc`, une image faite à la
 *     main) : sinon le serveur démarre, passe le contrôle de santé, puis tous
 *     les PDF tombent en 500 et le ZIP part sans ses pièces ;
 *   - `--max-old-space-size` est posé (option de Node ou `NODE_OPTIONS`) : il
 *     prend le pas sur le tas demandé au fil, qui grossit alors sans borne —
 *     mesuré : 2 096 Mo de limite pour 64 demandés.
 *
 * En production, chaque problème arrête le démarrage : le contrôle de santé
 * échoue et l'instance précédente reste en service. Rend la liste, vide si
 * tout va bien ; pure, pour ses tests.
 */
export function problemesDuFilDesPdf(contexte: {
  production: boolean;
  workerPresent: boolean;
  execArgv: readonly string[];
  nodeOptions: string | undefined;
}): string[] {
  if (!contexte.production) return [];
  const problemes: string[] = [];
  if (!contexte.workerPresent) {
    problemes.push(
      "dist-pdf/pdf-worker.mjs absent : le build CC (`pnpm build:cc`) le construit et le copie dans le serveur autonome.",
    );
  }
  const options = [...contexte.execArgv, contexte.nodeOptions ?? ""].join(" ");
  if (/max-old-space-size/.test(options)) {
    problemes.push(
      "--max-old-space-size est posé (option de Node ou NODE_OPTIONS) : il annule la borne de tas du fil des PDF (EXPORT_TAS_MAX_MO). Le retirer.",
    );
  }
  return problemes;
}

export function verifierFilDesPdfAuDemarrage(): void {
  const problemes = problemesDuFilDesPdf({
    production: process.env.NODE_ENV === "production",
    workerPresent: workerDisponible(),
    execArgv: process.execArgv,
    nodeOptions: process.env.NODE_OPTIONS,
  });
  if (problemes.length > 0) {
    throw new Error(`Fil des PDF (ADR-059) :\n- ${problemes.join("\n- ")}`);
  }
}
