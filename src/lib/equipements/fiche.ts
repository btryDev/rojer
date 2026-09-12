// Ce qu'une fiche d'équipement a besoin de savoir.
//
// Jusqu'ici, un équipement n'avait pas de fiche : la liste offrait
// « Modifier » et « Supprimer », et l'histoire de l'appareil — ses
// vérifications, ses rapports, les écarts qu'il a fait naître — vivait
// éclatée entre le calendrier, le registre et le plan d'actions. Le
// dirigeant devait recoller trois écrans pour répondre à une question
// simple : « où j'en suis avec cet extincteur ? ».
//
// Une seule lecture rassemble tout, puis des fonctions **pures** en tirent
// les trois listes que la fiche affiche : ce qui reste à faire, ce qui a
// été fait, et les obligations qui expliquent pourquoi. Rien n'est
// recalculé côté vue.

import type { ResultatVerification } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import {
  classerDate,
  estRealisee,
  classerVerification,
  type RegistreLigne,
} from "@/lib/calendrier/etats";
import { estActionEnRetard, estActionOuverte } from "@/lib/dates/retard";
import { derniereRealisation } from "@/lib/rapports/derniere-realisation";
import { obligationParId } from "@/lib/referentiels/conformite";
import type { Obligation } from "@/lib/referentiels/conformite/types";
import {
  determineObligationsApplicables,
  projeterEtablissement,
} from "@/lib/matching";
import { estDeclencheeParUnFait } from "@/lib/etats-permanents/regle";

/**
 * L'équipement, ses lignes de suivi, leurs rapports et les actions qu'elles
 * ont fait naître. Un équipement retiré du parc (`actif: false`) reste
 * lisible : c'est même la seule porte vers son historique (ADR-012).
 */
export async function getFicheEquipement(id: string) {
  const user = await requireUser();
  return prisma.equipement.findFirst({
    where: { id, etablissement: { entreprise: { userId: user.id } } },
    include: {
      etablissement: {
        select: {
          id: true,
          raisonDisplay: true,
          // Combien de bâtiments porte l'établissement : sous un seul,
          // l'afficher n'apprend rien (ADR-019).
          _count: { select: { batiments: true } },
          // La typologie, parce que la fiche interroge désormais le MOTEUR et
          // plus seulement les lignes persistées. Les douze champs sont ceux
          // que `projeterEtablissement` recopie : les prendre un à un plutôt
          // qu'en bloc garde la raison sociale et l'adresse hors du matching,
          // et une omission ne compile pas.
          effectifSurSite: true,
          estEtablissementTravail: true,
          estERP: true,
          estIGH: true,
          estHabitation: true,
          typeErp: true,
          categorieErp: true,
          classeIgh: true,
          familleHabitation: true,
          personnesPresentesHabituellement: true,
          manipuleMatieresR422722: true,
          comporteLocauxSommeilPublic: true,
        },
      },
      // Le lieu de l'appareil. Le parc renvoie ici en disant qu'un appareil
      // se déplace « depuis sa fiche » : elle ne nommait pas le bâtiment.
      batiment: { select: { id: true, nom: true } },
      verifications: {
        orderBy: { datePrevue: "asc" },
        include: {
          rapports: { orderBy: { dateRapport: "desc" } },
          actions: true,
        },
      },
    },
  });
}

export type FicheEquipement = NonNullable<
  Awaited<ReturnType<typeof getFicheEquipement>>
>;
export type VerificationFiche = FicheEquipement["verifications"][number];
export type ActionFiche = VerificationFiche["actions"][number];
export type RapportFiche = VerificationFiche["rapports"][number];

/**
 * Une ligne « à faire » : une échéance de vérification qui n'est pas
 * soldée, ou une action corrective encore ouverte. Les deux se rangent sur
 * la même liste parce que c'est ainsi qu'elles arrivent au dirigeant —
 * l'une comme l'autre lui demandent un geste, à une date.
 */
export type LigneAFaire = {
  cle: string;
  genre: "verification" | "action";
  /** `null` = pas de rendez-vous convenu (occurrence à planifier). */
  date: Date | null;
  etat: RegistreLigne;
  surtitre: string;
  libelle: string;
  detail: string;
  href: string;
};

/** Une ligne d'historique : ce qui a été fait, daté du jour où ça l'a été. */
export type LigneHistoire = {
  cle: string;
  date: Date;
  etat: RegistreLigne;
  surtitre: string;
  libelle: string;
  detail: string;
  /** Le verdict du rapport, quand la ligne en porte un. */
  resultat: ResultatVerification | null;
  href: string | null;
};

/**
 * Ce qui reste à faire sur cet appareil, du plus urgent au plus lointain.
 *
 * Une occurrence « à planifier » n'a pas de rendez-vous : sa `datePrevue`
 * est une date de génération (ADR-010). Elle figure quand même dans la
 * liste — il y a bien quelque chose à faire — mais sans tuile-date, et elle
 * se range après les échéances datées.
 */
