"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Realisateur } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import {
  appliquerPrescriptions,
  determineObligationsApplicables,
  projeterEtablissement,
} from "@/lib/matching";
import {
  estPorteeParSalarie,
  obligationParId,
  OBLIGATIONS_RETIREES,
  SCEAU_CALENDRIER,
} from "@/lib/referentiels/conformite";
import {
  genererProchainesVerifications,
  genererVerificationsDepuisTitres,
  genererVerificationsSurMesure,
  reconcilierCalendrier,
  type OccurrenceExistante,
  type StatutVerificationPersiste,
  type TitreDeclare,
} from "./generateur";
import { marquerCalendrierPerime } from "./reconciliation";
import {
  indexerDernieresRealisations,
  WHERE_RAPPORT_REALISE,
} from "@/lib/rapports/derniere-realisation";

export type GenerationResult = {
  /** Lignes de suivi nouvellement ouvertes (nouvel équipement, nouvelle
   *  obligation applicable). */
  created: number;
  /** Lignes existantes réalignées — identifiants inchangés. */
  updated: number;
  /** Lignes supprimées : uniquement celles qui ne portaient ni rapport, ni
   *  action corrective, ni date de réalisation. */
  deleted: number;
  /** Lignes devenues non applicables mais porteuses de preuve : marquées
   *  « Ne s'applique plus », conservées. */
  archived: number;
  /** Lignes que la régénération n'a pas eu à toucher. */
  unchanged: number;
};

/**
 * (Re)génère le calendrier de vérifications d'un établissement, **de façon
 * idempotente** — cf. ADR-012.
 *
 * Déroulé :
 *  1. Lit l'établissement et ses équipements **actifs** (un équipement
 *     désactivé ne génère plus d'obligation, cf. `lib/equipements/actions.ts`).
 *  2. Passe par le moteur de matching pour déterminer les obligations
 *     applicables.
 *  3. Demande au générateur l'ensemble des couples (obligation, équipement)
 *     applicables — **sans** historique de vérifications : les dates réelles
 *     sont recalculées ligne par ligne par le réconciliateur, à partir de ce
 *     qu'il y a en base. Les **mises en service**, elles, sont transmises :
 *     elles ne décrivent pas un passé de contrôles, elles donnent son point
 *     de départ à un équipement neuf, que le réconciliateur ne peut pas
 *     deviner depuis une ligne qui n'a jamais eu de rendez-vous.
 *  4. Réconcilie (fonction pure) : créations, mises à jour, archivages,
 *     suppressions.
 *  5. Applique le plan dans **une seule transaction**.
 *
 * Ce que cette fonction ne fait plus, et ne doit jamais refaire : supprimer
 * les vérifications non réalisées pour les recréer. `Action.verificationId`
 * et `RapportVerification.verificationId` sont en `onDelete: Cascade` — un
 * `deleteMany` sur les vérifications emporte silencieusement les actions
 * correctives du dirigeant et les rapports déposés par ses prestataires.
 */
export async function genererCalendrier(
  etablissementId: string,
): Promise<GenerationResult> {
  const resultat = await regenererSansInvalider(etablissementId);
  // L'invalidation est ICI et non dans `regenererSansInvalider` : c'est la
  // seule différence entre les deux, et c'est celle qui compte.
  revalidatePath(`/etablissements/${etablissementId}`, "layout");
  return resultat;
}

/**
 * La régénération seule, **sans aucun effet de cache**.
 *
 * Elle existe parce que la page du calendrier appelle la régénération PENDANT
 * SON RENDU, pour réparer un calendrier vide ou périmé. Next l'a dit à
 * l'ouverture :
 *
 *   Route /etablissements/[id]/calendrier used "revalidatePath ..." during
 *   render which is unsupported.
 *
 * L'appel était ignoré — la génération passait, la transaction s'exécutait, les
 * échéances existaient ; seule l'invalidation du tableau de bord et de la fiche
 * ne se faisait pas, et ils se rafraîchissaient à la navigation suivante. Rien
 * n'était perdu, mais Next le déclare non supporté et le fera devenir une
 * erreur dure.
 *
 * DEUX FONCTIONS PLUTÔT QU'UN DRAPEAU : celle qui n'a pas d'effet de cache le
 * dit dans son nom. Un booléen `invalider` obligerait à relire l'appelant pour
 * savoir ce qui se passe, et c'est précisément la lecture qu'on veut éviter sur
 * un effet de bord invisible.
 *
 * L'APPEL PENDANT LE RENDU EST ANCIEN — il remonte à la génération automatique
 * sur mutation d'équipement. Il ne se voyait pas parce qu'un garde
 * `if (nbEquipements > 0)` empêchait la régénération chez les établissements
 * sans équipement, et qu'ailleurs le calendrier était déjà à jour. Le chantier
 * du porteur d'échéance a retiré ce garde — à raison, il masquait un vrai faux
 * négatif — et la ligne s'exécute désormais à la première ouverture de chaque
 * dossier. Le défaut n'a pas été créé, il a été rendu atteignable.
 */
