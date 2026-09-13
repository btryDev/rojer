/**
 * Seed de développement — donne de la matière au tableau de bord.
 *
 * Le board éditorial montre des retards, une moyenne de retard et un
 * anneau de répartition : sur une base quasi vide, ces blocs sont vrais
 * mais illisibles. Ce script crée un plan d'actions réaliste sur un
 * établissement **existant**, pour juger le rendu sur de vraies requêtes
 * plutôt que sur des données de façade.
 *
 *   pnpm db:seed                       → premier établissement trouvé
 *   pnpm db:seed <etablissementId>
 *   pnpm db:seed --planifier           → pose aussi des dates sur les
 *                                        vérifications encore à planifier
 *
 * `--planifier` est explicite parce qu'il ÉCRIT sur des lignes métier
 * existantes (datePrevue et statut de `Verification`), contrairement au reste
 * du seed qui ne fait qu'ajouter ses propres actions. À réserver à une base de
 * développement.
 *
 * L'option `--serie`, qui semait les occurrences suivantes de chaque
 * vérification sur 24 mois, a été retirée : la table `Verification` porte
 * désormais un index unique (etablissementId, obligationId, equipementId).
 * Une seule occurrence « courante » existe par couple obligation × équipement,
 * elle avance dans le temps à chaque réalisation, et l'historique vit dans
 * `RapportVerification`. Fabriquer des occurrences futures est donc devenu
 * impossible en base — et c'était de toute façon du décor, effacé au premier
 * « Actualiser ». Une frise dense se construit maintenant en projetant les
 * périodicités à la lecture, pas en écrivant des lignes.
 *
 * Idempotent : les actions posées portent un marqueur `[seed]` dans leur
 * description et sont remplacées à chaque exécution. Rien d'autre n'est
 * touché — aucune donnée saisie par l'utilisateur n'est modifiée.
 */

import {
  PrismaClient,
  type DomainePrestataire,
  type StatutAction,
  type TypeAction,
} from "@prisma/client";

const prisma = new PrismaClient();

const MARQUEUR = "[seed]";
const JOUR = 86400000;

/** Fenêtre consultable de la frise, en jours — cf. `lib/dashboard/frise`. */
const HORIZON = 730;

/** Date décalée de `jours` par rapport à maintenant (négatif = passé). */
function dans(jours: number): Date {
  return new Date(Date.now() + jours * JOUR);
}

type Gabarit = {
  libelle: string;
  type: TypeAction;
  statut: StatutAction;
  /** Échéance relative en jours ; négatif = en retard. */
  echeanceJours: number | null;
  criticite: number;
  leveeIlYaJours?: number;
};

// Un plan d'actions plausible pour un établissement de restauration :
// trois retards d'ancienneté variable (pour que la moyenne ait du sens),
// des actions à venir, et des levées récentes qui alimentent l'anneau.
const ACTIONS: Gabarit[] = [
  {
    libelle: "Remplacer le tapis antidérapant de la plonge",
    type: "protection_collective",
    statut: "ouverte",
    echeanceJours: -21,
    criticite: 3,
  },
  {
    libelle: "Reprendre l'éclairage de la réserve sèche",
    type: "reduction_source",
    statut: "en_cours",
    echeanceJours: -9,
    criticite: 2,
  },
  {
    libelle: "Formation gestes et postures — équipe du soir",
    type: "formation",
    statut: "ouverte",
    echeanceJours: -3,
    criticite: 2,
  },
  {
    libelle: "Poser une signalétique sol glissant en zone de cuisson",
    type: "organisationnelle",
    statut: "ouverte",
    echeanceJours: 12,
    criticite: 2,
  },
  {
    libelle: "Renouveler les gants anti-coupure",
    type: "protection_individuelle",
    statut: "ouverte",
    echeanceJours: 34,
    criticite: 1,
  },
  {
    libelle: "Mettre à jour la consigne d'évacuation affichée",
    type: "organisationnelle",
    statut: "en_cours",
    echeanceJours: 21,
    criticite: 2,
  },
  {
    libelle: "Sécuriser le stockage des produits lessiviels",
    type: "suppression",
    statut: "levee",
    echeanceJours: -40,
    criticite: 3,
    leveeIlYaJours: 8,
  },
  {
    libelle: "Installer un repose-pied au poste d'encaissement",
    type: "reduction_source",
    statut: "levee",
    echeanceJours: -30,
    criticite: 1,
    leveeIlYaJours: 19,
  },
];

