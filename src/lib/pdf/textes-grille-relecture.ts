// Textes de la grille et du dossier de relecture
// (`scripts/generer-grille-equipements.tsx`), sortis du script pour être
// testés : le script rend un PDF dès qu'on l'importe.

import { LIBELLE_ACTIVITE } from "@/lib/matching/engine";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import type {
  ArticleDepouille,
  SourceLecture,
} from "@/lib/referentiels/corpus/types";
import type { TypologieApplication } from "@/lib/referentiels/types-communs";

/**
 * Un critère de `TypologieApplication`, rendu en un bout de phrase — ou
 * `null` quand il est absent, ou qu'un autre critère le rend avec lui.
 */
type RenduCritere = (t: TypologieApplication) => string | null;

/**
 * UNE ENTRÉE PAR CLÉ DU TYPE, et le compilateur le tient : `Required<…>`
 * rend chaque clé obligatoire ici. Un critère ajouté à `TypologieApplication`
 * sans sa phrase fait échouer `tsc` au lieu d'être tu dans la ligne
 * « Régime ».
 *
 * Ce qui a fait cette table : jusqu'au 2026-10-13, la ligne « Régime » était
 * une suite de `if` écrite avant `locauxSommeilPublic`, `typesExclus`,
 * `activite`, `ssiCategorieAouB`, `effectifMaille` et `horsChampR422734`. Elle
 * ne les rendait pas, et pour le dernier elle disait l'inverse :
 * `{ travail: true, personnesPresentesMin: 51, horsChampR422734: true }`
 * (instructions d'évacuation, R. 4227-37 al. 2) s'imprimait « au moins 51
 * personnes présentes » sur une ligne qui ne vaut que SOUS ce seuil. Correctif
 * déjà écrit le 2026-09-28 (47ccf91d), jamais intégré.
 *
 * L'ordre des clés est l'ordre d'impression.
 */
const RENDU_CRITERE: { [K in keyof Required<TypologieApplication>]: RenduCritere } = {
  travail: (t) =>
    t.travail === true ? "Travail" : t.travail === false ? "hors Travail" : null,
  erp: (t) => {
    if (t.erp === true) return "ERP";
    if (t.erp === false) return "hors ERP";
    if (!t.erp) return null;
    const p: string[] = [];
    if (t.erp.categories?.length) p.push(`cat. ${t.erp.categories.join(", ")}`);
    if (t.erp.types?.length) p.push(`type ${t.erp.types.join(", ")}`);
    // Ne mord que sur un type connu : un ERP sans type déclaré n'est pas exclu
    // (`matchTypologie`).
    if (t.erp.typesExclus?.length) p.push(`sauf type ${t.erp.typesExclus.join(", ")}`);
    return `ERP${p.length ? ` (${p.join(" ; ")})` : ""}`;
  },
  igh: (t) => {
    if (t.igh === true) return "IGH";
    if (t.igh === false) return "hors IGH";
    if (!t.igh) return null;
    return `IGH (${t.igh.classes.join(", ")})`;
  },
  habitation: (t) => {
    if (t.habitation === true) return "Habitation";
    if (t.habitation === false) return "hors habitation";
    if (!t.habitation) return null;
    return `Habitation (${t.habitation.familles.join(", ")})`;
  },
  // Les deux sens n'ont pas le même comportement face au silence
  // (`TypologieApplication.locauxSommeilPublic`) : la ligne le dit.
  locauxSommeilPublic: (t) =>
    t.locauxSommeilPublic === true
      ? "avec locaux à sommeil pour le public (sans réponse : à confirmer)"
      : t.locauxSommeilPublic === false
        ? "sans locaux à sommeil pour le public, déclaré « non »"
        : null,
  activite: (t) =>
    t.activite
      ? `${LIBELLE_ACTIVITE[t.activite]} (sans réponse : à confirmer)`
      : null,
  ssiCategorieAouB: (t) =>
    t.ssiCategorieAouB
      ? `${LIBELLE_ACTIVITE.ssiCategorieAouB} (sans réponse : à confirmer)`
      : null,
  effectifMin: (t) =>
    t.effectifMin !== undefined
      ? `effectif d'au moins ${t.effectifMin}${maille(t)}`
      : null,
  effectifMax: (t) =>
    t.effectifMax !== undefined
      ? `effectif d'au plus ${t.effectifMax}${maille(t)}`
      : null,
  // Rendue avec le seuil qu'elle qualifie ; seule, elle ne dit rien.
  effectifMaille: () => null,
  personnesPresentesMin: (t) => {
    if (t.personnesPresentesMin === undefined) return null;
    // Le complément lit le même seuil dans l'autre sens.
    if (t.horsChampR422734) return null;
    return `au moins ${t.personnesPresentesMin} personnes présentes`;
  },
  champR422734: (t) =>
    t.champR422734 && !t.horsChampR422734 ? "ou matières R. 4227-22" : null,
  // Le moteur ne retient la ligne que hors du champ ÉTABLI : seuil non
  // atteint ET matières déclarées « non » ; sans l'une des deux réponses,
  // c'est la consigne qui est retenue, « à confirmer » (`matchTypologie`).
  horsChampR422734: (t) => {
    if (!t.horsChampR422734) return null;
    const seuil =
      t.personnesPresentesMin !== undefined
        ? `moins de ${t.personnesPresentesMin} personnes présentes`
        : "seuil de personnes présentes non atteint";
    return `hors champ de R. 4227-34 : ${seuil} ET matières R. 4227-22 déclarées « non », les deux établis`;
  },
};

