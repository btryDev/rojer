import "server-only";
// Le plafond de stockage des formules (ADR-053 § 14) : la taille des fichiers
// que le compte référence encore, plus ses dépôts en cours. Chaque dépôt
// passe par `deposerFichier` (garde : `quotas-garde.test.ts`) : SOUS LE
// VERROU DU COMPTE, refus au plafond ou réservation de la taille
// (`FichierStocke`) ; puis le dépôt ; un dépôt qui échoue rend sa
// réservation. Un fichier retiré cesse de compter : seules les clés encore
// référencées sont sommées, avec les réservations récentes (un dépôt dont la
// ligne n'est pas encore écrite).

import type { Prisma } from "@prisma/client";
import type { Db } from "@/lib/auth/compte";
import { CLES_STOCKEES } from "@/lib/suppression/cles-stockees";
import { libererFichiers } from "@/lib/suppression/fichiers";
import { getStorage } from "@/lib/storage";
import { motifDuGel, refusStockage } from "./quotas";
import { contexteDroits, offreLancee } from "./lancement";

type Lecteur = Db | Prisma.TransactionClient;
type Delegue = { findMany(a: object): Promise<Record<string, string | null>[]> };

/** Le temps pendant lequel une réservation compte sans être encore référencée. */
const DUREE_D_UNE_RESERVATION_MS = 15 * 60_000;

/** Les clés de fichiers que le compte référence (client borné au compte). */
export async function clesDeFichiers(db: Lecteur): Promise<string[]> {
  const lots = await Promise.all(
    Object.entries(CLES_STOCKEES).map(async ([modele, champs]) => {
      const delegue = (db as unknown as Record<string, Delegue>)[modele.charAt(0).toLowerCase() + modele.slice(1)];
      // Aucun filtre « non nul » : une colonne obligatoire le refuserait.
      const lignes = await delegue.findMany({ select: Object.fromEntries(champs.map((c) => [c, true])) });
      return lignes.flatMap((l) => champs.map((c) => l[c]).filter((v): v is string => typeof v === "string"));
    }),
  );
  return [...new Set(lots.flat())];
}

/**
 * Les octets que le compte occupe : les fichiers qu'il référence, et ses
 * réservations récentes. La somme en SQL, en entier long : au-delà de 2 Go,
 * un entier simple déborde. `compteId` : celui de la portée.
 */
export async function octetsUtilises(db: Lecteur, compteId: string, maintenant = new Date()): Promise<number> {
  const cles = await clesDeFichiers(db);
  const depuis = new Date(maintenant.getTime() - DUREE_D_UNE_RESERVATION_MS);
  const [{ total }] = await db.$queryRaw<{ total: bigint }[]>`
    SELECT COALESCE(SUM("octets"), 0)::bigint AS total FROM "FichierStocke"
    WHERE "compteId" = ${compteId}::uuid AND ("cle" = ANY(${cles}::text[]) OR "deposeLe" > ${depuis})`;
  return Number(total);
}

/**
 * Déposer un fichier pour un compte (`db` : son client borné, `compteId` :
 * celui de la portée). Offre lancée : refus au plafond (rendu, rien
 * d'écrit) ou réservation, sous le verrou du compte, puis le dépôt — qui
 * peut lever, comme `put`, et rend alors sa réservation. Avant le lancement :
 * le dépôt, puis la taille enregistrée.
 */
export async function deposerFichier(
  db: Db,
  compteId: string,
  cle: string,
  data: Buffer,
  mime: string,
  /** Le site du dépôt : gelé (§ 14), refusé AVANT de réserver et de téléverser. */
  cible?: { etablissementId: string },
): Promise<string | null> {
  if (cible) {
    const gel = await motifDuGel(db, compteId, cible);
    if (gel) return gel;
  }
  const ligne = { cle, compteId, octets: data.length };
  if (!offreLancee(contexteDroits())) {
    await getStorage().put(cle, data, mime);
    // Un échec ne défait pas le dépôt : le fichier ne compte pas, au bénéfice
    // du client, jusqu'à la reprise (`scripts/reprendre-tailles-fichiers.ts`).
    await Promise.resolve()
      .then(() => db.fichierStocke.upsert({ where: { cle }, create: ligne, update: { octets: data.length } }))
      .catch((e: unknown) => console.error(`[stockage] taille non enregistrée (${cle})`, e instanceof Error ? e.message : e));
    return null;
  }
  const refus = await db.$transaction(async (tx) => {
    const motif = await refusStockage(tx, compteId, () => octetsUtilises(tx, compteId), data.length, tx);
    if (motif) return motif;
    await tx.fichierStocke.upsert({ where: { cle }, create: ligne, update: { octets: data.length, deposeLe: new Date() } });
    return null;
  });
  if (refus) return refus;
  try {
    await getStorage().put(cle, data, mime);
  } catch (e) {
    await rendreReservations(db, [cle]);
    throw e;
  }
  return null;
}

/**
 * Effacer des fichiers ET leurs lignes du plafond de stockage, en un geste :
 * un dépôt abandonné (écriture refusée après le dépôt), une pièce remplacée,
 * un objet supprimé. Le seul chemin des modules qui déposent (garde :
 * `stockage-abandon.test.ts`) — sinon la ligne comptait encore et pouvait
 * refuser à tort un dépôt près du plafond. Ne lève jamais : un échec
 * d'effacement se journalise (`libererFichiers`), une ligne restée compte
 * trop, jamais trop peu.
 */
export async function abandonnerFichiers(db: Db, cles: (string | null | undefined)[], contexte: string): Promise<void> {
  const reelles = cles.filter((c): c is string => typeof c === "string" && c.length > 0);
  if (reelles.length === 0) return;
  await libererFichiers(reelles, contexte);
  await rendreReservations(db, reelles);
}

/**
 * Rendre les réservations de fichiers déposés puis abandonnés (écriture en
 * base refusée après le dépôt) : sinon ils compteraient encore pendant la
 * fenêtre des réservations, et un nouvel essai près du plafond serait refusé
 * à tort. À appeler avec l'effacement des fichiers. Un échec ne fait que
 * compter trop, jamais trop peu.
 */
async function rendreReservations(db: Db, cles: string[]): Promise<void> {
  if (cles.length === 0) return;
  try {
    await db.fichierStocke.deleteMany({ where: { cle: { in: cles } } });
  } catch {
    // Compter trop quinze minutes ne bloque rien d'autre que ce compte.
  }
}

/** Le stockage plein, pour l'annoncer dès l'ouverture d'un formulaire qui dépose (lot D). */
export async function stockagePlein(db: Db, compteId: string): Promise<string | null> {
  if (!offreLancee(contexteDroits())) return null;
  return refusStockage(db, compteId, () => octetsUtilises(db, compteId), 1);
}
