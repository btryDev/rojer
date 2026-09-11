import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import {
  SCEAU_CALENDRIER,
  obligationParId,
} from "@/lib/referentiels/conformite";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import { cleJourCivil, debutDuJour } from "@/lib/dates";
import { derniereRealisation } from "@/lib/rapports/derniere-realisation";
import { joindreDernieresRealisations } from "@/lib/rapports/joindre-realisations";
// Module **pur** : c'est lui qui détient la partition en quatre ensembles
// disjoints (retard / à planifier / à venir / réalisées 12 mois), déjà
// utilisée par les documents générés. Le compteur du calendrier passe par
// lui pour que l'en-tête de la page, le tableau de bord et le dossier de
// conformité annoncent nécessairement les mêmes nombres.
import { repartirVerifications } from "@/lib/pdf/etat-verifications";
import { porteeBatiment, toutesLesConditions, urgenceSeule } from "./portee";
import {
  TYPES_VERIFICATION,
  typeDeVerification,
  type TypeVerification,
} from "./echeances";

/**
 * Lectures du calendrier des vérifications périodiques.
 *
 * `listerVerifications` rend les lignes de suivi complètes, historique
 * réalisé compris : la page calendrier les déplie ensuite en événements
 * (`lecturesCalendrier`), et les PDF en ont besoin telles quelles.
 *
 * Les comparaisons de dates passent toutes par `@/lib/dates` (ADR-011) :
 * une échéance datée d'aujourd'hui n'est jamais en retard.
 */

export type FiltresCalendrier = {
  domaine?: DomaineObligation;
  /**
   * Ne garder que ce qui est réellement **en retard** : statut `depassee`,
   * ou `planifiee` / `a_planifier` dont la `datePrevue` est passée, sans
   * date de réalisation. Même définition que `estVerificationEnRetard`
   * (ADR-011).
   *
   * L'ancien filtre retenait `a_planifier` **quelle que soit sa date** :
   * une occurrence générée le matin même pour l'an prochain apparaissait
   * dans « urgents », pendant qu'une occurrence planifiée et dépassée en
   * sortait. C'était l'inverse de ce que le mot annonce.
   */
  urgentsSeulement?: boolean;
  /** Ne garder que les vérifications d'équipements situés dans ce
   *  bâtiment (ADR-019). Le bâtiment d'une vérification se **déduit** de
   *  son équipement : aucune colonne ici. */
  batimentId?: string;
};

export async function listerVerifications(
  etablissementId: string,
  filtres: FiltresCalendrier = {},
) {
  const user = await requireUser();
  // L'horloge est capturée **au bord**, une seule fois, et n'est plus
  // relue au fil des comparaisons (ADR-011).
  const now = new Date();
  const debut = debutDuJour(now);

  const verifs = await prisma.verification.findMany({
    // Trois conditions indépendantes, composées et non diffusées : la portée
    // par bâtiment et l'urgence posent toutes deux un `OR`, et la diffusion
    // faisait disparaître la première (cf. `toutesLesConditions`).
    where: toutesLesConditions(
      {
        etablissementId,
        etablissement: { entreprise: { userId: user.id } },
      },
      porteeBatiment(filtres.batimentId),
      filtres.urgentsSeulement ? urgenceSeule(debut) : {},
    ),
    include: {
      equipement: {
        include: { batiment: { select: { id: true, nom: true } } },
      },
      // Le porteur salarié (ADR-023). Cette lecture alimente la page
      // calendrier, la fiche de vérification et les PDF : sans elle, la ligne
      // d'une personne s'affiche « Tout l'établissement » sur toutes ces
      // surfaces, et aucune correction en aval n'y peut rien.
      salarie: { select: { nom: true, prenom: true } },
      // La source de l'acte dont la ligne est née (ADR-032). Une seule
      // colonne, et c'est le point de levier du marquage contractuel : six
      // surfaces passent par `VerificationListee` — calendrier, fiche de
      // vérification, registre, registre PDF, dossier de conformité PDF, et
      // le ZIP qui assemble les deux PDF. Sans elle, chacune devait redemander
      // la prescription, et celle qui l'oubliait présentait un engagement
      // d'assurance comme une obligation légale sans que rien ne le signale.
      prescription: { select: { source: true } },
    },
    orderBy: [{ datePrevue: "asc" }],
  });

  // Filtre par domaine côté TS (le domaine est porté par l'obligation en
  // référentiel, pas en base). Plus simple et évite un enum en base.
  const retenues = filtres.domaine
    ? verifs.filter(
        (v) => obligationParId(v.obligationId)?.domaine === filtres.domaine,
      )
    : verifs;
  // Le « fait le … » de chaque ligne se lit sur ses rapports (ADR-034).
  return joindreDernieresRealisations(retenues);
}

