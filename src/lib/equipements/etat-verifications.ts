// Où en est chaque appareil, du point de vue de ses vérifications.
//
// La page Équipements était un inventaire nu — catégorie, libellé,
// localisation, date de mise en service — et ne disait rien de l'état de
// vérification du parc. Or c'est la première question qu'un dirigeant pose
// devant une échéance : « ça vient de quel équipement, et où j'en suis avec
// lui ? » (ADR-015, révision).
//
// Le calendrier répond « qu'est-ce qui tombe quand » ; cette lecture répond
// « où en est chacun ». Deux questions, deux écrans, une seule donnée.

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { joindreDernieresRealisations } from "@/lib/rapports/joindre-realisations";
import {
  compteEtat,
  lecturesCalendrier,
  type LectureCalendrier,
  type RegistreLigne,
} from "@/lib/calendrier/etats";
import {
  porteursComptesPar,
  type LigneSondee,
} from "@/lib/perimetre/porteurs-comptes";
import type { PorteurObligation } from "@/lib/referentiels/conformite";
import type { Periodicite } from "@/lib/referentiels/types-communs";

export type EtatEquipement = {
  /** Vérifications dépassées sur cet appareil. */
  enRetard: number;
  /** La prochaine échéance non faite, la plus proche. Absente quand
   *  l'appareil n'a aucune occurrence à venir. */
  prochaine: {
    date: Date;
    libelle: string;
    /** Vient d'une LECTURE de calendrier : `archivee` en est exclu par
     *  construction — une ligne archivée n'annonce aucun rendez-vous. */
    etat: LectureCalendrier["registre"];
  } | null;
  /** La dernière vérification réalisée. Absente = aucune connue, ce qui
   *  n'est pas la même chose que « à jour ». */
  derniere: Date | null;
  /** Occurrences sans rendez-vous : leur `datePrevue` est une date de
   *  génération, pas une date choisie (ADR-010). Elles ne peuvent pas se
   *  poser sur un jour, mais l'appareil doit les annoncer. */
  aPlanifier: number;
  /** Rendez-vous datés encore devant nous. Ils comprennent la prochaine
   *  échéance d'un cycle déjà soldé : une même ligne de suivi dit « fait
   *  le 22/01/2026 » et « prochaine le 22/01/2027 » (ADR-010). Sans ce
   *  compte, un appareil parfaitement suivi n'affichait aucun signal, et
   *  la carte du parc annonçait « aucune vérification rattachée ». */
  aVenir: number;
  /** Parmi les rendez-vous à venir, ceux qui tombent dans l'horizon
   *  proche (30 jours). Le bandeau du parc les compte pour ne parler que
   *  des appareils qu'il affiche. */
  proches: number;
  /** Vérifications déjà réalisées. Un compte, pas un verdict. */
  faites: number;
  /** Les rythmes portés par cet appareil, dans l'ordre où ils
   *  apparaissent. Ils viennent des lignes de suivi elles-mêmes, jamais
   *  d'une re-déduction depuis le référentiel : c'est ce qui a été généré
   *  qui fait foi, pas ce qui devrait l'être. */
  periodicites: Periodicite[];
};

/**
 * L'état de chaque appareil, indexé par `equipementId`.
 *
 * Une seule lecture pour tout le parc — la page en affiche des dizaines, et
 * une requête par ligne serait un N+1. L'horloge est capturée une fois et
 * partagée par tous les classements (ADR-011).
 */
export async function etatVerificationsParEquipement(
  etablissementId: string,
  now: Date = new Date(),
): Promise<Map<string, EtatEquipement>> {
  const user = await requireUser();
  // Le « fait le … » de chaque ligne se lit sur ses rapports (ADR-034).
  const verifs = await joindreDernieresRealisations(
    await prisma.verification.findMany({
      where: {
        etablissementId,
        etablissement: { entreprise: { userId: user.id } },
      },
      select: {
        id: true,
        equipementId: true,
        libelleObligation: true,
        statut: true,
        datePrevue: true,
        dateRealisee: true,
        // Sans lui, une ligne dont l'obligation ne s'applique plus (ADR-034)
        // reste comptée sur la carte de son appareil, avec le statut gelé où
        // l'archivage l'a laissée.
        archiveLe: true,
        periodicite: true,
      },
      orderBy: { datePrevue: "asc" },
    }),
  );

  return repartirParEquipement(verifs, now);
}

