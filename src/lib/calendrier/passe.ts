// La passe de régénération, coupée en deux : LIRE, puis PLANIFIER.
//
// CE MODULE N'EST PAS UN `"use server"`, comme `reconciliation.ts` et
// `regeneration-sure.ts`, et pour la même raison : toute fonction exportée
// d'un fichier d'actions devient un point d'entrée appelable depuis le
// navigateur. `lireEntrees` lit tout le calendrier d'un établissement sans
// garde de session — elle reçoit un client Prisma et un identifiant, et fait
// confiance à l'appelant, qui a vérifié la propriété à sa façon
// (`regenererSansInvalider`) ou qui tourne à la main sur la base
// (`scripts/passage-a-blanc-echeances.ts`). Une telle fonction n'a pas à être
// joignable par une requête HTTP.
//
// POURQUOI LA COUPE (ADR-036, lot 2b — 2026-09-18). `regenererUnePasse`
// enchaînait lecture, matching, génération, réconciliation et écriture dans
// une seule fonction de quatre cents lignes. Le passage à blanc du lot 2c
// avait besoin des trois premiers temps SANS le quatrième : ~~une lecture, deux
// plans — la stratégie en ligne et la candidate —, leur différence~~ ; depuis
// la bascule (lot 4, 2026-09-19), il n'y a qu'un plan, et le contrôle de santé
// le compare à l'état EN BASE (`comparerAuMoteur`), sans aucune écriture. Le
// dépôt et le retrait d'un rapport rejouent la même lecture et le même plan
// pour une ligne (`recalcul-ligne.ts`). La coupe rend ces temps appelables
// séparément ; elle ne déplace aucune règle. `regenererUnePasse` appelle `lireEntrees` puis `planifier`, et
// garde la transaction et ses écritures conditionnées telles quelles.
//
// LA LECTURE NE PREND PAS D'HORLOGE. `now` n'entre qu'au moment de planifier :
// c'est ce qui permet de rejouer le même relevé à une autre date — le test
// d'idempotence temporelle du passage à blanc replanifie à J+400 sur la lecture
// d'aujourd'hui.

import type { Prisma } from "@prisma/client";
import {
  appliquerPrescriptions,
  determineObligationsApplicables,
  projeterEtablissement,
} from "@/lib/matching";
import {
  estPorteeParSalarie,
  obligationParId,
  OBLIGATIONS_RETIREES,
} from "@/lib/referentiels/conformite";
import {
  cleDeLigne,
  clesApplicabilite,
  periodicitesEffectives,
  genererProchainesVerifications,
  genererVerificationsDepuisTitres,
  genererVerificationsSurMesure,
  reconcilierCalendrier,
  type OccurrenceExistante,
  type OptionsGenerateur,
  type PlanReconciliation,
  type StatutVerificationPersiste,
  type TitreDeclare,
  type VerificationGenere,
} from "./generateur";
import {
  indexerDernieresRealisations,
  WHERE_RAPPORT_REALISE,
} from "@/lib/rapports/derniere-realisation";

/**
 * `OBLIGATIONS_RETIREES` réduit à ce dont la réconciliation a besoin : les
 * retraits QUI ONT UN ABSORBANT, sous forme de table.
 *
 * `absorbePar` portait cette donnée depuis le 2026-08-27 et **aucun code ne la
 * lisait** — l'ADR-022 le disait de lui-même, « un manque, pas une décision ».
 * C'est cette ligne qui la branche.
 *
 * Calculée une fois : le référentiel est du TypeScript figé à la compilation
 * (ADR-003), il ne change pas d'un appel à l'autre.
 */
export const SUCCESSIONS_DECLAREES: ReadonlyMap<string, string> = new Map(
  Object.entries(OBLIGATIONS_RETIREES).flatMap(([retire, r]) =>
    r.absorbePar === null ? [] : [[retire, r.absorbePar] as [string, string]],
  ),
);

/** Le client que la lecture accepte : un `PrismaClient` comme un client de
 *  transaction interactive, le passage à blanc lisant sous `READ ONLY`. */
export type ClientLecture = Prisma.TransactionClient;