export async function regenererSansInvalider(
  etablissementId: string,
): Promise<GenerationResult> {
  await assertEtablissementOwnership(etablissementId);

  let passe = await regenererUnePasse(etablissementId);
  let tentative = 1;
  while (!passe.converge && tentative < TENTATIVES_MAX) {
    passe = await regenererUnePasse(etablissementId);
    tentative += 1;
  }

  // Personne n'a cessé d'écrire pendant toutes les tentatives. On rend la
  // main plutôt que de boucler — mais la passe qui vient de s'exécuter a
  // inscrit la version courante du référentiel, ce qui ferait passer le
  // calendrier pour à jour alors qu'une ligne au moins n'a pas été réalignée.
  // On efface donc ce repère : la prochaine ouverture régénérera d'elle-même.
  if (!passe.converge) await marquerCalendrierPerime(etablissementId);

  return passe.resultat;
}

/** Au-delà, on cesse de réessayer et on marque le calendrier périmé. Trois
 *  passes suffisent à absorber une concurrence ordinaire — deux onglets, un
 *  dépôt de rapport pendant une déclaration d'équipement. */
const TENTATIVES_MAX = 3;

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
const SUCCESSIONS_DECLAREES: ReadonlyMap<string, string> = new Map(
  Object.entries(OBLIGATIONS_RETIREES).flatMap(([retire, r]) =>
    r.absorbePar === null ? [] : [[retire, r.absorbePar] as [string, string]],
  ),
);

type PasseRegeneration = {
  resultat: GenerationResult;
  /** `false` dès qu'une écriture a touché MOINS de lignes que le plan n'en
   *  prévoyait : la base ne ressemblait plus à ce que la lecture avait vu. */
  converge: boolean;
};

/**
 * Une passe : lire, calculer le plan, l'appliquer — et dire si la base a
 * bougé sous nos pieds.
 *
 * **Le plan est calculé sur une lecture, et appliqué plus tard.** Entre les
 * deux, un prestataire peut déposer un rapport, le dirigeant créer une action
 * corrective. Les écritures ci-dessous sont donc CONDITIONNÉES sur ce que la
 * lecture a vu : une ligne qui a changé entre-temps n'est ni écrasée ni
 * supprimée, elle sort simplement du lot. PostgreSQL rend alors un compte plus
 * court que le plan, et c'est ce compte qui fait `converge: false`.
 *
 * L'écart n'est pas une erreur, c'est le signal que le monde a bougé :
 * l'appelant recalcule sur une lecture fraîche. La régénération étant
 * idempotente (ADR-012), relancer ne coûte qu'un aller-retour.
 */