function maille(t: TypologieApplication): string {
  return t.effectifMaille === "entreprise"
    ? " (compté à l'entreprise)"
    : t.effectifMaille === "etablissement"
      ? " (compté à l'établissement)"
      : "";
}

/** Les critères rendus, dans l'ordre d'impression. */
export const CRITERES_TYPOLOGIE = Object.keys(
  RENDU_CRITERE,
) as (keyof TypologieApplication)[];

/** Le régime auquel l'obligation s'applique, en une ligne lisible. */
export function texteTypologie(t: TypologieApplication): string {
  const bouts = CRITERES_TYPOLOGIE.map((k) => RENDU_CRITERE[k](t)).filter(
    (b): b is string => b !== null,
  );
  return bouts.length ? bouts.join(" · ") : "Tous régimes";
}

/**
 * Ce que le corpus a relevé pour une référence — par l'index canonique,
 * `indexArticlesParRef()`, jamais par une boucle locale.
 *
 * Un même article figure parfois dans deux corpus. La boucle que le script
 * portait jusqu'au 2026-10-13 gardait le DERNIER ; le reste du dépôt
 * (`scripts/export-relecture.ts`, la mesure de vérification) garde le premier
 * DÉPOUILLÉ. R. 4226-19, L. 4711-5 et R. 4121-4 imprimaient donc dans le
 * dossier un autre relevé que celui des autres lectures — pour R. 4121-4,
 * sans citation, quand l'index en a une. Correctif écrit le 2026-09-28
 * (47ccf91d), jamais intégré.
 */
const INDEX_ARTICLES = indexArticlesParRef();

export function releveDe(r: { article?: string }): ArticleDepouille | undefined {
  return r.article ? INDEX_ARTICLES.get(r.article)?.article : undefined;
}

/**
 * Comment l'article a été lu, en clair. Partagé avec
 * `scripts/export-relecture.ts` (colonne `lecture`), d'où il vient : une
 * seule table.
 */
export const LECTURE_LISIBLE: Record<SourceLecture, string> = {
  premiere_main: "première main",
  agent_verbatim: "agent (verbatim non recoupé)",
  api_legifrance: "API Légifrance (verbatim recomparé par script)",
  indirect: "indirect — ne peut pas fonder",
};

/** Le sort de l'article au corpus, en clair. Un statut neuf fait échouer `tsc`. */
export const STATUT_LISIBLE: Record<ArticleDepouille["statut"], string> = {
  retenu: "retenu",
  sans_objet: "sans objet",
  obligation_manquante: "obligation manquante",
  non_couvert: "non couvert",
  hors_perimetre: "hors périmètre",
  norme: "norme lue",
  non_depouille: "non dépouillé",
};

/**
 * La ligne de provenance imprimée sous une référence du dossier détaillé :
 * statut au corpus, mode de lecture, date de lecture — et la version lue au
 * corpus quand ce n'est pas celle que la référence dit avoir constatée.
 *
 * Ajoutée par 47ccf91d (2026-09-28, jamais intégré), refaite le 2026-10-13 sur
 * le format actuel : la ligne en gras au-dessus porte déjà la « version
 * constatée » de la référence ; la répéter quand le corpus dit la même chose
 * n'apprend rien au relecteur, l'écart entre les deux, lui, est à relire.
 *
 * Le silence est dit : un mode de lecture non noté s'imprime comme tel.
 */
export function texteProvenance(
  a: ArticleDepouille,
  r: { versionConstatee?: string },
): string {
  const bouts = [`corpus : ${STATUT_LISIBLE[a.statut]}`];
  bouts.push(
    a.lecture ? `lecture : ${LECTURE_LISIBLE[a.lecture]}` : "mode de lecture non noté",
  );
  if (a.luLe) bouts.push(`lu le ${a.luLe}`);
  if (a.versionEnVigueur && a.versionEnVigueur !== r.versionConstatee) {
    bouts.push(`version lue au corpus ${a.versionEnVigueur}`);
  }
  return bouts.join(" · ");
}