// Trois prestataires aux pièces de vigilance datées — une expirée, une
// qui expire bientôt, une à jour — pour nourrir la famille « Documents »
// du calendrier et les alertes vigilance.
const PRESTATAIRES: {
  raisonSociale: string;
  domaines: DomainePrestataire[];
  contactNom: string;
  contactEmail: string;
  estOrganismeAgree?: boolean;
  urssafJours: number;
  rcProJours: number;
}[] = [
  {
    raisonSociale: "Vérif Élec Atlantique",
    domaines: ["electricite", "bureau_controle"],
    contactNom: "M. Lopez",
    contactEmail: "contact@verif-elec-atlantique.fr",
    estOrganismeAgree: true,
    urssafJours: 18, // expire bientôt (seuil d'alerte : 30 j)
    rcProJours: 210,
  },
  {
    raisonSociale: "Sécurité Incendie Ouest",
    domaines: ["incendie"],
    contactNom: "Mme Robin",
    contactEmail: "sav@securite-incendie-ouest.fr",
    urssafJours: -12, // expirée
    rcProJours: 90,
  },
  {
    raisonSociale: "Nettoyage Pro Services",
    domaines: ["nettoyage"],
    contactNom: "M. Diallo",
    contactEmail: "contact@nettoyage-pro-services.fr",
    urssafJours: 150,
    rcProJours: 320,
  },
];

/**
 * Étale les vérifications encore `a_planifier` sur les deux ans à venir.
 *
 * Sans ça, un établissement dont le calendrier a été généré mais jamais
 * planifié n'a aucune échéance datée : la frise est vide, et c'est exact.
 * Cette étape simule le travail de programmation qu'un dirigeant ferait
 * dans l'app, pour pouvoir juger le rendu d'une frise remplie.
 *
 * Répartition : une poignée reste dépassée, étalée sur les trois mois
 * écoulés (la frise défile aussi vers le passé, il faut donc y trouver
 * quelque chose), le reste s'échelonne sur la fenêtre consultable.
 */
