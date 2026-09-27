// Quelles fiches du registre de sécurité sont dues, et pourquoi.
//
// Un registre n'est pas le même document selon l'établissement. Le produire à
// l'identique pour tous, c'est imposer à un bureau de huit personnes une fiche
// « Équipe professionnelle de sécurité incendie » et une fiche « Colonnes
// sèches » qu'il n'aura jamais à remplir — et noyer les trois fiches qui le
// concernent vraiment dans quarante-cinq qui ne le concernent pas.
//
// Ce module répond donc à une seule question, section par section : cette
// fiche a-t-elle sa place dans CE registre ? Il rend aussi la raison, parce
// qu'un dirigeant à qui l'on demande de renseigner une fiche doit pouvoir lire
// pourquoi elle lui est demandée. C'est le même parti pris que le mode
// « explain » du moteur de matching, dont ce module réutilise la logique de
// typologie plutôt que d'en écrire une seconde (cf. ADR-021).
//
// Module **pur** : ni Prisma, ni React, ni horloge.

import { phrasesAConfirmer } from "@/lib/matching/marques";
import { matchTypologie } from "@/lib/matching";
import type {
  EquipementMatching,
  EtablissementMatching,
} from "@/lib/matching";
import {
  PARTIES_REGISTRE,
  SECTIONS_REGISTRE,
  type PartieRegistre,
  type SectionRegistre,
} from "./sections";

export type SectionDue = {
  section: SectionRegistre;
  /**
   * Pourquoi cette fiche figure au registre, en clair. Une phrase par critère
   * satisfait — jamais vide.
   */
  raisons: string[];
  /**
   * Les phrases « à confirmer » quand seule la prudence retient la fiche —
   * une question de la fiche restée muette (`matching/marques.ts`). Vide
   * sinon. Ajouté le 2026-09-27 : la fiche due par le seul silence sur les
   * matières (R. 4227-34) se lisait comme une fiche certaine.
   *
   * Des phrases seulement, sans le drapeau d'effectif de `MarqueAConfirmer` :
   * aucune section n'écrit de seuil d'effectif (`sections.ts`, vérifié le
   * 2026-09-27), donc aucune phrase n'y renvoie à la fiche de l'entreprise.
   */
  aConfirmer: string[];
};

export type PartieDue = {
  id: PartieRegistre;
  titre: string;
  sections: SectionDue[];
};

export type ComposerOptions = {
  /** Remplacement complet du catalogue — utile pour les tests. */
  sections?: readonly SectionRegistre[];
};

/**
 * Les équipements déclencheurs d'une section, s'il y en a.
 *
 * On ne teste que la **catégorie** : à la différence du calendrier, une fiche
 * d'inventaire ne dépend d'aucune propriété déclarée de l'appareil. Un
 * extincteur reste un extincteur, qu'on ait répondu ou non aux questions qui
 * bornent ses obligations.
 */
function equipementsDeclencheurs(
  section: SectionRegistre,
  equipements: EquipementMatching[],
): EquipementMatching[] {
  const cats = section.categoriesEquipement;
  if (!cats || cats.length === 0) return [];
  return equipements.filter((e) => cats.includes(e.categorie));
}

/** Une section est-elle due, et pour quelles raisons ? */
export function evaluerSection(
  section: SectionRegistre,
  etab: EtablissementMatching,
  equipements: EquipementMatching[],
): SectionDue | null {
  const raisons: string[] = [];
  let aConfirmer: string[] = [];

  if (section.typologies) {
    // Un tableau se lit en OU : la première typologie qui matche emporte la
    // fiche, et ce sont ses raisons que l'on montre. Inutile d'accumuler
    // celles des autres branches — le lecteur veut savoir pourquoi la fiche
    // est là, pas l'inventaire de tous les fondements possibles.
    const typologies = Array.isArray(section.typologies)
      ? section.typologies
      : [section.typologies];
    const matchee = typologies
      .map((t) => matchTypologie(t, etab))
      .find((r) => r.ok);
    if (!matchee || !matchee.ok) return null;
    raisons.push(...matchee.raisons);
    aConfirmer = phrasesAConfirmer(matchee);
  }

  if (section.categoriesEquipement) {
    const declencheurs = equipementsDeclencheurs(section, equipements);
    if (declencheurs.length === 0) return null;
    raisons.push(
      declencheurs.length === 1
        ? `équipement déclaré : ${declencheurs[0].libelle}`
        : `${declencheurs.length} équipements déclarés : ${declencheurs
            .map((e) => e.libelle)
            .join(", ")}`,
    );
  }

  // Ni typologie ni catégorie : la fiche est due dans tous les cas. On le dit
  // plutôt que de rendre une liste de raisons vide — le PDF et l'écran
  // affichent cette phrase, et un blanc y serait illisible.
  if (raisons.length === 0) {
    raisons.push("fiche due dans tous les cas");
  }

  return { section, raisons, aConfirmer };
}

/**
 * Les fiches dues, dans l'ordre du catalogue.
 *
 * `equipements` doit ne contenir que les équipements **actifs** : un appareil
 * retiré du parc ne fait plus apparaître sa fiche. Le filtrage appartient à
 * l'appelant, comme pour le calendrier.
 */
export function composerRegistre(
  etab: EtablissementMatching,
  equipements: EquipementMatching[],
  options?: ComposerOptions,
): SectionDue[] {
  const catalogue = options?.sections ?? SECTIONS_REGISTRE;
  const out: SectionDue[] = [];
  for (const section of catalogue) {
    const due = evaluerSection(section, etab, equipements);
    if (due) out.push(due);
  }
  return out;
}

/**
 * Les fiches dues regroupées par partie, pour le sommaire et le document.
 * Une partie dont aucune fiche n'est due n'apparaît pas : c'est ce qui évite
 * un sommaire annonçant des chapitres vides.
 */
export function composerRegistreParPartie(
  etab: EtablissementMatching,
  equipements: EquipementMatching[],
  options?: ComposerOptions,
): PartieDue[] {
  const dues = composerRegistre(etab, equipements, options);
  const out: PartieDue[] = [];
  for (const partie of PARTIES_REGISTRE) {
    const sections = dues.filter((d) => d.section.partie === partie.id);
    if (sections.length > 0) {
      out.push({ id: partie.id, titre: partie.titre, sections });
    }
  }
  return out;
}

/**
 * Les fiches dues à plat, dans l'ordre du document.
 *
 * C'est cet ordre qui donne son sens à « fiche suivante » : celui du registre
 * papier, pas celui d'un tri par état. Un dirigeant qui enchaîne les fiches
 * remonte son document dans l'ordre où il se lit — et où une commission le
 * feuillettera.
 */
export function aplatirRegistre(
  parties: readonly PartieDue[],
): { partie: PartieDue; due: SectionDue }[] {
  return parties.flatMap((partie) =>
    partie.sections.map((due) => ({ partie, due })),
  );
}
