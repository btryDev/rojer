import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { classerDate, type RegistreLigne } from "@/lib/calendrier/etats";
import { estEnRetard } from "@/lib/dates/retard";
import type { Periodicite } from "@/lib/referentiels/types-communs";
import { titreParId } from "./catalogue";
import { echeanceDuTitre, type DatesDuTitre } from "./echeance";

/**
 * Le prédicat d'appartenance des lectures de ce module (ADR-005).
 *
 * Il est porté **même quand l'appelant vient de le vérifier**. Sans RLS —
 * Prisma opère en rôle `postgres` — l'isolation est une convention
 * applicative, et une lecture qui ne la porte pas devient une fuite le jour
 * où un appelant nouveau ne vérifie pas. `navigation/sidebar-counts.ts:33`
 * appelle déjà `compterTitresEnRetard` avec un `etablissementId` nu : la
 * garde ne vit que dans les deux layouts qui l'appellent, pas ici.
 *
 * Ce module porte des données de personnes ; c'est la surface où la
 * convention coûte le plus cher à rompre. Éprouvé dans `isolation.test.ts`,
 * qui lit le dossier voisin et exige une réponse vide.
 */
async function portee() {
  const user = await requireUser();
  return { entreprise: { userId: user.id } } as const;
}

/**
 * L'état d'un titre, tel que l'écran l'affiche.
 *
 * `aPlanifier` a ici un sens précis, et il n'est pas « en retard » : un titre
 * SANS ÉCHÉANCE — ni date de fin saisie, ni durée écrite au texte.
 * L'habilitation électrique en est le cas type — le Code renvoie à des
 * modalités qu'il qualifie lui-même de recommandées, et le produit ne décrète
 * pas un rendez-vous là où le texte n'en pose aucun (ADR-023 § 6). Le peindre
 * en rouge inventerait une non-conformité.
 */
export type EtatTitre = RegistreLigne;

/**
 * Classe un titre sur SON échéance — celle que le calendrier inscrit.
 *
 * La signature prend le titre et la périodicité, jamais une date nue, et c'est
 * délibéré. Elle prenait `echeanceLe` : chaque appelant passait la date saisie,
 * et une VIP quinquennale délivrée en 2020 sans date de fin sortait « à
 * planifier » ici quand le générateur, qui calcule `delivreLe + cinq ans`, la
 * mettait en retard au calendrier et au score (relecture système du
 * 2026-09-14). Une date nue laisse l'appelant choisir laquelle ; le titre et
 * son rythme ne laissent que `echeanceDuTitre`, et un appelant qui repasserait
 * `t.echeanceLe` ne compile plus.
 *
 * Le classement lui-même est `classerDate`, la fonction partagée qui repose sur
 * `estEnRetard` et `estDansLesProchainsJours` (`lib/dates/retard.ts`) : une
 * échéance datée d'aujourd'hui n'est pas en retard, sur un titre comme sur un
 * appareil.
 */
export function classerTitre(
  titre: DatesDuTitre,
  periodicite: Periodicite | undefined,
  now: Date,
): EtatTitre {
  const echeance = echeanceDuTitre(titre, periodicite);
  if (echeance === null) return "aPlanifier";
  return classerDate(echeance, now);
}

const SELECTION_TITRE = {
  id: true,
  obligationId: true,
  delivreLe: true,
  echeanceLe: true,
  note: true,
} as const;

export async function listerEquipe(etablissementId: string, now: Date) {
  const etablissement = await portee();
  const salaries = await prisma.salarie.findMany({
    where: { etablissementId, etablissement },
    // Les personnes sorties de l'effectif en dernier, mais toujours là : leur
    // titre prouve qu'elles étaient habilitées AU MOMENT où elles ont opéré,
    // et cette preuve couvre l'employeur sur une période passée
    // (`docs/rgpd.md` § 4.3). Les masquer ferait disparaître la preuve de
    // l'écran sans la supprimer de la base — le pire des deux.
    orderBy: [{ actif: "desc" }, { nom: "asc" }, { prenom: "asc" }],
    select: {
      id: true,
      nom: true,
      prenom: true,
      poste: true,
      entreLe: true,
      actif: true,
      titres: { select: SELECTION_TITRE, orderBy: { delivreLe: "desc" } },
    },
  });

  return salaries.map((s) => ({
    ...s,
    titres: s.titres.map((t) => {
      const o = titreParId(t.obligationId);
      return {
        ...t,
        libelle: o?.libelle ?? t.obligationId,
        etat: classerTitre(t, o?.periodicite, now),
      };
    }),
  }));
}