/**
 * Tout ce qu'une passe LIT, et rien de ce qu'elle calcule. Quatre requêtes,
 * dans cet ordre : l'établissement avec ses équipements actifs et ses
 * prescriptions, les titres des salariés présents, les lignes de calendrier,
 * les rapports réalisés.
 *
 * L'ordre compte pour les tests : le faux client déclenche son crochet
 * `apresLecture` juste après la lecture des lignes, et c'est là que la fenêtre
 * de concurrence des écritures conditionnées se rejoue.
 */
export async function lireEntrees(client: ClientLecture, etablissementId: string) {
  // 1. Lecture établissement + équipements encore en service.
  const etab = await client.etablissement.findUnique({
    where: { id: etablissementId },
    include: {
      equipements: { where: { actif: true } },
      // Prescriptions particulières (ADR-035) : lues ici, dans la phase de
      // calcul, jamais dans la transaction. `dateFin` est arbitrée par
      // `appliquerPrescriptions` pour que la raison d'ignorance soit rendue.
      prescriptionsParticulieres: { where: { actif: true } },
      // L'effectif de l'entreprise, que lisent les seuils comptés sur elle
      // (CSE, règlement intérieur — `effectifMaille`, C37).
      entreprise: { select: { effectif: true } },
    },
  });
  if (!etab) throw new Error("Établissement introuvable");

  // Les titres déclarés par l'employeur (ADR-023). Ce sont eux qui font
  // exister les lignes à porteur salarié : le moteur ne peut pas les dériver,
  // rien ne disant qu'une personne exerce l'activité qui déclenche le titre.
  // Les salariés inactifs sont exclus — une personne partie ne doit plus
  // apparaître au calendrier. Ses titres subsistent comme preuve
  // (docs/rgpd.md § 4.3), et ses lignes qui portent une trace sont archivées,
  // pas supprimées (2026-09-17, voir `titresActifs` dans `planifier`).
  const titresBruts = await client.titreSalarie.findMany({
    where: { salarie: { etablissementId, actif: true } },
    select: {
      obligationId: true,
      salarieId: true,
      delivreLe: true,
      echeanceLe: true,
      salarie: { select: { nom: true, prenom: true } },
    },
  });

  // 4. État en base. `_count` sert au seul arbitrage qui autorise une
  //    suppression : une ligne sans rapport ni action ne porte aucune preuve.
  const existantesBrutes = await client.verification.findMany({
    where: { etablissementId },
    select: {
      id: true,
      obligationId: true,
      equipementId: true,
      salarieId: true,
      libelleObligation: true,
      periodicite: true,
      realisateurRequis: true,
      datePrevue: true,
      // L'archivage (ADR-034, N3) : sans lui, la réconciliation ne sait plus
      // qu'une ligne est barrée et la ré-archiverait à chaque passe.
      archiveLe: true,
      statut: true,
      prescriptionId: true,
      // Depuis quand Rojer suit la ligne (ADR-036, D2) : l'origine que
      // `echeanceDeLigne` lit pour dater un « à planifier » et borner la
      // première échéance d'une mise en service.
      suiviDepuis: true,
      _count: { select: { rapports: true, actions: true } },
    },
  });

  // La réalisation de chaque ligne se lit sur ses rapports (ADR-034) : une
  // requête pour tout l'établissement, jamais une par ligne.
  const dernieresRealisations = indexerDernieresRealisations(
    await client.rapportVerification.findMany({
      where: { etablissementId, ...WHERE_RAPPORT_REALISE },
      // Le résultat voyage avec la date : il donne son statut à une ligne sans
      // rendez-vous suivant, seule à en garder un (ADR-034). `createdAt`
      // départage deux rapports du même jour.
      select: {
        verificationId: true,
        dateRapport: true,
        createdAt: true,
        resultat: true,
      },
    }),
  );

  const existantes: OccurrenceExistante[] = existantesBrutes.map((v) => ({
    id: v.id,
    obligationId: v.obligationId,
    equipementId: v.equipementId,
    salarieId: v.salarieId,
    libelleObligation: v.libelleObligation,
    periodicite: v.periodicite,
    realisateurRequis: v.realisateurRequis,
    datePrevue: v.datePrevue,
    archiveLe: v.archiveLe,
    derniereRealisation: dernieresRealisations.get(v.id)?.dateRapport ?? null,
    dernierResultat: dernieresRealisations.get(v.id)?.resultat ?? null,
    statut: v.statut as StatutVerificationPersiste,
    porteUnePreuve: v._count.rapports > 0 || v._count.actions > 0,
    prescriptionId: v.prescriptionId,
    suiviDepuis: v.suiviDepuis,
  }));

  return { etab, titresBruts, existantes };
}

