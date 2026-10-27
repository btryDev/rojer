// Ce qu'il reste à faire sur le parc d'équipements, une ligne par geste.
//
// Le board dit « Compléter vos équipements » et nomme les appareils ; il ne
// disait pas QUOI compléter, et la page Équipements ne marquait aucun appareil
// (retour de la propriétaire du 2026-10-27, compte de test du préventeur). Cette
// liste nomme la question, et mène à l'écran où elle se répond.
//
// Une ligne disparaît dès que son geste est fait : il n'y a pas d'étape cochée,
// la liste ne garde que ce qui reste.
//
// Module pur : ni Prisma, ni React.

import type { ChampTriEtat } from "./schema";
import { pluriel } from "@/lib/rendu/pluriel";

/**
 * La question, courte, posée à l'appareil. Le formulaire la pose en entier avec
 * son aide (`EquipementForm`) ; la fiche relit la réponse sous un libellé
 * (`LIBELLE_CARACTERISTIQUE`). Ici, on dit ce qu'il faut répondre.
 */
export const QUESTION_COURTE: Record<ChampTriEtat, string> = {
  aGroupeElectrogene: "Un groupe électrogène de sécurité est-il présent ?",
  estVmcGaz: "La VMC est-elle raccordée à des appareils à gaz ?",
  aExtinctionAutomatique: "Une extinction automatique est-elle installée ?",
  sertAuLevageDePersonnes: "L'appareil sert-il à lever des personnes ?",
  estMuParForceHumaine: "L'appareil est-il manuel (mû par la seule force humaine) ?",
  estChariotOuGerbeur: "Est-ce un chariot élévateur, un gerbeur, un hayon ou un appareil de la même liste ?",
  aAccessoiresDeLevage: "Des accessoires de levage sont-ils utilisés ?",
  estSoumisSuiviEnService: "L'équipement est-il suivi en service (arrêté du 20 novembre 2017) ?",
  estChargeSousSeuilControle: "La charge en fluide est-elle sous le seuil de contrôle ?",
  estHermetiquementScelleSousSeuil: "L'équipement est-il hermétiquement scellé et sous le seuil ?",
  estChargeSuperieure50TCo2: "La charge dépasse-t-elle 50 t équivalent CO₂ ?",
  estChargeSuperieure500TCo2: "La charge dépasse-t-elle 500 t équivalent CO₂ ?",
  aDetectionDeFuites: "Une détection fixe des fuites est-elle installée ?",
  estSsiCategorieAouB: "Le SSI est-il de catégorie A ou B ?",
  estDesenfumageMecanique: "Le désenfumage est-il mécanique ?",
};

export type LigneResteAFaire =
  | {
      genre: "questions";
      cle: string;
      titre: string;
      questions: string[];
      href: string;
    }
  | {
      genre: "dates";
      cle: string;
      titre: string;
      detail: string;
      href: string;
    }
  | {
      genre: "suggestions";
      cle: "suggestions";
      titre: string;
      detail: string;
    };

/**
 * Les lignes, dans l'ordre où elles se traitent : les réponses qui décident
 * d'un rythme d'abord, puis la déclaration du parc.
 *
 * LES SUGGESTIONS ne sont une ligne que tant qu'aucun équipement n'est déclaré
 * (décision de la propriétaire du 2026-10-27, « masquer seulement ») : rien ne
 * retient « je n'en ai pas », et une suggestion écartée restait affichée à
 * vie. Après le premier appareil, elles ne vivent plus que derrière le lien de
 * la barre du parc, qui ouvre la même fenêtre.
 */
export function resteAFaireDuParc({
  appareilsMuets,
  aDater = [],
  nbEquipements,
  nbSuggestions,
  hrefModifier,
  hrefFiche = hrefModifier,
}: {
  appareilsMuets: readonly { equipementId: string; libelle: string; champ: ChampTriEtat }[];
  /** Appareils dont des contrôles à rythme n'ont pas d'échéance connue (ADR-051). */
  aDater?: readonly { equipementId: string; libelle: string; nombre: number }[];
  nbEquipements: number;
  nbSuggestions: number;
  hrefModifier: (equipementId: string) => string;
  /** La fiche de l'appareil, où se déclare la date du dernier contrôle. */
  hrefFiche?: (equipementId: string) => string;
}): LigneResteAFaire[] {
  const parAppareil = new Map<string, { libelle: string; champs: ChampTriEtat[] }>();
  for (const a of appareilsMuets) {
    const deja = parAppareil.get(a.equipementId);
    if (deja) {
      if (!deja.champs.includes(a.champ)) deja.champs.push(a.champ);
    } else {
      parAppareil.set(a.equipementId, { libelle: a.libelle, champs: [a.champ] });
    }
  }

  const lignes: LigneResteAFaire[] = [...parAppareil].map(([id, { libelle, champs }]) => ({
    genre: "questions",
    cle: `questions-${id}`,
    titre: `${libelle} : ${champs.length > 1 ? `répondre à ${champs.length} questions` : "répondre à une question"}`,
    questions: champs.map((c) => QUESTION_COURTE[c]),
    href: hrefModifier(id),
  }));

  // Après les réponses : une réponse peut changer le rythme, donc la date
  // qu'une déclaration donnerait.
  for (const a of aDater) {
    if (a.nombre <= 0) continue;
    lignes.push({
      genre: "dates",
      cle: `dates-${a.equipementId}`,
      titre: `${a.libelle} : renseigner la date du dernier contrôle`,
      detail: `${
        a.nombre > 1 ? `${a.nombre} contrôles n'ont pas d'échéance connue` : "Un contrôle n'a pas d'échéance connue"
      } : la date du dernier passage calcule le prochain. Appareil neuf ? Sa date de mise en service suffit.`,
      href: hrefFiche(a.equipementId),
    });
  }

  if (nbEquipements === 0 && nbSuggestions > 0) {
    lignes.push({
      genre: "suggestions",
      cle: "suggestions",
      titre: "Déclarer vos équipements",
      detail: `${pluriel(nbSuggestions, "équipement souvent présent", "équipements souvent présents")} dans votre activité : cochez ceux que vous avez.`,
    });
  }

  return lignes;
}
