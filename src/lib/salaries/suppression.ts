/**
 * « Supprimer ce salarié » — l'effacement réel d'une personne et de tout ce
 * qui la vise.
 *
 * DÉCISION DE LA PROPRIÉTAIRE, 2026-09-27 : « quand employeur supprime il est
 * averti que data supprimé définitivement », puis, sur la question des lignes
 * de calendrier, « A » : la fiche, ses titres, ses lignes de calendrier
 * (`Verification.salarieId`), leurs actions, leurs rapports — fichiers
 * compris — et les signatures posées sur ces rapports partent ensemble, dans
 * une transaction. Une signature dont l'objet a disparu ne prouve plus rien.
 *
 * DES RAPPORTS, IL N'Y EN A PAS — en principe. Depuis `bb03cdd` (2026-08-27),
 * `rapports/actions.ts` refuse tout dépôt sur une ligne de salarié (« Rojer en
 * enregistre l'existence et les dates, jamais le document »). La branche qui
 * efface rapports, fichiers et signatures reste : c'est le filet pour des
 * données antérieures à cette garde. La confirmation ne les nomme que si le
 * compte n'est pas nul (contre-lecture du 2026-09-27, M1).
 *
 * `Verification.salarieId` reste `onDelete: Restrict` en base : la garde tient
 * pour tout AUTRE chemin. Celui-ci efface les lignes explicitement, avant la
 * fiche ; il n'y a pas de migration.
 *
 * « Sortie de l'effectif » (`basculerActif`) est un autre geste, inchangé :
 * réversible, il garde tout.
 */

import type { Db } from "@/lib/auth/compte";

/** Ce que la suppression emporte, compté pour la confirmation. */
export type PerimetreSuppressionSalarie = {
  titres: number;
  /** Ses lignes de calendrier — ouvertes, ou archivées parce qu'elles portent une action. */
  echeances: number;
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
  db: Db,
  etablissementId: string,
  salarieId: string,
): Promise<PerimetreSuppressionSalarie | null> {
  const s = await db.salarie.findFirst({
    where: { id: salarieId, etablissementId },
    select: { _count: { select: { titres: true } } },
  });
  if (!s) return null;
  const rapports = await db.rapportVerification.findMany({
    where: surSesLignes(etablissementId, salarieId),
    select: { id: true },
  });
  const [echeances, actions, signatures] = await Promise.all([
    db.verification.count({ where: { salarieId, etablissementId } }),
    db.action.count({ where: surSesLignes(etablissementId, salarieId) }),
    db.signature.count({
      where: {
        etablissementId,
        objetType: "rapport_verification",
        objetId: { in: rapports.map((r) => r.id) },
      },
    }),
  ]);
  return {
    titres: s._count.titres,
    echeances,
    rapports: rapports.length,
    actions,
    signatures,
  };
}

/**
 * Efface, dans une transaction, et rend les clés des fichiers à libérer
 * ensuite. `null` si la personne n'est pas de cet établissement — rien n'est
 * touché. L'appartenance de l'établissement à l'utilisateur est vérifiée par
 * l'appelant (`assertEtablissementDuCompte`, qui rend le client borné au
 * compte, ADR-051) ; chaque écriture ci-dessous est
 * en plus bornée à l'établissement.
 */
export async function effacerSalarie(
  db: Db,
  etablissementId: string,
  salarieId: string,
): Promise<{ cles: string[] } | null> {
  return db.$transaction(async (tx) => {
    const s = await tx.salarie.findFirst({
      where: { id: salarieId, etablissementId },
      select: { id: true },
    });
    if (!s) return null;

    // Ses lignes sont verrouillées d'abord (2026-10-28). Un rapport ou une
    // action qui viserait l'une d'elles pendant l'effacement attend la fin de
    // la transaction, puis échoue sur sa propre clé étrangère — au lieu de
    // faire échouer l'effacement, que la base refuse depuis que les preuves
    // ne partent plus en cascade (`NoAction`).
    await tx.$queryRaw`SELECT 1 FROM "Verification" WHERE "salarieId" = ${salarieId} AND "etablissementId" = ${etablissementId} FOR UPDATE`;

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
    // ~~Les lignes : leurs rapports et leurs actions suivent en cascade.~~
    // [2026-10-28 : plus de cascade — la base refuse de supprimer une ligne
    // qui porte encore un rapport ou une action (migration
    // `20261030100000_preuves_protegees_en_base`). L'effacement est voulu
    // ici (RGPD) : les preuves partent d'abord, nommément, puis les lignes.]
    await tx.action.deleteMany({
      where: { etablissementId, ...surSesLignes(etablissementId, salarieId) },
    });
    // Une action d'une AUTRE ligne levée sur l'un de ces rapports garderait un
    // `leveeRapportId` vers un rapport disparu — la colonne n'a pas de clé
    // étrangère. Le lien est vidé ; la levée elle-même (date, commentaire)
    // reste.
    await tx.action.updateMany({
      where: { etablissementId, leveeRapportId: { in: rapports.map((r) => r.id) } },
      data: { leveeRapportId: null },
    });
    await tx.rapportVerification.deleteMany({
      where: { etablissementId, ...surSesLignes(etablissementId, salarieId) },
    });
    await tx.verification.deleteMany({ where: { salarieId, etablissementId } });
    // La fiche : ses titres suivent en cascade (`TitreSalarie.salarie`).
    await tx.salarie.deleteMany({ where: { id: salarieId, etablissementId } });

    return { cles: rapports.map((r) => r.fichierCle) };
  });
}