export type LecturePasse = Awaited<ReturnType<typeof lireEntrees>>;

/** Ce que le réconciliateur reçoit : les lignes en base, les lignes générées,
 *  et ses options. Exposé pour le passage à blanc, qui a besoin des lignes
 *  générées — leurs `sources` — pour rassembler les faits de chaque écart. */
export type EntreesReconciliation = {
  existantes: OccurrenceExistante[];
  aGenerer: VerificationGenere[];
  options: OptionsGenerateur;
};

/**
 * Le plan d'une passe, depuis une lecture et une horloge — matching,
 * génération, réconciliation. Fonction PURE : elle ne lit ni la base ni
 * l'horloge du processus, si bien que la même lecture replanifiée à une autre
 * date dit ce que la régénération écrirait ce jour-là.
 */
export function planifier(lecture: LecturePasse, now: Date): PlanReconciliation {
  const { existantes, aGenerer, options } = preparer(lecture, now);
  return reconcilierCalendrier(existantes, aGenerer, options);
}

/**
 * Les deux premiers temps de la planification — matching et génération —, et
 * les options du réconciliateur. Séparés de `planifier` pour le passage à
 * blanc ; `planifier` n'est que `preparer` puis `reconcilierCalendrier`.
 */
export function preparer(lecture: LecturePasse, now: Date): EntreesReconciliation {
  const { etab, titresBruts, existantes } = lecture;

  const equipementsMatching = etab.equipements.map((eq) => ({
    id: eq.id,
    libelle: eq.libelle,
    categorie: eq.categorie,
    caracteristiques: (eq.caracteristiques ?? null) as Record<
      string,
      unknown
    > | null,
  }));

  // 2. Matching du référentiel, puis modulation par les prescriptions
  //    particulières propres à l'établissement.
  const obligationsReferentiel = determineObligationsApplicables(
    projeterEtablissement(etab),
    equipementsMatching,
  );
  const { applicables: obligations, surMesure } = appliquerPrescriptions(
    obligationsReferentiel,
    etab.prescriptionsParticulieres,
    equipementsMatching,
    now,
  );

  // 3. Ensemble des couples applicables, sans historique : cf. la doc de
  //    `reconcilierCalendrier`. Les mises en service sont portées dans les
  //    `sources` de chaque ligne ; `echeanceDeLigne` en tire le premier cycle.
  const misesEnService = new Map<string, Date>();
  for (const eq of etab.equipements) {
    if (eq.dateMiseEnService) misesEnService.set(eq.id, eq.dateMiseEnService);
  }
  const titresSalaries = new Map<string, TitreDeclare[]>();
  for (const t of titresBruts) {
    const liste = titresSalaries.get(t.obligationId) ?? [];
    liste.push({
      salarieId: t.salarieId,
      libelle: `${t.salarie.prenom} ${t.salarie.nom}`.trim(),
      delivreLe: t.delivreLe,
      echeanceLe: t.echeanceLe,
    });
    titresSalaries.set(t.obligationId, liste);
  }

  // Le générateur DÉCRIT, il ne date plus (ADR-036) : ni horloge, ni
  // historique. `now` n'entre qu'au réconciliateur, comme origine d'une ligne
  // à naître.
  const aGenerer = [
    ...genererProchainesVerifications(obligations, { misesEnService }),
    ...genererVerificationsDepuisTitres(titresSalaries, obligationParId),
    ...genererVerificationsSurMesure(surMesure),
  ];

  // Les obligations encore applicables, y compris celles qui n'engendrent
  // aucune ligne parce qu'elles sont permanentes (`periodicite: "autre"`).
  // Sans cette liste, la réconciliation prendrait leur absence d'`aGenerer`
  // pour un retrait et barrerait des lignes qui prouvent un contrôle réel.
  //
  // PAR CLÉ D'APPLICABILITÉ, pas par identifiant nu (`cleApplicabilite`) : une
  // obligation d'équipement n'est « encore applicable » qu'aux appareils qui la
  // déclenchent. L'identifiant seul rouvrait la ligne archivée d'un appareil dès
  // qu'un AUTRE appareil déclenchait la même obligation.
  const obligationsEncoreApplicables = clesApplicabilite(obligations);
  // Et le RYTHME de chacune, surcharges de prescription comprises, depuis le
  // même tableau : une ligne applicable que la génération saute n'a que cette
  // table pour être réalignée (NB4, 2026-09-15 — voir `periodicitesEffectives`).
  const periodicites = periodicitesEffectives(obligations);

  // Les obligations à porteur salarié n'y sont JAMAIS par la voie ci-dessus :
  // `evaluerObligation` rend `null` pour ce porteur — rien ne dit au moteur qui
  // opère sur quoi, le cinquième déclencheur n'étant pas implémenté (ADR-023).
  // Elles arrivent donc par la déclaration de l'employeur, et il faut les
  // ajouter ici sans quoi le garde-fou ci-dessus ne couvre que deux porteurs
  // sur trois : une ligne de titre qui cesse d'être générée serait classée
  // « obligation retirée du référentiel » et supprimée.
  //
  // Le cas n'est pas théorique, et c'est celui-là même que le garde-fou cite :
  // l'habilitation électrique passée de `triennale` à `autre` (ADR-023 § 6)
  // cesse de produire une échéance, sans cesser un instant de s'appliquer.
  //
  // ~~La requête portait sur TOUS les titres déclarés, y compris ceux de
  // salariés sortis de l'effectif~~ : « ne pas barrer toute obligation qu'un
  // titre a un jour instanciée » laissait OUVERTE la ligne d'une personne
  // partie, et comptée en retard si elle portait une action, pendant qu'Équipe
  // disait « Ne s'applique plus » (2026-09-17, `lot/salarie-inactif-et-menage`).
  // Les titres des personnes PRÉSENTES suffisent aux deux questions :
  //
  //   · l'obligation s'applique-t-elle encore ? — un titre en vigueur la porte ;
  //   · le porteur de CETTE ligne existe-t-il encore ? — `titresActifs`, par
  //     couple obligation × personne, comme `equipementsEnService` pour un
  //     appareil. Le départ du seul détenteur ne barre donc pas l'obligation au
  //     hasard d'un collègue : c'est la ligne de la personne partie, et elle
  //     seule, qui sort des comptes.
  //
  // Le filtre `estPorteeParSalarie` n'est pas décoratif : `TitreSalarie.
  // obligationId` n'a pas de clé étrangère (le référentiel vit en TypeScript),
  // donc un titre déclaré par erreur sur une obligation d'ÉQUIPEMENT ferait
  // sinon entrer celle-ci dans le garde-fou, et empêcherait l'archivage
  // légitime de ses lignes le jour où elle est retirée.
  const titresActifs = new Set<string>();
  for (const t of titresBruts) {
    titresActifs.add(
      cleDeLigne(t.obligationId, { equipementId: null, salarieId: t.salarieId }),
    );
    const o = obligationParId(t.obligationId);
    if (o !== undefined && estPorteeParSalarie(o)) {
      obligationsEncoreApplicables.add(t.obligationId);
      // Aucune surcharge ne vise un titre : le rythme est celui du référentiel.
      periodicites.set(t.obligationId, o.periodicite);
    }
  }

  return {
    existantes,
    aGenerer,
    options: {
      now,
      obligationsEncoreApplicables,
      periodicitesEffectives: periodicites,
      // `etab.equipements` est déjà filtré sur `actif: true` par la lecture du
      // point 1 : c'est exactement l'ensemble des porteurs encore en service.
      equipementsEnService: new Set(etab.equipements.map((eq) => eq.id)),
      titresActifs,
      successions: SUCCESSIONS_DECLAREES,
    },
  };
}