async function regenererUnePasse(
  etablissementId: string,
): Promise<PasseRegeneration> {
  const now = new Date();

  // 1. Lecture établissement + équipements encore en service.
  const etab = await prisma.etablissement.findUnique({
    where: { id: etablissementId },
    include: {
      equipements: { where: { actif: true } },
      // Prescriptions particulières (ADR-014) : lues ici, dans la phase de
      // calcul, jamais dans la transaction. `dateFin` est arbitrée par
      // `appliquerPrescriptions` pour que la raison d'ignorance soit rendue.
      prescriptionsParticulieres: { where: { actif: true } },
    },
  });
  if (!etab) throw new Error("Établissement introuvable");

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

  // 3. Ensemble des couples applicables. Historique volontairement vide :
  //    cf. la doc de `reconcilierCalendrier`. Les mises en service, elles,
  //    donnent au générateur de quoi dater le premier cycle d'un équipement
  //    neuf plutôt que de le poser « à planifier » faute de mieux.
  const misesEnService = new Map<string, Date>();
  for (const eq of etab.equipements) {
    if (eq.dateMiseEnService) misesEnService.set(eq.id, eq.dateMiseEnService);
  }
  // Les titres déclarés par l'employeur (ADR-023). Ce sont eux qui font
  // exister les lignes à porteur salarié : le moteur ne peut pas les dériver,
  // rien ne disant qu'une personne exerce l'activité qui déclenche le titre.
  // Les salariés inactifs sont exclus — une personne partie ne doit plus
  // apparaître au calendrier, alors que ses lignes déjà réalisées, elles,
  // subsistent comme preuve (docs/rgpd.md § 4.3).
  const titresBruts = await prisma.titreSalarie.findMany({
    where: { salarie: { etablissementId, actif: true } },
    select: {
      obligationId: true,
      salarieId: true,
      delivreLe: true,
      echeanceLe: true,
      salarie: { select: { nom: true, prenom: true } },
    },
  });
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

  const aGenerer = [
    ...genererProchainesVerifications(obligations, new Map(), {
      now,
      misesEnService,
    }),
    ...genererVerificationsDepuisTitres(titresSalaries, obligationParId, {
      now,
    }),
    ...genererVerificationsSurMesure(surMesure, { now }),
  ];

  // 4. État en base. `_count` sert au seul arbitrage qui autorise une
  //    suppression : une ligne sans rapport ni action ne porte aucune preuve.
  const existantesBrutes = await prisma.verification.findMany({
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
      dateRealisee: true,
      statut: true,
      prescriptionId: true,
      _count: { select: { rapports: true, actions: true } },
    },
  });

  // La réalisation de chaque ligne se lit sur ses rapports (ADR-034) : une
  // requête pour tout l'établissement, jamais une par ligne.
  const dernieresRealisations = indexerDernieresRealisations(
    await prisma.rapportVerification.findMany({
      where: { etablissementId, ...WHERE_RAPPORT_REALISE },
      select: { verificationId: true, dateRapport: true },
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
    dateRealisee: v.dateRealisee,
    derniereRealisation: dernieresRealisations.get(v.id) ?? null,
    statut: v.statut as StatutVerificationPersiste,
    porteUnePreuve: v._count.rapports > 0 || v._count.actions > 0,
    prescriptionId: v.prescriptionId,
  }));

  // Les obligations encore applicables, y compris celles qui n'engendrent
  // aucune ligne parce qu'elles sont permanentes (`periodicite: "autre"`).
  // Sans cette liste, la réconciliation prendrait leur absence d'`aGenerer`
  // pour un retrait et barrerait des lignes qui prouvent un contrôle réel.
  const obligationsEncoreApplicables = new Set(
    obligations.map((oa) => oa.obligation.id),
  );

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
  // La requête porte sur TOUS les titres déclarés, y compris ceux de salariés
  // sortis de l'effectif — contrairement à `titresBruts`, qui filtre sur
  // `actif` parce qu'une personne partie ne doit plus produire de NOUVELLE
  // ligne. Les deux périmètres sont différents et c'est voulu :
  //
  //   · générer : les personnes présentes ;
  //   · ne pas barrer : toute obligation qu'un titre a un jour instanciée.
  //
  // Sans cette distinction, le départ du seul détenteur faisait sortir
  // l'obligation du garde-fou : sa ligne était barrée « Ne s'applique plus »
  // alors que l'obligation s'applique parfaitement — c'est la personne qui est
  // partie. Et le résultat dépendait d'un fait sans rapport, qu'un collègue
  // détienne ou non le même titre.
  //
  // Le filtre `estPorteeParSalarie` n'est pas décoratif : `TitreSalarie.
  // obligationId` n'a pas de clé étrangère (le référentiel vit en TypeScript),
  // donc un titre déclaré par erreur sur une obligation d'ÉQUIPEMENT ferait
  // sinon entrer celle-ci dans le garde-fou, et empêcherait l'archivage
  // légitime de ses lignes le jour où elle est retirée.
  const obligationsInstanciees = await prisma.titreSalarie.findMany({
    where: { salarie: { etablissementId } },
    select: { obligationId: true },
    distinct: ["obligationId"],
  });
  for (const { obligationId } of obligationsInstanciees) {
    const o = obligationParId(obligationId);
    if (o !== undefined && estPorteeParSalarie(o)) {
      obligationsEncoreApplicables.add(obligationId);
    }
  }

  const plan = reconcilierCalendrier(existantes, aGenerer, {
    now,
    obligationsEncoreApplicables,
    // `etab.equipements` est déjà filtré sur `actif: true` par la lecture du
    // point 1 : c'est exactement l'ensemble des porteurs encore en service.
    equipementsEnService: new Set(etab.equipements.map((eq) => eq.id)),
    successions: SUCCESSIONS_DECLAREES,
  });

  // 5. Application du plan — tout ou rien. Un calendrier à moitié régénéré
  //    (créations passées, mises à jour perdues) afficherait des échéances
  //    incohérentes sans que personne ne le sache.
  //
  //    Le plan est entièrement calculé avant d'ouvrir la transaction : aucune
  //    opération ci-dessous ne lit la base, et aucune ne dépend du résultat
  //    d'une autre. La forme **séquentielle** de `$transaction` convient donc,
  //    et c'est elle qu'il faut : elle envoie tout le lot en un seul
  //    aller-retour, là où la forme interactive payait la latence réseau une
  //    fois par écriture. Sur 43 occurrences, cela faisait 46 allers-retours
  //    dans une même transaction, assez pour en dépasser le délai — et comme le
  //    repère de version s'écrit dans le lot, l'échec relançait l'opération au
  //    chargement suivant, indéfiniment (P2028).
  const operations: Prisma.PrismaPromise<unknown>[] = [];
  // Combien de lignes chaque opération doit toucher, dans le même ordre.
  // `null` = compte non contrôlé : l'écriture du repère de version porte sur
  // l'établissement, pas sur des lignes de calendrier.
  const attendus: (number | null)[] = [];

  // Ce que la lecture a vu, ligne par ligne : la référence des écritures
  // conditionnées ci-dessous.
  const lues = new Map(existantes.map((e) => [e.id, e]));

  if (plan.aSupprimer.length > 0) {
    // `rapports: none` et `actions: none` REDISENT en SQL ce que le plan a
    // conclu en mémoire, et c'est tout leur intérêt : entre la lecture et
    // ici, un prestataire a pu déposer un rapport, le dirigeant créer une
    // action corrective. Sans ces clauses, le `deleteMany` les emporte par
    // cascade — mot pour mot ce que l'ADR-012 déclare impossible.
    //
    // `dateRealisee: null` complète le trio : le réconciliateur compte la
    // date de réalisation comme une trace au même titre qu'une pièce jointe
    // (`porteUneTrace`), donc la condition d'ici doit compter les trois.
    operations.push(
      prisma.verification.deleteMany({
        where: {
          id: { in: plan.aSupprimer },
          etablissementId,
          rapports: { none: {} },
          actions: { none: {} },
          dateRealisee: null,
        },
      }),
    );
    attendus.push(plan.aSupprimer.length);
  }

  if (plan.aCreer.length > 0) {
    // `skipDuplicates` : deux régénérations concurrentes (déclaration
    // d'équipement dans un onglet, dépôt de rapport dans l'autre) peuvent
    // calculer la même création. La contrainte d'unicité tranche, sans
    // faire échouer la transaction.
    operations.push(
      prisma.verification.createMany({
        data: plan.aCreer.map((v) => ({
          etablissementId,
          equipementId: v.equipementId,
          salarieId: v.salarieId,
          obligationId: v.obligationId,
          libelleObligation: v.libelleObligation,
          periodicite: v.periodicite,
          realisateurRequis: v.realisateurRequis as Realisateur[],
          datePrevue: v.datePrevue,
          statut: v.statut,
          prescriptionId: v.prescriptionId,
        })),
        skipDuplicates: true,
      }),
    );
    // Le compte attendu est celui des clés DISTINCTES, pas des entrées. Si le
    // plan proposait deux fois la même ligne, `skipDuplicates` en poserait une
    // et le compte serait court à chaque passe — donc divergence à chaque
    // passe, trois régénérations complètes, puis calendrier marqué périmé, et
    // le tout à chaque ouverture de page, indéfiniment. Le plan ne devrait
    // jamais proposer de doublon ; ce n'est pas une raison pour qu'un doublon
    // se paie d'une boucle plutôt que d'une ligne posée une seule fois.
    //
    // Un compte court avec des clés distinctes, en revanche, dit bien ce qu'il
    // doit dire : une régénération concurrente a créé la même ligne avant
    // nous. Rien n'est perdu, mais le monde a bougé, et c'est à une passe
    // fraîche de dire si cette ligne demande un réalignement.
    attendus.push(new Set(plan.aCreer.map((v) => v.cleUnique)).size);
  }

  for (const m of plan.aMettreAJour) {
    const lu = lues.get(m.id);
    // Inatteignable : le plan ne met à jour que des lignes qu'il vient de
    // lire. Le `continue` évite d'écrire sans condition si ça cessait d'être
    // vrai.
    if (lu === undefined) continue;
    operations.push(
      prisma.verification.updateMany({
        where: {
          id: m.id,
          etablissementId,
          // Les deux champs que le DÉPÔT d'un rapport modifie (ADR-034) :
          // l'échéance ouverte et son statut. S'ils ont bougé depuis la
          // lecture, ce plan a été calculé sur un passé révolu — l'écrire
          // ramènerait la ligne à l'échéance qu'un rapport vient d'honorer,
          // et elle afficherait « dépassée » avec un rapport conforme joint.
          datePrevue: lu.datePrevue,
          statut: lu.statut,
        },
        data: {
          // Il ne bouge que pour une ligne ADOPTÉE — une obligation qui a
          // changé de nom. La rangée continue avec ses rapports et ses
          // actions, au lieu d'être barrée pendant qu'une ligne neuve
          // apparaît à côté.
          obligationId: m.obligationId,
          libelleObligation: m.libelleObligation,
          periodicite: m.periodicite,
          realisateurRequis: m.realisateurRequis as Realisateur[],
          datePrevue: m.datePrevue,
          dateRealisee: m.dateRealisee,
          statut: m.statut,
          prescriptionId: m.prescriptionId,
          // Une ligne que le plan met à jour est une ligne ATTENDUE : son
          // obligation s'applique, et son libellé repart du référentiel, sans
          // préfixe. Si elle avait été archivée — appareil réactivé, régime
          // rétabli —, elle ne l'est plus, et la date doit tomber avec le
          // préfixe (ADR-034, N1).
          archiveLe: null,
        },
      }),
    );
    attendus.push(1);
  }

  for (const a of plan.aArchiver) {
    // L'archivage ne réécrit que le libellé : il ne détruit rien et ne touche
    // aucun champ factuel, donc il n'a pas à être conditionné sur eux — le
    // conditionner ferait échouer des archivages parfaitement légitimes.
    // `etablissementId` reste, lui : une écriture par identifiant seul n'a
    // pas à exister sur une table scopée.
    //
    // `archiveLe` est écrit AVEC le préfixe depuis le lot N1 de l'ADR-034 : les
    // lecteurs lisent encore le préfixe, ils passeront sur la date au N3, et
    // entre les deux les deux faits ne doivent pas diverger.
    operations.push(
      prisma.verification.updateMany({
        where: { id: a.id, etablissementId },
        data: { libelleObligation: a.libelleObligation, archiveLe: new Date() },
      }),
    );
    attendus.push(1);
  }

  // Le calendrier est désormais aligné sur ce référentiel — version et contenu,
  // que `SCEAU_CALENDRIER` réunit.
  // Écrit **dans** la transaction, et en dernier : si le plan échoue,
  // l'établissement reste marqué comme désynchronisé et sera repris au prochain
  // affichage, plutôt que d'être considéré à tort comme à jour.
  operations.push(
    prisma.etablissement.update({
      where: { id: etablissementId },
      data: { referentielVersionCalendrier: SCEAU_CALENDRIER },
    }),
  );
  attendus.push(null);

  // Les opérations s'exécutent dans l'ordre du tableau, en une transaction.
  const resultats = await prisma.$transaction(operations);

  // Le plan disait combien de lignes chaque écriture devait toucher ;
  // PostgreSQL dit combien elle en a touché. Un écart veut dire qu'au moins
  // une ligne ne ressemblait plus à ce que la lecture avait vu, donc que la
  // condition l'a écartée — c'est la protection qui a joué, et il faut
  // recalculer sur une lecture fraîche.
  let converge = true;
  for (const [i, attendu] of attendus.entries()) {
    if (attendu === null) continue;
    const rendu = resultats[i] as { count?: number } | undefined;
    if (rendu === undefined || rendu.count !== attendu) {
      converge = false;
      break;
    }
  }

  return {
    // Ces compteurs sont ceux du PLAN. Ils ne valent donc que si la passe a
    // convergé — auquel cas ils sont exacts par définition, chaque écriture
    // ayant touché ce qui était prévu. Sinon l'appelant relance, et ce sont
    // les compteurs de la passe suivante qui seront rendus.
    resultat: {
      created: plan.aCreer.length,
      updated: plan.aMettreAJour.length,
      deleted: plan.aSupprimer.length,
      archived: plan.aArchiver.length,
      unchanged: plan.inchangees,
    },
    converge,
  };
}
