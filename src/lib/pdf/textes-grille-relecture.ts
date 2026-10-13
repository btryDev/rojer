// Textes de la grille et du dossier de relecture
// (`scripts/generer-grille-equipements.tsx`), sortis du script pour être
// testés : le script rend un PDF dès qu'on l'importe.

import { LIBELLE_ACTIVITE } from "@/lib/matching/engine";
import { LABEL_CATEGORIE_ERP } from "@/lib/etablissements/labels";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import type {
  ArticleDepouille,
  SourceLecture,
} from "@/lib/referentiels/corpus/types";
import {
  TYPES_ERP_A_SOMMEIL_PLAUSIBLE,
  type TypologieApplication,
} from "@/lib/referentiels/types-communs";

/**
 * Un bout de la ligne « Régime ». Deux genres, parce que `matchTypologie`
 * combine deux logiques et que la ligne doit les laisser lire :
 *   - `regime` — les régimes positifs (travail, ERP, IGH, habitation), en OU :
 *     un seul suffit. Ils s'impriment séparés par « ou ».
 *   - `et` — tout le reste (régimes exclus, seuils, faits déclarés), en ET avec
 *     les régimes. Chacun s'imprime précédé de « ; et ».
 * Jusqu'au 2026-10-13 (revue de `lot/dossier-relecture-2`, C4), un seul « · »
 * servait aux deux : « Travail · ERP · IGH · Habitation » et « Travail ·
 * effectif d'au moins 50 » se lisaient pareil.
 */
type Bout = { genre: "regime" | "et"; texte: string };
type RenduCritere = (t: TypologieApplication) => Bout | null;

const regime = (texte: string): Bout => ({ genre: "regime", texte });
const et = (texte: string): Bout => ({ genre: "et", texte });

/** « a », « a ou b », « a, b ou c ». */
function ou(l: readonly string[]): string {
  return l.length <= 1 ? l.join("") : `${l.slice(0, -1).join(", ")} ou ${l[l.length - 1]}`;
}

const SANS_REPONSE = "sans réponse : à confirmer";

type ErpRestreint = Exclude<TypologieApplication["erp"], boolean | undefined>;

/**
 * Les restrictions d'un régime ERP, une par sous-clé — même garde du
 * compilateur que la table des critères (revue, R3).
 */
const RENDU_ERP: { [K in keyof Required<ErpRestreint>]: (e: ErpRestreint) => string | null } = {
  // « 5ᵉ catégorie », les mots du moteur (`LIBELLE_CATEGORIE_ERP`,
  // `personnes-presentes.ts`) et de la fiche, pas « N5 ». Lus dans le libellé
  // de la fiche, sans sa parenthèse : exporter celui du moteur déplaçait le
  // sceau du calendrier pour un affichage.
  categories: (e) =>
    e.categories?.length
      ? `de ${ou(e.categories.map((c) => LABEL_CATEGORIE_ERP[c].split(" (")[0].replace(/ catégorie$/, "")))} catégorie`
      : null,
  types: (e) => (e.types?.length ? `de type ${ou(e.types)}` : null),
  // Ne mord que sur un type connu ; sans type déclaré, la ligne est retenue
  // et le dit (`matchTypologie`, 3 bis bis).
  typesExclus: (e) =>
    e.typesExclus?.length
      ? `sauf type ${ou(e.typesExclus)} (type non déclaré : à confirmer)`
      : null,
};

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
 * CHAQUE PHRASE DIT CE QUE LE MOTEUR FAIT, silence compris — `matchTypologie`
 * et ses évaluateurs (`engine.ts`), relus critère par critère le 2026-10-13
 * (revue, B1 et C1 à C3). Les tests tiennent le sens de chacune.
 *
 * L'ordre des clés est l'ordre d'impression.
 */