export async function getSalarie(
  etablissementId: string,
  salarieId: string,
  now: Date,
) {
  const etablissement = await portee();
  const s = await prisma.salarie.findFirst({
    // `etablissementId` dans le `where`, jamais seulement l'id : c'est la
    // portée de tenancy (ADR-005). Un identifiant deviné ne doit pas ouvrir
    // la fiche d'une personne d'un autre dossier. Et l'établissement lui-même
    // doit appartenir au lecteur, sans quoi la portée n'est qu'un cloisonnement
    // entre dossiers d'un même compte — cf. `portee` ci-dessus.
    where: { id: salarieId, etablissementId, etablissement },
    select: {
      id: true,
      nom: true,
      prenom: true,
      poste: true,
      entreLe: true,
      actif: true,
      createdAt: true,
      titres: { select: SELECTION_TITRE, orderBy: { delivreLe: "desc" } },
    },
  });
  if (!s) return null;

  return {
    ...s,
    titres: s.titres.map((t) => {
      const o = titreParId(t.obligationId);
      return {
        ...t,
        libelle: o?.libelle ?? t.obligationId,
        /** Une pièce médicale ne s'affiche jamais avec un dépôt de fichier. */
        pieceMedicale: o?.pieceMedicale ?? false,
        referencesLegales: o?.referencesLegales ?? [],
        /**
         * L'échéance que le calendrier inscrit : saisie, ou calculée depuis la
         * délivrance. `null` = aucune. La fiche l'affiche plutôt que de la
         * recalculer — et `echeanceLe` reste lisible à côté pour ce qu'il est,
         * la date de fin portée par la pièce.
         */
        echeance: echeanceDuTitre(t, o?.periodicite),
        etat: classerTitre(t, o?.periodicite, now),
      };
    }),
  };
}

/**
 * Le compteur du rail : les titres qui appellent un geste.
 *
 * `aPlanifier` n'y entre pas — un titre sans échéance n'est pas en attente
 * de quelque chose, il n'a simplement pas de rendez-vous. Le compter
 * afficherait une pastille rouge permanente que rien ne peut éteindre.
 *
 * LE FILTRE `echeanceLe: { not: null }` EST PARTI, et c'était lui le défaut.
 * Il écartait en SQL tous les titres sans date de fin saisie — y compris ceux
 * dont le texte écrit la durée, et que le calendrier met bel et bien en retard :
 * le badge du rail valait zéro sur une VIP échue depuis un an. L'échéance ne se
 * décide pas en base, elle a besoin de la périodicité, qui vit au référentiel
 * TypeScript (ADR-003). D'où la lecture de `delivreLe` et `obligationId`, et le
 * filtre en mémoire — quelques titres par établissement.
 */
export async function compterTitresEnRetard(
  etablissementId: string,
  now: Date,
): Promise<number> {
  const etablissement = await portee();
  const titres = await prisma.titreSalarie.findMany({
    where: {
      salarie: { etablissementId, actif: true, etablissement },
    },
    select: { obligationId: true, delivreLe: true, echeanceLe: true },
  });
  return titres.filter((t) => {
    const echeance = echeanceDuTitre(t, titreParId(t.obligationId)?.periodicite);
    return echeance !== null && estEnRetard(echeance, now);
  }).length;
}

export type SalarieDeLaListe = Awaited<ReturnType<typeof listerEquipe>>[number];
export type SalarieDetail = NonNullable<Awaited<ReturnType<typeof getSalarie>>>;

/**
 * Les titres effectivement déclarés dans cet établissement.
 *
 * Distinct du **catalogue**, qui liste tout ce que le référentiel sait
 * encoder. La différence n'est pas cosmétique : c'est elle qui décide si le
 * texte d'information remis aux salariés (art. 13) décrit le traitement qui a
 * lieu, ou un traitement imaginaire.
 *
 * Le texte listait le catalogue. Un employeur qui saisissait trois personnes
 * sans déclarer aucun titre remettait donc à ses salariés un document
 * affirmant qu'on suivait leur attestation médicale — sur la pièce la plus
 * sensible qui soit, et alors que rien n'était suivi.
 */
export async function libellesTitresDeclares(
  etablissementId: string,
): Promise<string[]> {
  // Sans `actif: true`, délibérément — le seul `where` du module dans ce cas.
  // Le traitement se poursuit après le départ d'une personne (art. 17.3.b), et
  // le texte d'information doit décrire le traitement réel, pas seulement sa
  // part en cours.
  const etablissement = await portee();
  const lignes = await prisma.titreSalarie.groupBy({
    by: ["obligationId"],
    where: { salarie: { etablissementId, etablissement } },
  });
  // `?? l.obligationId` et non un filtre : un titre dont l'identifiant ne
  // résout plus au référentiel disparaîtrait sinon en silence du texte
  // d'information — qui sous-décrirait le traitement, exactement la faute que
  // cette fonction corrige, en miroir. `getSalarie` gère déjà le cas ainsi.
  return lignes
    .map((l) => titreParId(l.obligationId)?.libelle ?? l.obligationId)
    .sort((a, b) => a.localeCompare(b, "fr"));
}