async function planifierVerifications(etablissementId: string) {
  const aPlanifier = await prisma.verification.findMany({
    where: { etablissementId, statut: "a_planifier" },
    select: { id: true },
    orderBy: { datePrevue: "asc" },
  });

  if (aPlanifier.length === 0) {
    console.log("  aucune vérification à planifier");
    return;
  }

  // ~15 % restent en retard, le reste part dans le futur.
  const nbEnRetard = Math.max(1, Math.round(aPlanifier.length * 0.15));
  const nbFutures = aPlanifier.length - nbEnRetard;

  let n = 0;
  for (const [i, v] of aPlanifier.entries()) {
    const jours =
      i < nbEnRetard
        ? // Retards répartis entre −80 et −3 jours : la voie du passé
          // n'est ni vide ni tassée sur la veille.
          -(3 + Math.round((i / Math.max(1, nbEnRetard - 1)) * 77))
        : Math.round(((i - nbEnRetard) / Math.max(1, nbFutures - 1)) * HORIZON) + 4;

    await prisma.verification.update({
      where: { id: v.id },
      data: {
        datePrevue: dans(jours),
        statut: jours < 0 ? "depassee" : "planifiee",
      },
    });
    n += 1;
  }

  console.log(
    `  ${n} vérification(s) programmée(s) — dont ${nbEnRetard} laissée(s) en retard`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const planifier = args.includes("--planifier");
  const cible = args.find((a) => !a.startsWith("--"));

  const etab = cible
    ? await prisma.etablissement.findUnique({ where: { id: cible } })
    : await prisma.etablissement.findFirst({ orderBy: { createdAt: "asc" } });

  if (!etab) {
    console.error(
      cible
        ? `Aucun établissement avec l'id ${cible}.`
        : "Aucun établissement en base — créez-en un via l'app avant de semer.",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Seed sur « ${etab.raisonDisplay} » (${etab.id})`);

  // 1. Purge des seeds précédents — idempotence.
  const purgeActions = await prisma.action.deleteMany({
    where: { etablissementId: etab.id, description: { startsWith: MARQUEUR } },
  });
  console.log(`  ${purgeActions.count} action(s) de seed retirée(s)`);

  // 2. Origines. La contrainte `Action_origine_xor` impose qu'une action
  //    soit rattachée à exactement un risque OU une vérification. On
  //    s'appuie donc sur des objets réels de l'établissement : les liens
  //    du plan d'actions restent cliquables, et rien n'est orphelin.
  const [risques, verifs] = await Promise.all([
    prisma.risque.findMany({
      where: { unite: { duerp: { etablissementId: etab.id } } },
      select: { id: true },
      take: ACTIONS.length,
    }),
    prisma.verification.findMany({
      where: { etablissementId: etab.id },
      select: { id: true },
      orderBy: { datePrevue: "asc" },
      take: ACTIONS.length,
    }),
  ]);

  if (risques.length === 0 && verifs.length === 0) {
    console.error(
      "  Ni risque ni vérification sur cet établissement : impossible de\n" +
        "  rattacher une action (contrainte Action_origine_xor). Déclarez des\n" +
        "  équipements ou remplissez le DUERP avant de semer.",
    );
    process.exitCode = 1;
    return;
  }

  // 3. Plan d'actions.
  let cree = 0;
  for (const [i, g] of ACTIONS.entries()) {
    // On alterne les origines pour que le plan d'actions montre les deux
    // provenances (DUERP et écart de vérification), comme en vrai.
    const risque = risques[i % risques.length];
    const verif = verifs[i % verifs.length];
    const surRisque = risque !== undefined && (i % 2 === 0 || !verif);

    await prisma.action.create({
      data: {
        etablissementId: etab.id,
        risqueId: surRisque ? risque.id : null,
        verificationId: surRisque ? null : verif.id,
        libelle: g.libelle,
        description: `${MARQUEUR} donnée de démonstration`,
        type: g.type,
        statut: g.statut,
        criticite: g.criticite,
        echeance: g.echeanceJours === null ? null : dans(g.echeanceJours),
        leveeLe:
          g.leveeIlYaJours === undefined ? null : dans(-g.leveeIlYaJours),
        leveeCommentaire:
          g.leveeIlYaJours === undefined ? null : "Levée constatée sur site.",
      },
    });
    cree += 1;
  }
  console.log(`  ${cree} action(s) créée(s)`);

  // Pas de rapports semés : `RapportVerification` exige un fichier
  // réellement stocké (clé, nom, mime, taille). En fabriquer créerait des
  // entrées de registre pointant vers un fichier absent — exactement le
  // genre de donnée de façade qu'on veut éviter. Le bloc « Ce qui a
  // changé » se nourrit des rapports réellement déposés via l'app.

  // 4. Prestataires — marqueur en notes internes. Les dates de validité
  //    existent sans fichier déposé : c'est un état plausible (date
  //    saisie, pièce pas encore uploadée) et suffisant pour la vigilance
  //    comme pour le calendrier.
  const purgePresta = await prisma.prestataire.deleteMany({
    where: {
      etablissementId: etab.id,
      notesInternes: { startsWith: MARQUEUR },
    },
  });
  console.log(`  ${purgePresta.count} prestataire(s) de seed retiré(s)`);

  for (const g of PRESTATAIRES) {
    await prisma.prestataire.create({
      data: {
        etablissementId: etab.id,
        raisonSociale: g.raisonSociale,
        domaines: g.domaines,
        contactNom: g.contactNom,
        contactEmail: g.contactEmail,
        estOrganismeAgree: g.estOrganismeAgree ?? false,
        attestationUrssafValableJusquA: dans(g.urssafJours),
        assuranceRcProValableJusquA: dans(g.rcProJours),
        notesInternes: `${MARQUEUR} donnée de démonstration`,
      },
    });
  }
  console.log(`  ${PRESTATAIRES.length} prestataire(s) créé(s)`);

  // 5. Un permis de feu à venir et un plan de prévention en cours sans
  //    inspection commune — pour vérifier que le registre d'échéances
  //    (ADR-010) les fait bien remonter dans le calendrier, avec
  //    l'alerte R. 4512-7 sur le plan.
  const purgePermis = await prisma.permisFeu.deleteMany({
    where: {
      etablissementId: etab.id,
      descriptionTravaux: { startsWith: MARQUEUR },
    },
  });
  const purgePlans = await prisma.planPrevention.deleteMany({
    where: {
      etablissementId: etab.id,
      naturesTravaux: { startsWith: MARQUEUR },
    },
  });
  console.log(
    `  ${purgePermis.count} permis de feu et ${purgePlans.count} plan(s) de prévention de seed retirés`,
  );

  const maxPermis = await prisma.permisFeu.aggregate({
    where: { etablissementId: etab.id },
    _max: { numero: true },
  });
  await prisma.permisFeu.create({
    data: {
      etablissementId: etab.id,
      numero: (maxPermis._max.numero ?? 0) + 1,
      prestataireRaison: "BTP Ouest Couverture",
      prestataireContact: "M. Ferreira",
      prestataireEmail: "chantier@btp-ouest-couverture.fr",
      donneurOrdreNom: "Direction de l'établissement",
      dateDebut: dans(11),
      dateFin: dans(12),
      lieu: "Toiture — zone d'étanchéité",
      naturesTravaux: ["travaux_etancheite", "chalumeau"],
      descriptionTravaux: `${MARQUEUR} Reprise d'étanchéité au chalumeau`,
      statut: "attente_signatures",
    },
  });

  const maxPlans = await prisma.planPrevention.aggregate({
    where: { etablissementId: etab.id },
    _max: { numero: true },
  });
  await prisma.planPrevention.create({
    data: {
      etablissementId: etab.id,
      numero: (maxPlans._max.numero ?? 0) + 1,
      entrepriseExterieureRaison: "Clim Service Atlantique",
      efChefNom: "Mme Petit",
      efChefEmail: "interventions@clim-service-atlantique.fr",
      efEffectifIntervenant: 2,
      euChefNom: "Direction de l'établissement",
      dateDebut: dans(-2), // commencé sans inspection commune → alerte
      dateFin: dans(19),
      lieux: "Locaux techniques, cuisine",
      naturesTravaux: `${MARQUEUR} Remplacement des groupes froids`,
      travauxDangereux: true,
    },
  });
  console.log("  1 permis de feu et 1 plan de prévention créés");

  // Pas de version DUERP semée : une version est un document à valeur
  // légale (figé, conservé 40 ans) — validez-en une dans l'app pour voir
  // apparaître l'échéance « mise à jour annuelle » dans Documents.

  if (planifier) {
    await planifierVerifications(etab.id);
  } else {
    console.log(
      "  (vérifications inchangées — relancez avec --planifier pour leur poser des dates)",
    );
  }

  console.log("Terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
