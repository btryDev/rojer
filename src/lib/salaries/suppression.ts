/**
 * « Supprimer ce salarié » — l'effacement réel d'une personne et de tout ce
 * qui la vise.
 *
 * DÉCISION DE LA PROPRIÉTAIRE, 2026-09-27 : « quand employeur supprime il est
 * averti que data supprimé définitivement », puis, sur la question des lignes
 * de calendrier, « A » : la fiche, ses titres, ses lignes de calendrier
 * (`Verification.salarieId`), leurs rapports — fichiers compris —, leurs
 * actions, et les signatures posées sur ces rapports partent ensemble, dans une
 * transaction. Une signature dont l'objet a disparu ne prouve plus rien.
 *
 * `Verification.salarieId` reste `onDelete: Restrict` en base : la garde tient
 * pour tout AUTRE chemin. Celui-ci efface les lignes explicitement, avant la
 * fiche ; il n'y a pas de migration.
 *
 * « Sortie de l'effectif » (`basculerActif`) est un autre geste, inchangé :
 * réversible, il garde tout.
 */

import { prisma } from "@/lib/prisma";

/** Ce que la suppression emporte, compté pour la confirmation. */
export type PerimetreSuppressionSalarie = {
  titres: number;
  rapports: number;
  actions: number;
  signatures: number;
};

const surSesLignes = (etablissementId: string, salarieId: string) => ({
  verification: { salarieId, etablissementId },
});

/**
 * Compte ce qui partira. `null` si la personne n'est pas de cet établissement.
 * Même périmètre que `effacerSalarie` — les deux lisent `surSesLignes`.
 */
export async function perimetreSuppressionSalarie(
  etablissementId: string,
  salarieId: string,
): Promise<PerimetreSuppressionSalarie | null> {
  const s = await prisma.salarie.findFirst({
    where: { id: salarieId, etablissementId },
    select: { _count: { select: { titres: true } } },
  });
  if (!s) return null;
  const rapports = await prisma.rapportVerification.findMany({
    where: surSesLignes(etablissementId, salarieId),
    select: { id: true },
  });
  const [actions, signatures] = await Promise.all([
    prisma.action.count({ where: surSesLignes(etablissementId, salarieId) }),
    prisma.signature.count({
      where: {
        etablissementId,
        objetType: "rapport_verification",
        objetId: { in: rapports.map((r) => r.id) },
      },
    }),
  ]);
  return {
    titres: s._count.titres,
    rapports: rapports.length,
    actions,
    signatures,
  };
}

/**
 * Efface, dans une transaction, et rend les clés des fichiers à libérer
 * ensuite. `null` si la personne n'est pas de cet établissement — rien n'est
 * touché. L'appartenance de l'établissement à l'utilisateur est vérifiée par
 * l'appelant (`assertEtablissementOwnership`) ; chaque écriture ci-dessous est
 * en plus bornée à l'établissement.
 */
export async function effacerSalarie(
  etablissementId: string,
  salarieId: string,
): Promise<{ cles: string[] } | null> {
  return prisma.$transaction(async (tx) => {
    const s = await tx.salarie.findFirst({
      where: { id: salarieId, etablissementId },
      select: { id: true },
    });
    if (!s) return null;

    const rapports = await tx.rapportVerification.findMany({
      where: surSesLignes(etablissementId, salarieId),
      select: { id: true, fichierCle: true },
    });
    // Les signatures d'abord : `objetId` n'a pas de clé étrangère, rien ne les
    // emporterait.
    await tx.signature.deleteMany({
      where: {
        etablissementId,
        objetType: "rapport_verification",
        objetId: { in: rapports.map((r) => r.id) },
      },
    });
    // Les lignes : leurs rapports et leurs actions suivent en cascade.
    await tx.verification.deleteMany({ where: { salarieId, etablissementId } });
    // La fiche : ses titres suivent en cascade (`TitreSalarie.salarie`).
    await tx.salarie.deleteMany({ where: { id: salarieId, etablissementId } });

    return { cles: rapports.map((r) => r.fichierCle) };
  });
}