const RENDU_CRITERE: { [K in keyof Required<TypologieApplication>]: RenduCritere } = {
  travail: (t) =>
    t.travail === true ? regime("Travail") : t.travail === false ? et("hors Travail") : null,
  erp: (t) => {
    if (t.erp === true) return regime("ERP");
    if (t.erp === false) return et("hors ERP");
    if (!t.erp) return null;
    const e = t.erp;
    const p = (Object.keys(RENDU_ERP) as (keyof ErpRestreint)[])
      .map((k) => RENDU_ERP[k](e))
      .filter((b): b is string => b !== null);
    return regime(["ERP", ...p].join(" "));
  },
  igh: (t) => {
    if (t.igh === true) return regime("IGH");
    if (t.igh === false) return et("hors IGH");
    if (!t.igh) return null;
    // `evaluerIgh` : classe non déclarée → retenue « à confirmer ».
    return regime(`IGH de classe ${ou(t.igh.classes)} (classe non déclarée : à confirmer)`);
  },
  habitation: (t) => {
    if (t.habitation === true) return regime("Habitation");
    if (t.habitation === false) return et("hors habitation");
    if (!t.habitation) return null;
    // `evaluerHabitation` : famille non déclarée → retenue « à confirmer ».
    return regime(
      `Habitation de famille ${ou(t.habitation.familles)} (famille non déclarée : à confirmer)`,
    );
  },
  // `evaluerLocauxSommeil`. `true` : hors des types où le sommeil est
  // plausible, jamais retenue, même sur un « oui » ; dans ces types, ou sans
  // type déclaré, le silence retient « à confirmer ». `false` : un allègement,
  // il exige le « non » déclaré, et ne lit pas le type.
  locauxSommeilPublic: (t) =>
    t.locauxSommeilPublic === true
      ? et(
          `locaux à sommeil pour le public, seulement en ERP de type ${ou(TYPES_ERP_A_SOMMEIL_PLAUSIBLE)} ou de type non déclaré — tout autre type : jamais, même sur un « oui » (${SANS_REPONSE})`,
        )
      : t.locauxSommeilPublic === false
        ? et("sans locaux à sommeil pour le public, « non » déclaré (sans réponse : écartée)")
        : null,
  // `evaluerActivite` : seul un « non » déclaré écarte.
  activite: (t) =>
    t.activite
      ? et(`${LIBELLE_ACTIVITE[t.activite]} (« non » : écartée ; ${SANS_REPONSE})`)
      : null,
  ssiCategorieAouB: (t) =>
    t.ssiCategorieAouB
      ? et(`${LIBELLE_ACTIVITE.ssiCategorieAouB} (« non » : écartée ; ${SANS_REPONSE})`)
      : null,
  // `evaluerEffectif` : à l'entreprise, un seuil BAS atteint par le site
  // seul est retenu par prudence ; un plafond se lit sans prudence.
  effectifMin: (t) => {
    if (t.effectifMin === undefined) return null;
    if (t.effectifMaille === "entreprise") {
      return et(
        `effectif de l'entreprise d'au moins ${t.effectifMin} (entreprise sous le seuil mais site au-dessus : à confirmer)`,
      );
    }
    return et(`effectif ${effectifDe(t)}d'au moins ${t.effectifMin}`);
  },
  effectifMax: (t) =>
    t.effectifMax !== undefined
      ? et(`effectif ${effectifDe(t)}d'au plus ${t.effectifMax}`)
      : null,
  // Rendue avec le seuil qu'elle qualifie ; seule, elle ne dit rien.
  effectifMaille: () => null,
  // Champ de R. 4227-34 (`matchTypologie`, 3 bis). Le seuil et la branche
  // matières forment UNE condition, disjonctive : elle s'imprime d'un tenant.
  // Le complément (`horsChampR422734`) lit le même seuil dans l'autre sens.
  personnesPresentesMin: (t) => {
    if (t.personnesPresentesMin === undefined || t.horsChampR422734) return null;
    const seuil = `au moins ${t.personnesPresentesMin} personnes habituellement présentes`;
    const indetermine =
      "ERP sans nombre de personnes déclaré, que sa catégorie et son effectif ne placent pas au-dessus : à confirmer";
    return t.champR422734
      ? et(
          `${seuil} OU matières R. 4227-22 déclarées « oui » (matières ${SANS_REPONSE} ; ${indetermine})`,
        )
      : et(`${seuil} (${indetermine})`);
  },
  champR422734: (t) =>
    t.champR422734 && t.personnesPresentesMin === undefined && !t.horsChampR422734
      ? et(`matières R. 4227-22 déclarées « oui » (${SANS_REPONSE})`)
      : null,
  // Le moteur ne retient la ligne que hors du champ ÉTABLI : seuil non
  // atteint ET matières déclarées « non » ; sans l'une des deux réponses, elle
  // est écartée — c'est la consigne qui est retenue, « à confirmer ».
  horsChampR422734: (t) => {
    if (!t.horsChampR422734) return null;
    if (t.personnesPresentesMin === undefined) {
      return et("hors champ de R. 4227-34 sans seuil écrit : jamais retenue");
    }
    return et(
      `hors champ de R. 4227-34, établi : moins de ${t.personnesPresentesMin} personnes habituellement présentes ET matières R. 4227-22 déclarées « non » (une réponse manque : écartée, la consigne est retenue)`,
    );
  },
};

