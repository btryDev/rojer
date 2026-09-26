// Ce qui empêche de passer à l'étape suivante du parcours de création.
//
// Ces règles vivaient en closures inline dans `ETAPES`, à l'intérieur d'un
// composant client. Aucun test ne les atteignait : la revue du 2026-08-28 l'a
// montré en remplaçant `status === "format_invalide"` par `status !== "ok"`
// — le verrou sectoriel réapparaissait, la suite restait verte. Le
// `superRefine` du schéma Zod tombait bien sur la même mutation, mais un
// dirigeant bloqué à l'étape 1 n'atteint jamais la server action : c'est ici
// que la porte se ferme réellement.
//
// Sorties du composant, elles se vérifient. Le shell n'a plus qu'à les
// appeler.
//
// Module **pur** : ni Prisma, ni React.

import { evaluerScopeSecteur } from "@/lib/onboarding/scope";
import { TYPES_ERP_QUESTION_LOCAUX_SOMMEIL } from "@/lib/etablissements/schema";
import {
  MESSAGE_NOMBRE_DE_PERSONNES,
  nombreDePersonnesADemander,
} from "@/lib/matching/personnes-presentes";
import {
  EFFECTIF_MAX,
  MESSAGE_EFFECTIF_ENTREPRISE,
} from "@/lib/onboarding/schema";
import type { CategorieErp } from "@/lib/referentiels/types-communs";
import type { OnboardingState } from "./types";

/**
 * Un refus d'avancer, et ce qu'il faut pour le montrer au bon endroit.
 *
 * Le retour était une simple chaîne, et le shell la rendait en bas de
 * colonne, sous les cartes. « Précisez le type de votre ERP » s'affichait
 * ainsi six cents pixels sous le `<select>` visé, sans que rien ne dise
 * lequel : à l'étape 2, on lisait le refus en regardant la carte
 * « habitation ». `champ` porte l'`id` du contrôle concerné — le message
 * se rend au champ, il n'attend plus qu'on le rejoigne.
 *
 * `perimetre` distingue les deux natures de refus, et la distinction est
 * visible à l'écran : un champ oublié se lève en le remplissant, donc le
 * bouton reste actif et c'est le clic qui l'apprend ; une borne du produit
 * ne se lève par aucune saisie, donc la porte s'annonce fermée avant le
 * clic (charte, interdit 19) et le refus ne s'écrit qu'une fois.
 */
export type Blocage = {
  message: string;
  /** `id` du champ visé, quand le refus en vise un. */
  champ?: string;
  /** Vrai quand aucune saisie supplémentaire ne peut lever le refus. */
  perimetre?: boolean;
};

/**
 * La borne d'effectif du produit (ADR-025 § 1, ADR-031), écrite **une
 * fois**.
 *
 * `StepIdentite` l'affiche en direct sous le champ et `validerIdentite` la
 * pose au passage d'étape : deux surfaces, un seul texte. Elles en
 * portaient deux, écrits séparément — « au-delà de ce que Rojer prend en
 * charge » sous le champ, « Rojer prend en charge les structures jusqu'à
 * 50 salariés » au clic —, et le dirigeant lisait le même refus deux fois
 * dans deux formulations.
 *
 * Elle porte sur les TRAVAILLEURS et sur eux seuls : le public reçu ne la
 * déclenche jamais — un restaurant de huit salariés qui sert trois cents
 * couverts est dans la cible, et sa catégorie d'ERP ne dit rien de son
 * effectif.
 */
export function refusEffectif(effectifSurSite: string): Blocage | null {
  const n = Number(effectifSurSite);
  if (!Number.isInteger(n) || n <= EFFECTIF_MAX) return null;
  return {
    champ: "effectifSurSite",
    perimetre: true,
    message: `${n} salariés : Rojer prend en charge les structures jusqu'à ${EFFECTIF_MAX} salariés. Au-delà, les obligations changent de nature — CSSCT dédiée, programme annuel de prévention présenté au CSE, bilan annuel — et l'outil ne les porte pas.`,
  };
}

