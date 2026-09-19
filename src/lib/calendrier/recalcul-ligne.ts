// Le recalcul d'UNE ligne de suivi, dans la transaction d'un dépôt ou d'une
// suppression de rapport — ADR-036, lot 4 (2026-09-19).
//
// CE QU'IL REMPLACE. Le dépôt faisait « rouler » la ligne (`rouler` : date du
// rapport + périodicité, ou le statut du résultat pour un ponctuel), et la
// suppression la faisait « reculer » en transmettant l'échéance honorée de
// rapport en rapport, sur quatre-vingts lignes. Deux calculs de date de plus,
// à côté de celui de la régénération : chacun avait sa règle, et la
// régénération suivante ne recalculait rien hors changement de rythme. Ils
// disparaissent. Le dépôt et la suppression passent par ICI, et ici passe par
// la même décision que la régénération.
//
// COMMENT, ET POURQUOI PAS PLUS PETIT. Les faits d'une ligne ne se lisent pas
// sur la ligne seule :
//  · son RYTHME EFFECTIF et son PREMIER PAS dépendent des prescriptions en
//    vigueur, que `appliquerPrescriptions` résout sur le résultat du matching
//    de tout l'établissement — quelles obligations s'appliquent, quels
//    appareils les déclenchent, dans quel ordre les prescriptions se
//    départagent ;
//  · son HÉRITAGE (`heritageDesRetirees`) se lit sur les AUTRES lignes, celles
//    qu'une succession fait absorber ;
//  · son IDENTITÉ peut être une adoption (`succedeA`), résolue par le
//    réconciliateur.
// Recopier ces trois règles pour une ligne serait écrire un second calculateur
// — l'état que l'ADR-036 existe pour quitter. Ce module rejoue donc la passe
// ENTIÈRE sur une lecture faite dans la transaction (`lireEntrees` puis
// `planifier`, les fonctions mêmes de `regenererUnePasse`) et n'en retient que
// la décision portant sur CETTE ligne. La régénération et le dépôt ne peuvent
// pas diverger : c'est le même code, sur les mêmes faits. Le coût est celui
// d'une régénération — quatre requêtes —, que le dépôt payait déjà juste après
// (`regenererApresMutation`).
//
// CE QU'IL ÉCRIT, ET RIEN D'AUTRE : `datePrevue` et `statut`, les deux champs
// que la décision de date produit. Le reste du plan — un libellé à réaligner,
// une adoption, un archivage, la ligne d'à côté — est l'affaire de la
// régénération qui suit le dépôt ; l'écrire ici ferait de ce module une
// seconde régénération, sans son sceau ni ses trois passes.
//
// LE RYTHME `autre` SANS TITRE est servi HORS de `echeanceDeLigne`, comme
// l'ADR-036 § 4 le demande : une telle ligne n'est pas générée, et le plan la
// traite dans sa boucle finale (NB4) — solde par `statutDepuisResultat`, DATE
// INCHANGÉE. Ce module en reprend la décision comme celle de toute ligne.
//
// CE MODULE N'EST PAS UN `"use server"` : il reçoit un client de transaction et
// fait confiance à l'appelant, qui a vérifié la propriété de l'établissement.

import type { Prisma } from "@prisma/client";
import { reouvrirSansRapportRealise } from "./generateur";
import { lireEntrees, planifier } from "./passe";

/**
 * Levée quand la ligne de suivi n'a pas la date ou le statut que la lecture a
 * vus au moment d'écrire. La transaction est annulée ; rien n'est écrit,
 * l'utilisateur recommence sur l'état à jour.
 *
 * Exportée d'ici, et non de `rapports/actions.ts` où elle vivait : un module
 * `"use server"` n'exporte que des fonctions async (l'`export class` posé au
 * N2 faisait rejeter tout le module par `next build`).
 */
export class LigneModifieeEntreTemps extends Error {
  constructor() {
    super(
      "Cette échéance a été modifiée pendant l'enregistrement. Rechargez la page et recommencez.",
    );
    this.name = "LigneModifieeEntreTemps";
  }
}

/** Le client de transaction interactive que les deux actions de rapport tiennent. */
export type ClientTransaction = Prisma.TransactionClient;