function effectifDe(t: TypologieApplication): string {
  return t.effectifMaille === "entreprise"
    ? "de l'entreprise "
    : t.effectifMaille === "etablissement"
      ? "de l'établissement "
      : "";
}

/** Les critères rendus, dans l'ordre d'impression. */
export const CRITERES_TYPOLOGIE = Object.keys(
  RENDU_CRITERE,
) as (keyof TypologieApplication)[];

/** La légende des séparateurs : une seule phrase, pour la grille et le dossier. */
export const LEGENDE_REGIME =
  "Régime visé : « ou » sépare les régimes, dont un seul suffit (Travail ou ERP) ; « ; et » ajoute une condition qui doit être remplie en plus. « À confirmer » : la ligne est retenue tant que la fiche ne répond pas à la question dont elle dépend.";

/** Le régime auquel l'obligation s'applique, en une ligne lisible. */
export function texteTypologie(t: TypologieApplication): string {
  const bouts = CRITERES_TYPOLOGIE.map((k) => RENDU_CRITERE[k](t)).filter(
    (b): b is Bout => b !== null,
  );
  const regimes = bouts.filter((b) => b.genre === "regime").map((b) => b.texte);
  const ets = bouts.filter((b) => b.genre === "et").map((b) => b.texte);
  if (regimes.length === 0 && ets.length === 0) return "Tous régimes";
  const tete = regimes.length ? [regimes.join(" ou ")] : [];
  return [...tete, ...ets].join(" ; et ");
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

/**
 * Helvetica — la police de base d'un PDF, celle qu'aucun lecteur n'a besoin
 * d'embarquer — ne porte ni exposants ni indices. Le référentiel écrit
 * « 1ʳᵉ à 4ᵉ catégorie » et « CO₂ » ; sans cette table, le PDF imprimait
 * « 1³l à 4l catégorie », c'est-à-dire un texte faux. On rend donc la forme
 * plate, qui se lit, plutôt qu'une forme savante qui ne s'imprime pas.
 */
const SUBSTITUTIONS: [RegExp, string][] = [
  // Helvetica, dans l'encodage WinAnsi que react-pdf utilise, ne porte ni `≥`
  // ni `≤` : ils sortaient remplacés par un glyphe faux, sans erreur. Le
  // document destiné à un relecteur affichait « e 51 personnes présentes ».
  // Les seuils s'écrivent donc en toutes lettres à la source ; ces deux lignes
  // sont le filet pour les occurrences qui échapperaient.
  [/≥\s*/g, "au moins "],
  [/≤\s*/g, "au plus "],
  [/ʳᵉ/g, "re"],
  [/ᵉʳ/g, "er"],
  [/ᵉ/g, "e"],
  [/₀/g, "0"],
  [/₁/g, "1"],
  [/₂/g, "2"],
  [/₃/g, "3"],
  [/₄/g, "4"],
  // Un guillemet ne se retrouve jamais seul en début ou en fin de ligne.
  [/« /g, "«\u00a0"],
  [/ »/g, "\u00a0»"],
];

export function pourHelvetica(s: string): string {
  return SUBSTITUTIONS.reduce((acc, [re, rep]) => acc.replace(re, rep), s);
}