/**
 * Étape 1 — identité et lieu. Rend le message à afficher, ou `null`.
 *
 * Le contrôle de format du code NAF passe par `evaluerScopeSecteur` et par
 * elle seule. Il était écrit **deux fois** : un motif recopié en ligne, puis
 * l'appel — et le second ne pouvait jamais se déclencher, puisqu'il applique
 * le même motif. Deux écritures d'une même règle ne peuvent pas se
 * contredire par un test, elles divergent en silence ; et un garde qui ne
 * garde rien se lit pourtant comme une garantie.
 *
 * Ce qui NE bloque plus : l'absence de référentiel sectoriel. Barrer ici
 * privait l'établissement de tout le référentiel de conformité — qui ne lit
 * jamais le code NAF — pour une cotation de risques qu'il n'avait pas
 * demandée. L'absence se dit à l'écran (`StepIdentite`), puis en permanence
 * sur le dossier (`perimetre/couverture.ts`, axe `secteur_duerp`).
 */
export function validerIdentite(s: OnboardingState): Blocage | null {
  if (s.raisonSociale.trim().length === 0)
    return {
      champ: "raisonSociale",
      message: "Indiquez la raison sociale pour continuer.",
    };
  if (s.adresseRue.trim().length < 3)
    return { champ: "adresseRue", message: "Indiquez le numéro et la rue." };
  if (!/^\d{5}$/.test(s.adresseCodePostal.trim()))
    return {
      champ: "adresseCodePostal",
      message: "Le code postal doit faire 5 chiffres.",
    };
  if (s.adresseVille.trim().length < 2)
    return { champ: "adresseVille", message: "Indiquez la ville." };
  if (s.codeNaf.trim().length === 0)
    return { champ: "codeNaf", message: "Indiquez le code NAF." };
  if (evaluerScopeSecteur(s.codeNaf).status === "format_invalide")
    return {
      champ: "codeNaf",
      message: "Le code NAF doit ressembler à 56.10A.",
    };
  const n = Number(s.effectifSurSite);
  if (!Number.isInteger(n) || n < 1)
    return {
      champ: "effectifSurSite",
      message: "Indiquez un effectif (au moins 1).",
    };
  const refus = refusEffectif(s.effectifSurSite);
  if (refus) return refus;
  // Lu comme le serveur le lira, mais le vide n'est pas un zéro.
  const e = s.effectifEntreprise.trim();
  if (e === "" || !Number.isInteger(Number(e)) || Number(e) < 0)
    return { champ: "effectifEntreprise", message: MESSAGE_EFFECTIF_ENTREPRISE };
  return null;
}

/**
 * La question du nombre de personnes est-elle à l'écran pour cet état ?
 * Une seule lecture pour l'étape, son refus et le champ posté : les trois
 * doivent dire la même chose, sinon on poste ce qu'on ne montre pas.
 */
export function nombreDePersonnesDemande(s: OnboardingState): boolean {
  // L'effectif se lit ICI comme le serveur le lira — `Number()`, ce que fait
  // `z.coerce.number()` — et non par une regex : « 12.0 » passait l'étape 1
  // (qui lit `Number`), n'ouvrait pas la question (qui lisait `^[0-9]+$`), puis
  // était refusé par le serveur à l'étape 3, sur un champ jamais montré.
  const saisi = s.effectifSurSite.trim();
  const effectif = saisi === "" ? NaN : Number(saisi);
  return nombreDePersonnesADemander({
    estERP: s.estERP,
    categorieErp: (s.categorieErp || null) as CategorieErp | null,
    effectifSurSite: Number.isInteger(effectif) ? effectif : null,
  });
}