export type OptionsRecalcul = {
  /** L'horloge de la passe : prescriptions en vigueur, origine d'une ligne à
   *  naître. Défaut = `new Date()`. */
  now?: Date;
  // ~~`garderLegs`~~ — retirée au lot 5 de l'ADR-036 (2026-09-19) avec la
  // garde du legs : le dépôt et le retrait décident comme la régénération.
};

export type ResultatRecalcul =
  | { ecrit: false }
  | { ecrit: true; datePrevue: Date; statut: string };

/**
 * Recalcule la date et le statut d'UNE ligne depuis ses faits, et les écrit
 * s'ils changent — sous condition des valeurs lues.
 *
 * À appeler DANS la transaction de l'appelant, APRÈS l'écriture du rapport
 * (création ou suppression) : la lecture voit alors l'état que la transaction
 * est en train de produire. La ligne est verrouillée (`FOR UPDATE`) avant
 * toute lecture ; verrouiller une ligne déjà tenue par la même transaction ne
 * coûte rien, et ce module reste sûr appelé seul.
 *
 * Une ligne que le plan ne met pas à jour — inchangée, à archiver, à
 * supprimer — n'est pas touchée : sa date n'a pas à bouger, ou sa sortie est
 * l'affaire de la régénération.
 */
export async function recalculerLigne(
  tx: ClientTransaction,
  verificationId: string,
  options: OptionsRecalcul = {},
): Promise<ResultatRecalcul> {
  const now = options.now ?? new Date();
  await tx.$queryRaw`SELECT 1 FROM "Verification" WHERE "id" = ${verificationId} FOR UPDATE`;

  const ligne = await tx.verification.findUnique({
    where: { id: verificationId },
    select: { etablissementId: true },
  });
  if (ligne === null) return { ecrit: false };

  const lecture = await lireEntrees(tx, ligne.etablissementId);
  const lue = lecture.existantes.find((e) => e.id === verificationId);
  // Inatteignable sous le verrou : la ligne vient d'être lue par son
  // identifiant. Rien à recalculer si elle n'est plus là.
  if (lue === undefined) return { ecrit: false };

  const plan = planifier(lecture, now);
  const trouvee = plan.aMettreAJour.find((m) => m.id === verificationId);
  // UNE LIGNE QUE LE PLAN NE MET PAS À JOUR — archivée, porteur disparu,
  // obligation retirée — et qui porte un statut réalisé SANS rapport réalisé :
  // le cas d'un retrait du seul rapport réalisé, d'où venait ce statut.
  // `porteUneTrace` le compterait ensuite comme une trace que plus rien ne
  // rouvre. Elle repasse « à planifier », DATE INCHANGÉE — ce que l'ancien
  // `supprimerRapport` faisait (relecture du lot 4, 2026-09-19). Son sort —
  // archivée, supprimée — reste l'affaire de la régénération.
  //
  // ~~Seulement au retrait d'un rapport réalisé (`garderLegs: false`).~~ Sans
  // condition depuis le lot 5 (2026-09-19) : un statut réalisé ne survit pas
  // sans rapport réalisé. La règle est écrite une fois,
  // `reouvrirSansRapportRealise`, que la régénération appelle aussi (boucle
  // NB4) — avec une portée plus étroite, dite dans sa documentation. Au dépôt,
  // la ligne n'est jamais dans ce cas : un dépôt réalisé lui donne son rapport
  // réalisé.
  const reouvert = reouvrirSansRapportRealise(lue);
  const cible =
    trouvee ??
    (reouvert !== lue.statut
      ? { datePrevue: lue.datePrevue, statut: reouvert }
      : undefined);
  if (cible === undefined) return { ecrit: false };
  if (
    cible.datePrevue.getTime() === lue.datePrevue.getTime() &&
    cible.statut === lue.statut
  ) {
    return { ecrit: false };
  }
  const { count } = await tx.verification.updateMany({
    where: {
      id: verificationId,
      // Les deux champs que ce recalcul décide, tels que la lecture les a vus.
      // Sous le verrou ils ne peuvent pas avoir bougé ; si une voie inconnue
      // les faisait bouger, on annule TOUT plutôt que d'écrire une date
      // calculée sur un passé révolu.
      datePrevue: lue.datePrevue,
      statut: lue.statut,
    },
    data: { datePrevue: cible.datePrevue, statut: cible.statut },
  });
  if (count !== 1) throw new LigneModifieeEntreTemps();
  return { ecrit: true, datePrevue: cible.datePrevue, statut: cible.statut };
}