export function lignesAFaire(
  eq: FicheEquipement,
  base: string,
  maintenant: Date,
): LigneAFaire[] {
  const lignes: LigneAFaire[] = [];

  for (const v of eq.verifications) {
    // UNE LIGNE, UNE ÉCHÉANCE (ADR-034, N4). Elle en portait deux — le fait
    // passé et le rendez-vous suivant —, et cette liste devait donc la déplier
    // pour ne pas faire disparaître les échéances d'un appareil à jour. Depuis
    // que le dépôt fait rouler la ligne, `classerVerification` suffit : ce qui
    // reste à faire, c'est son échéance ouverte. Les contrôles faits, eux, sont
    // l'historique de la fiche, quelques lignes plus bas.
    const etat = classerVerification(v, maintenant);
    // Une ligne éteinte ne réclame rien : elle n'a pas sa place dans « à faire ».
    if (etat !== "archivee" && etat !== "faite") {
      lignes.push({
        cle: `v-${v.id}`,
        genre: "verification",
        date: etat === "aPlanifier" ? null : v.datePrevue,
        etat,
        surtitre: "Vérification",
        libelle: v.libelleObligation,
        detail:
          etat === "aPlanifier"
            ? "Aucune date convenue — à caler avec votre prestataire"
            : "Échéance portée au calendrier",
        href: `${base}/verifications/${v.id}`,
      });
    }

    for (const a of v.actions) {
      if (!estActionOuverte(a)) continue;
      lignes.push({
        cle: `a-${a.id}`,
        genre: "action",
        date: a.echeance,
        etat: !a.echeance
          ? "aPlanifier"
          : estActionEnRetard(a, maintenant)
            ? "enRetard"
            : classerDate(a.echeance, maintenant),
        surtitre: "Correction",
        libelle: a.libelle,
        detail: a.responsable
          ? `Responsable : ${a.responsable}`
          : "Responsable non désigné",
        href: `${base}/actions/${a.id}`,
      });
    }
  }

  return lignes.sort(comparerParDate);
}

/** Les datées d'abord, dans l'ordre ; les sans-date à la fin. */
function comparerParDate(
  a: { date: Date | null },
  b: { date: Date | null },
): number {
  if (a.date && b.date) return a.date.getTime() - b.date.getTime();
  if (a.date) return -1;
  if (b.date) return 1;
  return 0;
}

/**
 * Ce qui a été fait, du plus récent au plus ancien.
 *
 * Un rapport déposé fait foi : c'est lui qu'on présente en cas de
 * contrôle, donc c'est lui qui date la ligne. Une vérification marquée
 * réalisée sans rapport figure aussi — elle est moins solide, l'écran ne le
 * cache pas. La mise en service ferme la liste : elle explique pourquoi
 * l'appareil a un calendrier.
 */
