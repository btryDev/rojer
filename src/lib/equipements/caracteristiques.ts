// Ce qu'un équipement déclare de lui-même, rendu lisible.
//
// `Equipement.caracteristiques` est un JSON : le nombre d'appareils, des cases
// à cocher, un seuil de parking, les questions à trois états de
// `CHAMPS_TRI_ETAT` et une note libre. Ces valeurs ne sont pas décoratives —
// les questions à trois états **bornent des obligations** du référentiel :
// répondre « non » retire une échéance du calendrier, et « pas encore
// répondu » la laisse. (Le compte de ces questions ne figure plus ici : deux
// nombres écrits à la main s'y sont périmés, cf. `CHAMPS_TRI_ETAT`.)
//
// La fiche doit donc les montrer, et montrer aussi les questions restées
// sans réponse : c'est le seul endroit où le dirigeant peut comprendre
// pourquoi telle vérification figure encore à son calendrier.
//
// Module **pur** : ni Prisma, ni React. Il ne lit que la table des
// questions du schéma, pour ne pas maintenir une seconde liste.

import {
  CATEGORIES_AERATION,
  questionsTriEtatPour,
  type ChampTriEtat,
} from "./schema";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/**
 * Libellés courts, pour une ligne de fiche. Le formulaire pose la
 * question en entier (« Cette VMC est-elle raccordée à des appareils à
 * gaz ? ») ; la fiche relit une réponse, elle nomme la propriété.
 */
export const LIBELLE_CARACTERISTIQUE: Record<ChampTriEtat, string> = {
  aGroupeElectrogene: "Groupe électrogène de sécurité",
  estVmcGaz: "VMC raccordée au gaz",
  aExtinctionAutomatique: "Extinction automatique en cuisine",
  sertAuLevageDePersonnes: "Sert au levage de personnes",
  estChariotOuGerbeur: "Appareil de l'art. 20-II (chariot, gerbeur, hayon…)",
  estMuParForceHumaine: "Mû par la force humaine directe",
  aAccessoiresDeLevage: "Accessoires de levage utilisés",
  estSoumisSuiviEnService: "Suivi en service (arrêté du 20 nov. 2017)",
  estChargeSousSeuilControle: "Charge sous le seuil de contrôle",
  estHermetiquementScelleSousSeuil: "Hermétiquement scellé et sous seuil",
  estChargeSuperieure50TCo2: "Charge de fluide au-delà de 50 t éq. CO₂",
  estChargeSuperieure500TCo2: "Charge de fluide au-delà de 500 t éq. CO₂",
  aDetectionDeFuites: "Détection fixe des fuites",
};

export type CaracteristiqueLisible = {
  cle: string;
  libelle: string;
  valeur: string;
  /**
   * Vrai quand la question borne une obligation et n'a pas encore de
   * réponse : l'échéance reste au calendrier, et l'écran doit le dire
   * plutôt que d'afficher un blanc.
   */
  enAttente?: boolean;
};

/** Lecture défensive : le JSON vient de la base, pas d'un type. */
function bool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

/**
 * Les caractéristiques déclarées d'un appareil, dans l'ordre d'affichage :
 * les propriétés propres à sa catégorie d'abord, puis les questions qui
 * bornent ses obligations — répondues ou non.
 */
export function caracteristiquesLisibles(
  categorie: CategorieEquipement,
  brut: unknown,
  /** Le régime de l'établissement, quand il est connu (C41). */
  contexte?: { estERP?: boolean },
): CaracteristiqueLisible[] {
  const c =
    brut !== null && typeof brut === "object" && !Array.isArray(brut)
      ? (brut as Record<string, unknown>)
      : {};
  const out: CaracteristiqueLisible[] = [];

  if (typeof c.nombre === "number" && c.nombre > 0) {
    out.push({
      cle: "nombre",
      libelle: "Nombre d'appareils",
      valeur: String(c.nombre),
    });
  }

  // La case n'est posée que sur les catégories d'aération, mais le
  // formulaire écrit `false` pour toutes les autres — une case décochée ne
  // se distingue pas d'une case absente dans un `FormData`. Sans ce garde,
  // un extincteur affichait « Local à pollution spécifique : Non », une
  // réponse que personne n'a donnée à une question qu'on ne lui a jamais
  // posée. C'est exactement ce que ce module existe pour éviter.
  const pollution = bool(c.estLocalPollutionSpecifique);
  if (CATEGORIES_AERATION.includes(categorie) && pollution !== undefined) {
    out.push({
      cle: "estLocalPollutionSpecifique",
      libelle: "Local à pollution spécifique",
      valeur: pollution ? "Oui" : "Non",
    });
  }

  // Même garde que ci-dessus, et même raison : la case n'est posée que sur les
  // catégories d'aération. Elle décide d'une échéance semestrielle (arrêté du
  // 8 octobre 1987, art. 4 b) — la fiche doit donc montrer la réponse, sans
  // quoi un exploitant ne peut ni vérifier ni corriger ce qui lui vaut, ou lui
  // retire, une ligne de calendrier.
  const recyclage = bool(c.aSystemeDeRecyclage);
  if (CATEGORIES_AERATION.includes(categorie) && recyclage !== undefined) {
    out.push({
      cle: "aSystemeDeRecyclage",
      libelle: "Système de recyclage d'air",
      valeur: recyclage ? "Oui" : "Non",
    });
  }

  if (typeof c.nbVehiculesParkingCouvert === "number") {
    out.push({
      cle: "nbVehiculesParkingCouvert",
      libelle: "Parking couvert",
      valeur: `${c.nbVehiculesParkingCouvert} véhicule${
        c.nbVehiculesParkingCouvert > 1 ? "s" : ""
      }`,
    });
  }

  // Les questions à trois états, mais seulement celles qui concernent la
  // catégorie : afficher « Levage de personnes » sur un extincteur ferait
  // douter de tout le reste de la fiche.
  // Et, hors ERP, pas celles qui ne gouvernent que des obligations d'ERP.
  for (const { champ } of questionsTriEtatPour(categorie, contexte?.estERP)) {
    const v = bool(c[champ]);
    out.push({
      cle: champ,
      libelle: LIBELLE_CARACTERISTIQUE[champ],
      valeur:
        v === undefined ? "Pas encore répondu" : v ? "Oui" : "Non",
      enAttente: v === undefined,
    });
  }

  if (typeof c.notes === "string" && c.notes.trim().length > 0) {
    out.push({ cle: "notes", libelle: "Notes", valeur: c.notes.trim() });
  }

  return out;
}