/** Ce que fait la lecture, sans la base : la partie testable. Les
 *  occurrences doivent arriver **triées par date croissante**. */
export function repartirParEquipement(
  verifs: Array<{
    /** `null` = ligne portée par l'établissement (ADR-022) : elle n'entre
     *  dans l'état d'aucun équipement, et la boucle la saute. */
    equipementId: string | null;
    libelleObligation: string;
    statut: string;
    datePrevue: Date;
    dateRealisee: Date | null;
    /** `null` = ligne ouverte (ADR-034). `lecturesCalendrier` ne rend rien
     *  d'une ligne archivée, hors la preuve qu'elle porte. */
    archiveLe: Date | null;
    /** Le dernier rapport réalisé (ADR-034) : c'est lui qui fait `derniere`
     *  et `faites`, la ligne n'en porte plus. */
    derniereRealisation: Date | null;
    periodicite: Periodicite;
  }>,
  now: Date,
): Map<string, EtatEquipement> {
  const parEquipement = new Map<string, EtatEquipement>();

  for (const v of verifs) {
    // Une échéance d'établissement ne pèse sur aucun appareil : l'attribuer
    // à l'un d'eux serait faux, et la ranger sous une clé fourre-tout ferait
    // apparaître un « équipement » qui n'existe pas.
    if (v.equipementId === null) continue;
    const courant = parEquipement.get(v.equipementId) ?? {
      enRetard: 0,
      prochaine: null,
      derniere: null,
      aPlanifier: 0,
      aVenir: 0,
      proches: 0,
      faites: 0,
      periodicites: [],
    };

    if (!courant.periodicites.includes(v.periodicite)) {
      courant.periodicites.push(v.periodicite);
    }

    // Une ligne de suivi n'est pas une occurrence : soldée, elle porte à
    // la fois la réalisation passée et le rendez-vous suivant du cycle.
    // On la déplie donc comme le fait le calendrier (ADR-010) — sinon un
    // appareil à jour n'a plus aucune échéance à annoncer, alors que le
    // calendrier en affiche une.
    for (const lecture of lecturesCalendrier(v, now)) {
      if (lecture.lecture === "realisation") {
        courant.faites += 1;
        if (!courant.derniere || lecture.date > courant.derniere) {
          courant.derniere = lecture.date;
        }
        continue;
      }

      if (lecture.registre === "enRetard") courant.enRetard += 1;
      else if (lecture.registre === "aPlanifier") courant.aPlanifier += 1;
      else {
        courant.aVenir += 1;
        if (lecture.registre === "proche") courant.proches += 1;
      }

      // Le prochain rendez-vous, c'est le plus proche — pas le premier
      // rencontré : les réalisations déplient des dates qui ne suivent
      // pas l'ordre des `datePrevue` d'entrée. Une occurrence « à
      // planifier » n'est pas un rendez-vous : sa date est une date de
      // génération.
      if (
        lecture.registre !== "aPlanifier" &&
        (!courant.prochaine || lecture.date < courant.prochaine.date)
      ) {
        courant.prochaine = {
          date: lecture.date,
          libelle: v.libelleObligation,
          etat: lecture.registre,
        };
      }
    }

    parEquipement.set(v.equipementId, courant);
  }

  return parEquipement;
}

/**
 * Ce que le bandeau du parc compte vraiment, **mesuré** en faisant tourner son
 * agrégation sur une ligne par porteur.
 *
 * Pas une déclaration : un appel. `repartirParEquipement` saute les lignes sans
 * `equipementId` — c'est la ligne 106, et c'est tout ce qui décide du périmètre
 * de l'écran. La sonde le constate au lieu de le paraphraser, si bien qu'une
 * agrégation qui se met un jour à compter les échéances d'établissement change
 * la légende de l'écran sans que personne ait à y penser.
 *
 * Le compte agrégé est `enRetard` : c'est celui qui sert de sonde parce que la
 * ligne fabriquée est en retard, et c'est le seul état que les quatre écrans
 * annoncent tous.
 */
export function porteursDuBandeauParc(
  now: Date = new Date(),
): Set<PorteurObligation> {
  return porteursComptesPar(
    (lignes: LigneSondee[]) =>
      [...repartirParEquipement(lignes, now).values()].reduce(
        (n, e) => n + e.enRetard,
        0,
      ),
    now,
  );
}