export type VerificationListee = Awaited<
  ReturnType<typeof listerVerifications>
>[number];

export async function getVerification(id: string) {
  const user = await requireUser();
  const v = await prisma.verification.findFirst({
    where: { id, etablissement: { entreprise: { userId: user.id } } },
    include: {
      equipement: true,
      salarie: { select: { nom: true, prenom: true } },
      etablissement: {
        select: {
          id: true,
          raisonDisplay: true,
          entrepriseId: true,
          entreprise: { select: { raisonSociale: true } },
        },
      },
      rapports: {
        orderBy: { dateRapport: "desc" },
      },
      // Même raison que dans `listerVerifications` : la fiche d'une échéance
      // est l'écran où l'on vient chercher ce qu'elle engage (ADR-032).
      prescription: { select: { source: true, reference: true } },
    },
  });
  if (v === null) return null;
  // Tous les rapports sont déjà lus : la dernière réalisation s'en déduit
  // sans seconde requête (ADR-034).
  return { ...v, derniereRealisation: derniereRealisation(v.rapports) };
}

/**
 * Agrégats pour l'en-tête du calendrier et le tableau de bord :
 *  - `enRetard`     : échéance passée sans réalisation
 *  - `aPlanifier`   : sans date convenue, mais pas encore en retard
 *  - `aVenir`       : planifiées dans l'horizon proche (30 jours)
 *  - `realisees12m` : réalisées sur la fenêtre d'historique
 *
 * Les quatre ensembles sont **disjoints** : leur somme est le
 * dénominateur du score de conformité, sans double compte. La partition
 * n'est pas refaite ici — elle est déléguée à `repartirVerifications`,
 * qui sert aussi les documents générés. Avant, chaque écran écrivait sa
 * propre requête : `a_planifier` était compté en entier d'un côté (y
 * compris les occurrences déjà dépassées, donc en double avec les
 * retards) et ignoré de l'autre, et les bornes de fenêtre étaient prises
 * à l'heure courante plutôt qu'au début du jour.
 *
 * Une seule lecture, trois colonnes : moins coûteux que les quatre
 * `count` qu'elle remplace, et exact par construction.
 */
