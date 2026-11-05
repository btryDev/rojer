import "server-only";

// La règle de conservation des écrits annexés au registre (ADR-056 § 4) :
// deux fichiers au plus par ligne, celui en cours et le précédent.
//
// Elle rend les clés à libérer — APRÈS la transaction, jamais dedans : un
// stockage effacé pour une base qui finit par refuser laisserait une ligne
// sans fichier (`suppression/fichiers.ts`).

import type { Prisma } from "@prisma/client";

type Client = Prisma.TransactionClient;

/** Le fichier en cours devient le précédent : il garde sa date de dépôt. */
async function archiverLeFichierEnCours(
  tx: Client,
  id: string,
  maintenant: Date,
): Promise<void> {
  await tx.pieceEtatPermanent.update({
    where: { id },
    data: { enCours: null, remplaceeLe: maintenant },
  });
}

/** Efface les versions précédentes en base et rend leurs clés. */
async function effacerLesPrecedents(
  tx: Client,
  etablissementId: string,
  obligationId: string,
): Promise<string[]> {
  const precedents = await tx.pieceEtatPermanent.findMany({
    // L'état se lit sur `enCours`, la colonne de l'unicité ; `remplaceeLe` n'en
    // est que la date (seconde relecture du 2026-11-05).
    where: { etablissementId, obligationId, enCours: null },
    select: { id: true, fichierCle: true },
  });
  if (precedents.length === 0) return [];
  await tx.pieceEtatPermanent.deleteMany({
    where: { id: { in: precedents.map((p) => p.id) } },
  });
  return precedents.map((p) => p.fichierCle);
}

async function fichierEnCours(tx: Client, etablissementId: string, obligationId: string) {
  return tx.pieceEtatPermanent.findFirst({
    where: { etablissementId, obligationId, enCours: true },
    select: { id: true },
  });
}

/**
 * Avant un dépôt : l'ancien précédent part TOUJOURS — l'écran le promet
 * (« effacée au prochain dépôt ») —, et le fichier en cours, s'il y en a un,
 * devient le précédent. Après le dépôt, la ligne porte au plus deux fichiers.
 *
 * ~~Une seule fonction pour le dépôt et le retrait~~ (relecture du
 * 2026-11-05) : après un « Pas encore », la ligne n'avait plus de fichier en
 * cours, et le dépôt suivant gardait le précédent au lieu de l'effacer.
 */
export async function preparerUnDepot(
  tx: Client,
  etablissementId: string,
  obligationId: string,
  maintenant: Date,
): Promise<string[]> {
  const aLiberer = await effacerLesPrecedents(tx, etablissementId, obligationId);
  const enCours = await fichierEnCours(tx, etablissementId, obligationId);
  if (enCours) await archiverLeFichierEnCours(tx, enCours.id, maintenant);
  return aLiberer;
}

/**
 * Au retrait de la déclaration (« Pas encore ») : le fichier en cours devient
 * le précédent, et l'ancien précédent part. Sans fichier en cours, rien ne
 * bouge — un second « Pas encore » n'efface pas la seule version gardée.
 */
export async function retirerLeFichierEnCours(
  tx: Client,
  etablissementId: string,
  obligationId: string,
  maintenant: Date,
): Promise<string[]> {
  const enCours = await fichierEnCours(tx, etablissementId, obligationId);
  if (!enCours) return [];
  const aLiberer = await effacerLesPrecedents(tx, etablissementId, obligationId);
  await archiverLeFichierEnCours(tx, enCours.id, maintenant);
  return aLiberer;
}
