import "server-only";
// Le plafond de stockage des formules (ADR-053 § 14) : la taille des fichiers
// que le compte référence encore. Chaque dépôt passe par `deposerFichier`
// (garde : `quotas-garde.test.ts`), qui refuse au plafond AVANT d'écrire,
// dépose, puis enregistre la taille (`FichierStocke`). Un fichier retiré
// cesse de compter : seules les clés encore référencées sont sommées.

import { getOptionalCompte, requireCompte, type Db } from "@/lib/auth/compte";
import { getStorage } from "@/lib/storage";
import { refusStockage } from "./quotas";
import { contexteDroits, offreLancee } from "./lancement";

/** Les champs qui portent une clé de fichier, par modèle. */
export const CHAMPS_FICHIERS = {
  etablissement: ["photoCle"],
  rapportVerification: ["fichierCle"],
  action: ["leveeFichierCle"],
  prestataire: ["attestationUrssafCle", "assuranceRcProCle", "kbisCle"],
  piecePrestataire: ["fichierCle"],
  registreAccessibilite: ["attestationCle", "agendaAdapCle", "attestationFormationCle"],
  analyseLegionelle: ["rapportCle"],
} as const;

type Lecteur = { findMany(a: object): Promise<Record<string, string | null>[]> };

/** Les clés de fichiers que le compte référence (client borné au compte). */
export async function clesDeFichiers(db: Db): Promise<string[]> {
  const lots = await Promise.all(
    Object.entries(CHAMPS_FICHIERS).map(async ([modele, champs]) => {
      const lignes = await (db as unknown as Record<string, Lecteur>)[modele].findMany({
        where: { OR: champs.map((c) => ({ [c]: { not: null } })) },
        select: Object.fromEntries(champs.map((c) => [c, true])),
      });
      return lignes.flatMap((l) => champs.map((c) => l[c]).filter((v): v is string => typeof v === "string"));
    }),
  );
  return [...new Set(lots.flat())];
}

/** Les octets que le compte occupe : les tailles connues des fichiers qu'il référence. */
export async function octetsUtilises(db: Db): Promise<number> {
  const cles = await clesDeFichiers(db);
  if (cles.length === 0) return 0;
  const { _sum } = await db.fichierStocke.aggregate({ where: { cle: { in: cles } }, _sum: { octets: true } });
  return _sum.octets ?? 0;
}

/**
 * Déposer un fichier pour le compte de la session : le refus au plafond
 * (rendu, rien n'est écrit), sinon le dépôt — qui peut lever, comme
 * `put` —, puis sa taille enregistrée. Un échec de cet enregistrement ne
 * défait pas le dépôt : le fichier ne compte pas, au bénéfice du client.
 */
export async function deposerFichier(cle: string, data: Buffer, mime: string): Promise<string | null> {
  // Offre lancée : la session est exigée, le plafond s'applique. Avant : la
  // taille s'enregistre si la session se lit, sans rien exiger (la reprise,
  // `scripts/reprendre-tailles-fichiers.ts`, rattrape le reste).
  const c = offreLancee(contexteDroits()) ? await requireCompte() : await getOptionalCompte().catch(() => null);
  if (c) {
    const refus = await refusStockage(c.db, c.compte.compteId, () => octetsUtilises(c.db), data.length);
    if (refus) return refus;
  }
  await getStorage().put(cle, data, mime);
  await c?.db.fichierStocke
    .upsert({
      where: { cle },
      create: { cle, compteId: c.compte.compteId, octets: data.length },
      update: { octets: data.length },
    })
    .catch((e: unknown) => console.error(`[stockage] taille non enregistrée (${cle})`, e instanceof Error ? e.message : e));
  return null;
}