export function lignesHistoire(
  eq: FicheEquipement,
  base: string,
): LigneHistoire[] {
  const lignes: LigneHistoire[] = [];

  for (const v of eq.verifications) {
    const href = `${base}/verifications/${v.id}`;

    if (v.rapports.length > 0) {
      // Les actions correctives d'une ligne de suivi sont rattachées à la
      // ligne, pas au rapport : impossible de dire lequel des dépôts les a
      // fait naître. On les annonce donc sur le plus récent (les rapports
      // arrivent triés décroissants), et sur lui seul — les répéter à
      // chaque dépôt ferait lire plusieurs fois les mêmes écarts.
      const nbActions = v.actions.length;
      v.rapports.forEach((r, i) => {
        lignes.push({
          cle: `r-${r.id}`,
          date: r.dateRapport,
          etat: "faite",
          surtitre: "Vérification",
          libelle: v.libelleObligation,
          detail: [
            "Rapport déposé",
            r.organismeVerif,
            i === 0 && nbActions > 0
              ? `${nbActions} action${nbActions > 1 ? "s" : ""} corrective${nbActions > 1 ? "s" : ""}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          resultat: r.resultat,
          href,
        });
      });
      continue;
    }

    // `estRealisee` et non `classerVerification(...) === "faite"` : depuis que
    // l'archivage prend le pas dans le CLASSEMENT, une ligne archivée qui
    // portait une réalisation sortait de l'historique de l'appareil. Or
    // l'archivage tait ce qui est ATTENDU, jamais ce qui a EU LIEU — c'est la
    // règle que `lecturesCalendrier` applique déjà en gardant le fait passé.
    if (estRealisee(v)) {
      lignes.push({
        cle: `v-${v.id}`,
        date: v.dateRealisee ?? v.datePrevue,
        etat: "faite",
        surtitre: "Vérification",
        libelle: v.libelleObligation,
        detail: "Marquée réalisée — aucun rapport au dossier",
        resultat: null,
        href,
      });
    }
  }

  if (eq.dateMiseEnService) {
    lignes.push({
      cle: "mise-en-service",
      date: eq.dateMiseEnService,
      etat: "aPlanifier",
      surtitre: "Déclaration",
      libelle: "Mise en service de l'équipement",
      detail: "Ajouté au parc, calendrier généré",
      resultat: null,
      href: null,
    });
  }

  return lignes.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Les obligations qui pèsent sur cet appareil, dédoublonnées.
 *
 * Elles sont lues dans le référentiel TypeScript à partir des
 * `obligationId` portés par les lignes de suivi (ADR-003) — jamais
 * reconstituées depuis les libellés stockés. Une obligation retirée du
 * référentiel depuis la génération n'a plus de fiche : elle est écartée
 * plutôt qu'affichée sans sa source, puisqu'une référence réglementaire
 * ne s'invente pas.
 */
export function obligationsDeLEquipement(eq: FicheEquipement): Obligation[] {
  const vues = new Set<string>();
  const out: Obligation[] = [];
  for (const v of eq.verifications) {
    if (vues.has(v.obligationId)) continue;
    vues.add(v.obligationId);
    const o = obligationParId(v.obligationId);
    if (o) out.push(o);
  }
  return out;
}

/**
 * Ce qui se déclenche sur cet appareil sans jamais tomber à une date.
 *
 * ## Pourquoi cette lecture ne peut pas partir des `Verification`
 *
 * `obligationsDeLEquipement` ci-dessus part des lignes persistées, et c'est
 * juste pour ce qu'elle rend : les obligations qui ont produit un rendez-vous.
 * Mais le générateur **saute** la périodicité `autre` — aucun texte n'en écrit
 * le rythme —, donc une obligation événementielle n'a jamais de `Verification`
 * et cette fonction-là ne peut structurellement pas la voir. C'est ainsi que
 * `froid-controle-etancheite-apres-modification` n'atteignait aucune surface :
 * le contrôle d'étanchéité après modification du circuit est dû, la fiche de
 * la chambre froide n'en disait pas un mot.
 *
 * On repasse donc par le **moteur**, comme `hors-referentiel.ts` : la réponse
 * ne dépend alors que du référentiel, de la typologie et des caractéristiques
 * de l'appareil — elle est vraie avant même la première génération, et elle
 * reste vraie sur un dossier dont le calendrier n'a jamais tourné.
 *
 * ## Un seul équipement passé au moteur
 *
 * `determineObligationsApplicables` accepte un parc ; on ne lui donne que cet
 * appareil-ci. Les conditions d'une obligation portée par un équipement se
 * lisent sur l'équipement (`conditionSatisfaite`), pas sur ses voisins : la
 * réponse est donc la même que si on passait le parc entier, en une boucle au
 * lieu de N. Les obligations portées par l'établissement traversent bien le
 * moteur, et `estPorteeParEquipement` les écarte ici — leur sujet n'est pas
 * cet appareil, et c'est la fiche de l'établissement qui les doit.
 *
 * ## Ce qui n'est pas lu, et qui devra l'être
 *
 * Les surcharges de prescription particulière (ADR-014). Un arrêté qui donne
 * un rythme à une obligation `autre` la ferait passer au calendrier, et elle
 * n'aurait plus rien à faire ici. `reperterSansEcheance` a la même lacune, au
 * même endroit et pour la même raison : `determineObligationsApplicables` ne
 * rend pas les surcharges, seul `appliquerPrescriptions` les calcule. Le jour
 * où l'une des deux lectures les branche, l'autre doit suivre — d'où cette
 * note, écrite des deux côtés plutôt qu'un demi-remède posé d'un seul.
 */
export function obligationsDeclencheesParUnFait(
  eq: FicheEquipement,
): ObligationDeclencheeParUnFait[] {
  const applicables = determineObligationsApplicables(
    projeterEtablissement(eq.etablissement),
    [
      {
        id: eq.id,
        libelle: eq.libelle,
        categorie: eq.categorie,
        caracteristiques: (eq.caracteristiques ?? null) as Record<
          string,
          unknown
        > | null,
      },
    ],
  );

  return applicables
    .filter((a) => a.porteur === "equipement")
    .filter((a) => estDeclencheeParUnFait(a.obligation))
    .map((a) => ({ obligation: a.obligation, raisons: a.raisons }));
}

/**
 * Une obligation événementielle qui vise cet appareil, avec le mode *explain*
 * du moteur — ce qui, dans ce dossier-ci, la fait porter sur lui.
 *
 * Les `raisons` sont reprises telles que le moteur les écrit, jamais
 * reformulées : une phrase réécrite à côté finit par dire autre chose que le
 * calcul qu'elle prétend expliquer.
 */
export type ObligationDeclencheeParUnFait = {
  obligation: Obligation;
  raisons: string[];
};