export async function compterEtatCalendrier(
  etablissementId: string,
  now: Date = new Date(),
  // Le bâtiment (ADR-019) : une vérification est portée par un équipement,
  // donc par un lieu. Sans ce filtre, un tableau de bord restreint à un
  // bâtiment annonçait les retards de tout l'établissement au-dessus d'une
  // liste qui n'en montrait qu'une partie.
  filtres: { batimentId?: string } = {},
) {
  const user = await requireUser();
  const verifs = await joindreDernieresRealisations(
    await prisma.verification.findMany({
      where: toutesLesConditions(
        {
          etablissementId,
          etablissement: { entreprise: { userId: user.id } },
        },
        porteeBatiment(filtres.batimentId),
      ),
      // `libelleObligation` porte le marqueur d'archivage (ADR-012) :
      // `repartirVerifications` en a besoin pour ne pas compter en retard une
      // ligne dont l'obligation ne s'applique plus.
      select: {
        id: true,
        statut: true,
        datePrevue: true,
        dateRealisee: true,
        libelleObligation: true,
        // Le porteur, pour ventiler par famille (ADR-016) : une ligne à
        // porteur salarié est un titre, pas un contrôle d'appareil.
        salarieId: true,
      },
    }),
  );

  const etat = repartirVerifications(verifs, now);
  return {
    enRetard: etat.enRetard.length,
    aPlanifier: etat.aPlanifier.length,
    aVenir: etat.aVenir.length,
    realisees12m: etat.realisees12m.length,
    /**
     * Les deux mêmes ensembles, ventilés par nature — c'est ce que
     * `repartirRetards` verse dans les familles. Un total et sa ventilation
     * sortent d'**une seule** lecture : deux requêtes voisines finissent par
     * se contredire (ADR-015), et c'est ce que ce fichier existe pour
     * empêcher.
     */
    enRetardParType: ventilerParType(etat.enRetard),
    aVenirParType: ventilerParType(etat.aVenir),
    /**
     * Toutes les lignes lues, quel que soit leur état — ce qui répond à
     * « cette famille existe-t-elle ici ? », et non « a-t-elle du retard ? ».
     * C'est ce que la rangée de pilules du calendrier demande : une pilule
     * qui disparaît sous « En retard seulement » ne se retrouve plus.
     */
    toutesParType: ventilerParType(verifs),
  };
}

/** Compte une liste de lignes par la nature que leur porteur détermine. */
function ventilerParType(
  verifs: readonly { salarieId: string | null }[],
): Record<TypeVerification, number> {
  const out = Object.fromEntries(
    TYPES_VERIFICATION.map((t) => [t, 0]),
  ) as Record<TypeVerification, number>;
  for (const v of verifs) out[typeDeVerification(v)] += 1;
  return out;
}

/**
 * Regroupement par mois (pour l'affichage calendrier).
 *
 * La clé est calculée sur le **jour civil de Paris** : sur une date
 * stockée à minuit UTC, `getMonth()` du serveur tombe juste par hasard,
 * mais un horodatage de fin de soirée bascule d'un mois le 31.
 */
export function grouperParMois(
  verifs: VerificationListee[],
): Map<string, VerificationListee[]> {
  const out = new Map<string, VerificationListee[]>();
  for (const v of verifs) {
    // Clé tri-friendly : YYYY-MM
    const cle = cleJourCivil(v.datePrevue).slice(0, 7);
    const bucket = out.get(cle) ?? [];
    bucket.push(v);
    out.set(cle, bucket);
  }
  return out;
}

/**
 * Le calendrier de cet établissement a-t-il été généré avec une version
 * antérieure du référentiel de conformité ?
 *
 * « Antérieure » se lit sur `SCEAU_CALENDRIER`, qui porte la version ET
 * l'empreinte du contenu : un contenu changé sans version changée désynchronise
 * aussi, ce que la version seule laissait passer le 2026-09-10.
 *
 * `null` en base signifie « jamais réconcilié depuis l'introduction du
 * mécanisme » : ces établissements sont rattrapés au premier affichage.
 *
 * Le référentiel vit en TypeScript versionné (ADR-003), mais ses effets sont
 * figés en base à la génération. Sans cette comparaison, une correction du
 * référentiel n'atteignait les calendriers existants qu'au hasard d'une
 * mutation d'équipement ou d'un dépôt de rapport.
 */
export async function calendrierDesynchronise(
  etablissementId: string,
): Promise<boolean> {
  const user = await requireUser();
  const etab = await prisma.etablissement.findFirst({
    where: { id: etablissementId, entreprise: { userId: user.id } },
    select: { referentielVersionCalendrier: true },
  });
  if (!etab) return false;
  return etab.referentielVersionCalendrier !== SCEAU_CALENDRIER;
}