/**
 * L'état d'un appareil ramené à ce qu'une carte d'inventaire porte : un
 * état dominant, et des signaux comptés.
 *
 * Plus de date ici. Le parc répond à « qu'est-ce que j'ai, et où » ; le
 * calendrier répond à « qu'est-ce qui tombe quand ». Poser une échéance
 * sur chaque carte faisait lire l'inventaire comme un agenda — alors que
 * l'agenda existe déjà, à côté, et le dit mieux.
 *
 * La règle de préséance est celle du reste de l'application : le retard
 * prime, puis le rendez-vous pris, puis l'absence de rendez-vous, puis la
 * dernière preuve. Et jamais un mot de conformité — l'outil compte, il ne
 * certifie pas (cf. garde-fous produit) : « 2 faites » dit deux
 * vérifications réalisées, pas un appareil en règle.
 */
/**
 * Un signal de carte : un compte, l'état qu'il compte, et le mot de cet état.
 *
 * `cle` EST UN `RegistreLigne`, ET CE N'EST PAS UN DÉTAIL. Elle valait
 * auparavant `"aVenir"`, qui n'est l'état de rien : elle réunissait `proche` et
 * `lointain`. La carte écrivait donc « 1 à venir » sur un compte dont le
 * bandeau du parc, à un clic, comptait une PARTIE sous le nom « 1 sous 30 j » —
 * deux mots proches pour deux ensembles différents, le pire des deux mondes. Et
 * la pastille peignait le tout en bleu « lointain », y compris quand tout ce
 * qu'elle comptait tombait dans les trente jours : la règle « la couleur dit
 * l'état » était fausse sur cette carte-là.
 *
 * Les deux états sont désormais deux signaux, et `etat.proches` — qui existait
 * déjà, lu par le seul bandeau du parc — sert enfin sur la carte qui le porte.
 * Rien de nouveau n'est calculé.
 */
export type SignalEquipement = {
  cle: RegistreLigne;
  nb: number;
  libelle: string;
};

export type ResumeEquipement = {
  /** L'état dominant : champ de la jauge de catégorie, et rang de tri.
   *  `archivee` en est exclu — il ne sort ni des lectures, ni des littéraux
   *  ci-dessous —, ce qui évite à l'appelant un cas mort à traiter. */
  etat: LectureCalendrier["registre"];
  /** Les signaux à afficher, du plus urgent au plus calme. Vide quand
   *  aucune vérification n'est rattachée — l'écran le dit alors en clair. */
  signaux: SignalEquipement[];
};

export function resumerEquipement(
  etat: EtatEquipement | undefined,
): ResumeEquipement {
  if (!etat) return { etat: "aPlanifier", signaux: [] };

  // Les mots ne sont plus écrits ici : `compteEtat` les prend à la table du
  // registre (`lib/calendrier/etats`), celle-là même qui donne déjà à la
  // pastille sa couleur. Un accord de pluriel copié dans un quatrième fichier
  // était le chemin par lequel « dépassées » avait cessé d'être le mot du
  // bandeau du parc, qui disait « en retard ».
  const signaux: SignalEquipement[] = [];
  const ajouter = (cle: RegistreLigne, nb: number) => {
    if (nb > 0) signaux.push({ cle, nb, libelle: compteEtat(nb, cle) });
  };

  // L'ordre est celui de l'urgence, comme partout : dépassé, sans rendez-vous,
  // proche, lointain, fait.
  ajouter("enRetard", etat.enRetard);
  ajouter("aPlanifier", etat.aPlanifier);
  // `proches` est un SOUS-ENSEMBLE de `aVenir` (cf. `EtatEquipement`) : le
  // lointain est le reste, jamais un second comptage.
  ajouter("proche", etat.proches);
  ajouter("lointain", etat.aVenir - etat.proches);
  ajouter("faite", etat.faites);

  const dominant: LectureCalendrier["registre"] =
    etat.enRetard > 0
      ? "enRetard"
      : etat.prochaine
        ? etat.prochaine.etat
        : etat.aPlanifier > 0
          ? "aPlanifier"
          : etat.faites > 0
            ? "faite"
            : "aPlanifier";

  // Un appareil qui porte des vérifications finit toujours par annoncer
  // quelque chose : le tableau vide est réservé à celui qui n'en a
  // aucune, et c'est l'écran qui le dit en clair.

  return { etat: dominant, signaux };
}