/** Étape 2 — les régimes (ADR-004), et les deux questions qui en dépendent. */
export function validerTypologie(s: OnboardingState): Blocage | null {
  if (!s.estEtablissementTravail && !s.estERP && !s.estIGH && !s.estHabitation)
    return {
      message: "Cochez au moins un régime (travail, ERP, IGH ou habitation).",
    };
  // Le seul cumul refusé (ADR-025 § 1). Un ERP situé dans un immeuble de
  // grande hauteur relève du règlement de sécurité des IGH, que le référentiel
  // ne connaît pas du tout.
  //
  // L'IGH SEUL n'est pas refusé, et la nuance a été tranchée en séance le
  // 2026-09-01 : un employeur locataire de bureaux dans une tour relève du
  // Code du travail, que le produit sert entièrement. Les obligations du
  // règlement IGH pèsent sur l'exploitant de l'immeuble, pas sur lui.
  if (s.estERP && s.estIGH)
    return {
      perimetre: true,
      message:
        "Un établissement recevant du public situé dans un immeuble de grande hauteur relève du règlement de sécurité des IGH, que Rojer ne couvre pas.",
    };
  // « Précisez votre activité ERP » nommait un champ qui n'existe plus : le
  // parcours proposait des cartes d'« activité », le recadrage du
  // 2026-09-01 les a remplacées par la question « Quel est votre type
  // d'établissement ? ». Le refus reprend les mots du champ qu'il vise,
  // sinon il envoie chercher autre chose.
  if (s.estERP && !s.typeErp)
    return { champ: "typeErp", message: "Précisez le type de votre ERP." };
  if (s.estERP && !s.categorieErp)
    return {
      champ: "categorieErp",
      message: "Précisez la catégorie de votre ERP.",
    };
  // LES DEUX QUESTIONS DONT LA PRÉSENCE DÉPEND D'UNE AUTRE, et dont la réponse
  // est due. Sans ces deux refus, le passage d'étape laissait filer et c'est la
  // server action qui refusait — à l'étape 3, sur un champ de l'étape 2 que
  // l'écran ne montrait plus : « Formulaire invalide », sans rien à corriger
  // sous les yeux. Les conditions sont celles du schéma, par les mêmes
  // fonctions, pas une copie.
  if (
    s.estERP &&
    (TYPES_ERP_QUESTION_LOCAUX_SOMMEIL as readonly string[]).includes(
      s.typeErp,
    ) &&
    !s.comporteLocauxSommeilPublic
  )
    return {
      champ: "comporteLocauxSommeilPublic",
      message: "Indiquez si votre établissement héberge du public pour la nuit.",
    };
  if (nombreDePersonnesDemande(s)) {
    const saisie = s.personnesPresentesHabituellement.trim();
    const n = saisie === "" ? NaN : Number(saisie);
    // Mêmes bornes que le schéma serveur (1 à 99 999, entier) : ce qui passe
    // ici doit passer là-bas, sinon le refus tombe à l'étape 3, hors de vue.
    if (!Number.isInteger(n) || n < 1 || n > 99999)
      return {
        champ: "personnesPresentesHabituellement",
        message: MESSAGE_NOMBRE_DE_PERSONNES,
      };
  }
  // DEUX REFUS ONT VÉCU ICI, ET SONT TOMBÉS LE 2026-09-03 : « Précisez la
  // classe IGH » et « Précisez la famille de l'immeuble d'habitation ».
  //
  // Le second portait sa justification en commentaire, et cette justification
  // était FAUSSE : « neuf obligations portent la typologie habitation et
  // certaines ne visent qu'une partie des familles. Sans elle, elles
  // s'appliquent toutes à tout le monde. » Aucune obligation du référentiel ne
  // vise une famille — vérifié en appelant, et confirmé par le texte : l'unique
  // obligation périodique de l'arrêté du 31 janvier 1986 (article 101) ne
  // mentionne aucune famille. Même constat pour la classe d'IGH, dont les
  // vérifications (arrêté du 30 décembre 2011, GH 5) s'adressent aux
  // « propriétaires » sans varier par classe.
  //
  // Les deux sous-questions sont retirées du parcours, et ces deux refus avec
  // elles : un refus qui garde une donnée dont rien ne dépend est une étape de
  // plus, pas une garantie.
  return null;
}

/** Étape 3 — le résumé ne valide rien : c'est la server action qui tranche. */
export function validerResume(): Blocage | null {
  return null;
}
