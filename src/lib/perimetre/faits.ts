// La collecte des faits que `couverture.ts` met en forme.
//
// Séparé pour la même raison que `reperterSansEcheance` l'est de
// `equipementsSansEcheance` : le calcul doit rester pur et testable sans base,
// et la lecture doit rester au même endroit pour tous les écrans qui
// l'affichent. Un écran qui collecterait ses faits lui-même finirait par en
// oublier un, et le bandeau dirait moins que la vérité sans que rien le
// signale.
//
// Ce module ne décide de rien. Il lit, projette, et passe la main. Toute
// phrase adressée au dirigeant vit dans `couverture.ts` ; tout constat sur les
// appareils vit dans `equipements/hors-referentiel.ts` ; tout constat sur le
// DUERP vit dans `duerps/couverture.ts`.

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import {
  chargerEtablissementEtParc,
  equipementsPourLeMoteur,
} from "@/lib/etablissements/dossier-du-rendu";
import { evaluerCouverture } from "@/lib/duerps/couverture";
import { lireReponsesActivites } from "@/lib/activites/reponses";
import {
  compterSansObligation,
  reperterSansEcheance,
} from "@/lib/equipements/hors-referentiel";
import { projeterEtablissement } from "@/lib/matching";
import { EFFECTIF_MAX } from "@/lib/etablissements/schema";
import { correspondanceSecteur } from "./secteur";
import type { FaitsManquesAnnonces } from "./manques-annonces";
import {
  couvertureDeLEtablissement,
  type CouvertureEtablissement,
  type FaitsCouverture,
} from "./couverture";

/**
 * Rassemble les faits de couverture d'un établissement, puis les met en forme.
 *
 * Rend `null` si l'établissement n'existe pas ou n'appartient pas à
 * l'utilisateur — jamais un état « couvert » par défaut. Une couverture
 * rassurante sur un dossier introuvable est exactement l'hypothèse silencieuse
 * que ce dossier de modules existe pour empêcher.
 */
export async function couvertureDuDossier(
  etablissementId: string,
): Promise<CouvertureEtablissement | null> {
  const faits = await faitsDeCouverture(etablissementId);
  return faits === null ? null : couvertureDeLEtablissement(faits);
}

/** La lecture seule, exposée pour les écrans qui veulent les faits bruts. */
export async function faitsDeCouverture(
  etablissementId: string,
): Promise<FaitsCouverture | null> {
  const user = await requireUser();
  // [2026-10-14, audit Next.js H2] L'établissement, l'effectif et le code NAF
  // de son entreprise (C37 : les seuils comptés sur l'entreprise lisent le
  // sien), et le parc EN SERVICE — un équipement désactivé ne génère plus
  // rien — viennent de la lecture que le rendu partage (`dossier-du-rendu.ts`)
  // avec les transmissions, les états permanents et les marques : le tableau
  // de bord relisait les trois. Ne restent ici que les deux lectures propres à
  // la couverture, bornées par `etab.id`, établi par la lecture ci-dessus.
  const etab = await chargerEtablissementEtParc(etablissementId, user.id);
  if (!etab) return null;
  const [duerps, nbRetires] = await Promise.all([
    // « 1 établissement = 1 DUERP » est un invariant de base
    // (`Duerp.etablissementId @unique`) : le premier est le seul.
    prisma.duerp.findMany({
      where: { etablissementId: etab.id },
      include: { unites: true },
    }),
    // Les retirés, comptés à part : ils portent des preuves que le registre
    // imprime (axe `inventaire`, `couverture.ts`).
    prisma.equipement.count({
      where: { etablissementId: etab.id, actif: false },
    }),
  ]);

  const equipementsMatching = equipementsPourLeMoteur(etab.equipements);

  // Une seule projection pour les deux lectures qui suivent. Les recopier
  // ferait de ce fichier la sixième et la septième du dépôt — or c'est
  // exactement ce qui a coûté un défaut : cette projection-ci a été trouvée AU
  // MERGE, la branche qui a rendu les deux derniers champs requis et celle qui
  // a écrit ce module travaillant en parallèle. Trois projections sur cinq les
  // omettaient, et l'omission compilait tant qu'ils étaient optionnels. C'est
  // le type qui a attrapé celle-là, aucun test ne la couvrait.
  const etabMatching = projeterEtablissement({
    id: etab.id,
    effectifSurSite: etab.effectifSurSite,
    entreprise: { effectif: etab.entreprise.effectif },
    estEtablissementTravail: etab.estEtablissementTravail,
    estERP: etab.estERP,
    estIGH: etab.estIGH,
    estHabitation: etab.estHabitation,
    typeErp: etab.typeErp,
    typesErpAutres: etab.typesErpAutres,
    categorieErp: etab.categorieErp,
    classeIgh: etab.classeIgh,
    familleHabitation: etab.familleHabitation,
    personnesPresentesHabituellement: etab.personnesPresentesHabituellement,
    manipuleMatieresR422722: etab.manipuleMatieresR422722,
    comporteLocauxSommeilPublic: etab.comporteLocauxSommeilPublic,
    manutentionManuelle: etab.manutentionManuelle,
    travailSurEcran: etab.travailSurEcran,
    operationsElectriques: etab.operationsElectriques,
    conduiteEngins: etab.conduiteEngins,
    expositionCMR: etab.expositionCMR,
    epiPresents: etab.epiPresents,
    ssiCategorieAouB: etab.ssiCategorieAouB,
  });

  const sansEcheance = reperterSansEcheance(etabMatching, equipementsMatching);

  const duerp = duerps[0] ?? null;
  // Le tri « déclarée / écartée / sans réponse » et les cinq états viennent
  // d'`evaluerCouverture`, seule autorité sur la question (ADR-020). On ne le
  // refait pas ici : on projette ce qu'il rend.
  const couvertureDuerp = duerp
    ? evaluerCouverture({
        secteurId: duerp.referentielSecteurId ?? "",
        reponses: lireReponsesActivites(duerp.reponsesActivitesNonCouvertes),
        unites: duerp.unites,
      })
    : null;

  return {
    regime: {
      estERP: etab.estERP,
      estIGH: etab.estIGH,
      categorieErp: etab.categorieErp,
      estHabitation: etab.estHabitation,
    },
    duerp: couvertureDuerp && {
      etat: couvertureDuerp.etat,
      secteurNom: couvertureDuerp.secteurNom,
      // Les deux manques de l'ADR-020 ne se confondent pas et ne s'additionnent
      // pas là-bas — ici on ne rend qu'un nombre pour dire « il y en a », et
      // c'est le DUERP qui les nomme un à un, chacun dans sa liste.
      nbActivitesDeclarees:
        couvertureDuerp.activitesDeclarees.length +
        couvertureDuerp.unitesHorsReferentiel.length,
      // Deux données déclarées comparées, aucune devinée. La règle vit dans
      // `secteur.ts` : écrite ici, entre deux appels Prisma, elle n'était
      // couverte par aucun test — une mutation qui la remplaçait par `true`
      // constant passait au vert.
      //
      // ~~Les DEUX codes NAF~~ [2026-10-26 : le NAF de l'établissement seul, obligatoire
      // depuis la migration `entreprise_par_siren` — plus de repli sur
      // l'entreprise].
      correspondance: correspondanceSecteur(
        etab.codeNaf,
        duerp?.referentielSecteurId,
      ),
    },
    equipements: {
      nbSansObligation: compterSansObligation(sansEcheance),
      nbEquipements: etab.equipements.length,
      nbRetires,
    },
    // La borne d'effectif de l'ADR-031, lue là où elle est FAITE RESPECTER —
    // `etablissements/schema.ts`, la porte de création. La recopier dans
    // `couverture.ts` en ferait une seconde déclaration de ce que le produit
    // sait servir ; l'importer ici est le seul endroit qui le permette, le
    // module de projection n'ayant aucune arête sortante au runtime.
    effectif: {
      surSite: etab.effectifSurSite,
      entreprise: etab.entreprise.effectif,
      seuilServi: EFFECTIF_MAX,
    },
  };
}

/**
 * Les faits que `manques-annonces.ts` projette (C45) : ~~deux~~ ~~quatre~~ cinq depuis
 * le 2026-10-13 (catégorie d'ERP, régime d'habitation, opérations électriques), et aucun déduit. Rend `null` si l'établissement n'appartient pas à l'utilisateur —
 * jamais un jeu de faits par défaut, qui annoncerait à un dossier introuvable.
 */
export async function faitsManquesAnnonces(
  etablissementId: string,
): Promise<FaitsManquesAnnonces | null> {
  const user = await requireUser();
  const etab = await prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId: user.id } },
    select: {
      estEtablissementTravail: true,
      epiPresents: true,
      estERP: true,
      categorieErp: true,
      estHabitation: true,
      operationsElectriques: true,
    },
  });
  if (!etab) return null;
  return {
    travail: etab.estEtablissementTravail,
    epiPresents: etab.epiPresents,
    categorieErp: etab.estERP ? etab.categorieErp : null,
    habitation: etab.estHabitation,
    operationsElectriques: etab.operationsElectriques,
  };
}
