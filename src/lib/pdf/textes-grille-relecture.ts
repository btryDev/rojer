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
import { surfacesDe, type Surface } from "@/lib/surfaces/obligations-sans-surface";
import { porteurDe } from "@/lib/referentiels/conformite";
import { libelleRythme } from "@/lib/referentiels/conformite/renvoi-aux-normes";
import type { Obligation } from "@/lib/referentiels/conformite/types";
import { releveDeLaPage } from "@/lib/quand-ca-arrive/lignes";

/**
 * Un bout de la ligne « Régime ». Deux genres, parce que `matchTypologie`
 * combine deux logiques et que la ligne doit les laisser lire :
 *   - `regime` — les régimes positifs (travail, ERP, IGH, habitation), en OU :
 *     un seul suffit. Ils s'impriment séparés par « ou ».
 *   - `et` — les critères positifs (seuils, faits déclarés), en ET avec les
 *     régimes. Chacun s'imprime précédé de « ; et ».
 *   - `hors` — les régimes exclus (« hors ERP »), en ET eux aussi, imprimés
 *     comme `et`. Ils sont distingués parce qu'ils ne retiennent RIEN : sans
 *     régime positif ni critère positif, `matchTypologie` n'a aucune raison à
 *     donner et écarte la ligne (garde-fou « raisons.length === 0 »).
 * Jusqu'au 2026-10-13 (revue de `lot/dossier-relecture-2`, C4), un seul « · »
 * servait aux deux : « Travail · ERP · IGH · Habitation » et « Travail ·
 * effectif d'au moins 50 » se lisaient pareil.
 */
type Bout = { genre: "regime" | "et" | "hors"; texte: string };
type RenduCritere = (t: TypologieApplication) => Bout | null;

const regime = (texte: string): Bout => ({ genre: "regime", texte });
const et = (texte: string): Bout => ({ genre: "et", texte });
const hors = (texte: string): Bout => ({ genre: "hors", texte });

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
  // ~~« (type non déclaré : à confirmer) »~~ [2026-10-13, seconde revue, C-b :
  // le cas existe dans `matchTypologie` (3 bis bis), pas en base — CHECK
  // `Etablissement_erp_type_categorie_requis`, migration 20260927180000. La
  // légende le dit une fois.]
  typesExclus: (e) => (e.typesExclus?.length ? `sauf type ${ou(e.typesExclus)}` : null),
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
    t.travail === true ? regime("Travail") : t.travail === false ? hors("hors Travail") : null,
  erp: (t) => {
    if (t.erp === true) return regime("ERP");
    if (t.erp === false) return hors("hors ERP");
    if (!t.erp) return null;
    const e = t.erp;
    const p = (Object.keys(RENDU_ERP) as (keyof ErpRestreint)[])
      .map((k) => RENDU_ERP[k](e))
      .filter((b): b is string => b !== null);
    return regime(["ERP", ...p].join(" "));
  },
  igh: (t) => {
    if (t.igh === true) return regime("IGH");
    if (t.igh === false) return hors("hors IGH");
    if (!t.igh) return null;
    // `evaluerIgh` : classe non déclarée → retenue « à confirmer ».
    return regime(`IGH de classe ${ou(t.igh.classes)} (classe non déclarée : à confirmer)`);
  },
  habitation: (t) => {
    if (t.habitation === true) return regime("Habitation");
    if (t.habitation === false) return hors("hors habitation");
    if (!t.habitation) return null;
    // `evaluerHabitation` : famille non déclarée → retenue « à confirmer ».
    return regime(
      `Habitation de famille ${ou(t.habitation.familles)} (famille non déclarée : à confirmer)`,
    );
  },
  // `evaluerLocauxSommeil`. `true` : hors des types où le sommeil est
  // plausible, jamais retenue, même sur un « oui » ; dans ces types, le
  // silence retient « à confirmer ». `false` : un allègement, il exige le
  // « non » déclaré, et ne lit pas le type. ~~« ou de type non déclaré »~~
  // [2026-10-13, seconde revue, C-b : cas interdit en base, dit une fois dans
  // la légende.]
  locauxSommeilPublic: (t) =>
    t.locauxSommeilPublic === true
      ? et(
          `locaux à sommeil pour le public, seulement en ERP de type ${ou(TYPES_ERP_A_SOMMEIL_PLAUSIBLE)} — tout autre type : jamais, même sur un « oui » (${SANS_REPONSE})`,
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
    // La parenthèse sur les matières ne vaut que SOUS le seuil : au-dessus,
    // la ligne est due, matières ou non (revue, R-b).
    return t.champR422734
      ? et(
          `${seuil} OU matières R. 4227-22 déclarées « oui » (sous le seuil, matières ${SANS_REPONSE} ; ${indetermine})`,
        )
      : et(`${seuil} (${indetermine})`);
  },
  champR422734: (t) =>
    t.champR422734 && t.personnesPresentesMin === undefined && !t.horsChampR422734
      ? et(`matières R. 4227-22 déclarées « oui » (${SANS_REPONSE})`)
      : null,
  // Le moteur ne retient la ligne que hors du champ ÉTABLI : seuil non
  // atteint ET matières déclarées « non ». ~~« une réponse manque : écartée »~~
  // [2026-10-13, seconde revue, C-a : faux pour un établissement de travail
  // seul, dont l'effectif EST le total — sans nombre déclaré et matières
  // « non », la ligne y est retenue. Ce qui l'écarte : les matières sans
  // réponse, ou un ERP sans nombre déclaré (`evaluerPersonnesPresentes`,
  // « indetermine »).]
  horsChampR422734: (t) => {
    if (!t.horsChampR422734) return null;
    if (t.personnesPresentesMin === undefined) {
      return et("hors champ de R. 4227-34 sans seuil écrit : jamais retenue");
    }
    return et(
      `hors champ de R. 4227-34, établi : moins de ${t.personnesPresentesMin} personnes habituellement présentes ET matières R. 4227-22 déclarées « non » (matières sans réponse, ou ERP sans nombre de personnes déclaré : écartée, la consigne est retenue)`,
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
  "Régime visé : « ou » sépare les régimes, dont un seul suffit (Travail ou ERP) ; « ; et » ajoute une condition qui doit être remplie en plus. La catégorie, le type, la classe ou la famille écrits après un régime restreignent EN PLUS : un établissement de ce régime qui n'y répond pas est écarté, même s'il relève aussi d'un autre régime de la ligne. Le type et la catégorie d'ERP sont toujours renseignés (exigés en base). « À confirmer » : la ligne est retenue tant que la fiche ne répond pas à la question dont elle dépend.";

/**
 * Ce que la ligne dit quand rien ne peut la retenir : sans régime positif ni
 * critère positif, `matchTypologie` n'a aucune raison et écarte (garde-fou
 * « raisons.length === 0 »). « Tous régimes » disait l'inverse jusqu'au
 * 2026-10-13 (seconde revue, C-d). Aucune obligation du référentiel n'est
 * dans ce cas ; un test le tient.
 */
export const JAMAIS_RETENUE = "aucun régime ni critère positif — jamais retenue";

/** Le régime auquel l'obligation s'applique, en une ligne lisible. */
export function texteTypologie(t: TypologieApplication): string {
  const bouts = CRITERES_TYPOLOGIE.map((k) => RENDU_CRITERE[k](t)).filter(
    (b): b is Bout => b !== null,
  );
  const regimes = bouts.filter((b) => b.genre === "regime").map((b) => b.texte);
  const ets = bouts.filter((b) => b.genre !== "regime").map((b) => b.texte);
  const positifs = bouts.filter((b) => b.genre !== "hors").length;
  if (positifs === 0) return ets.length ? `${ets.join(" ; et ")} — ${JAMAIS_RETENUE}` : JAMAIS_RETENUE;
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
  // Ni un « ; » ni un « : » en début de ligne (2026-10-13, seconde revue,
  // R-c) : la ligne « Régime » en compte plusieurs par entrée.
  [/ ([;:])/g, "\u00a0$1"],
];

export function pourHelvetica(s: string): string {
  return SUBSTITUTIONS.reduce((acc, [re, rep]) => acc.replace(re, rep), s);
}

/**
 * Où le dirigeant voit une obligation — 2026-10-13, demande de la propriétaire.
 * Lu dans `surfacesDe` (src/lib/surfaces), qui appelle les règles mêmes du
 * moteur : jamais redit ici. La table est exhaustive au compilateur — une
 * surface neuve sans libellé ne compile pas.
 */
export const LIBELLE_SURFACE: Record<Surface, string> = {
  calendrier: "Calendrier",
  etats_permanents: "Ce qui doit être en place",
  faits: "Quand ça arrive",
  niveau_audit: "Ce que Rojer ne couvre pas (niveau audit)",
  fiche_salarie: "Fiche salarié",
};

export function texteOuVisible(o: Obligation): string {
  const surfaces = surfacesDe(o);
  // `faits` compte une obligation événementielle de TOUT porteur ; la page
  // « Quand ça arrive » ne retient que celles de l'établissement
  // (`releveDeLaPage`, appelée, jamais redite). Une événementielle d'appareil
  // ou de salarié se lit sur sa fiche, nommée plus bas — revue du 2026-10-13,
  // A1 : quatre lignes annonçaient une page qui ne les montre pas.
  const libelles = surfaces
    .filter((s) => s !== "faits" || releveDeLaPage(o))
    .map((s) => LIBELLE_SURFACE[s]);
  // Une obligation portée par un appareil se lit aussi sur sa fiche — sauf au
  // niveau audit, où le moteur ne la rend jamais applicable.
  if (porteurDe(o) === "equipement" && !surfaces.includes("niveau_audit")) {
    libelles.push("fiche de l'équipement");
  }
  // Un titre porté par un salarié se déclare et se lit sur Équipe, qu'il ait
  // ou non une surface datée (les titres « sous condition » n'en ont pas :
  // le produit ne sait pas qui y est soumis — ADR-043 (b)).
  if (porteurDe(o) === "salarie" && !surfaces.includes("niveau_audit")) {
    libelles.push("Équipe (titres déclarés par salarié)");
  }
  return libelles.join(" · ");
}

/**
 * Où se suit, personne par personne, ce qu'une ligne d'équipement ou
 * d'établissement suppose (2026-10-15, remarque du préventeur, grille du
 * 13/10 p. 8) : la ligne « Habilitation électrique du personnel » s'imprimait
 * « sans rythme écrit », et rien ne disait que les 3 ans de la NF C 18-510 se
 * suivent sur le titre de chaque personne, vingt pages plus loin.
 *
 * Lu dans `transmet` (`vers: "salarie_designe"`), jamais dans une liste : le
 * lien est déclaré au référentiel, la grille l'imprime. Un titre qui en
 * appelle un autre (ADR-043) n'est pas concerné — sa ligne est déjà dans la
 * partie des salariés.
 */
export function suiviParPersonne(
  o: Obligation,
  catalogue: readonly Obligation[],
): string[] {
  if (porteurDe(o) === "salarie") return [];
  const ids = new Set<string>();
  for (const tr of o.transmet ?? []) {
    if (tr.vers === "salarie_designe" && tr.titre) ids.add(tr.titre);
  }
  return [...ids].map((id) => {
    const titre = catalogue.find((c) => c.id === id);
    if (!titre) throw new Error(`${o.id} transmet vers un titre inconnu : ${id}`);
    return `Suivi par personne : « ${titre.libelle} » — ${libelleRythme(titre)}`;
  });
}

/**
 * La légende des écrans, pour un lecteur qui ne connaît pas l'application
 * (2026-10-13, demande de la propriétaire). Exhaustive au compilateur sur les
 * surfaces ; les deux entrées « porteur » suivent `texteOuVisible`.
 */
export const LEGENDE_SURFACE: Record<Surface, string> = {
  calendrier:
    "les échéances datées (vérifications, contrôles), toutes listées ; les retards et ce qui arrive dans les 30 jours y sont signalés.",
  etats_permanents:
    "ce qui doit exister en permanence, sans date (affichages, consignes, documents à détenir), que le dirigeant déclare « en place » ; et ce qui revient sans rythme écrit, qu'il déclare « fait le … ».",
  faits: "ce qui se déclenche à un événement pour l'établissement (embauche, accident du travail, épisode de chaleur intense, aménagement important).",
  fiche_salarie:
    "les titres et visites qui manquent à une personne : dus à l'entrée, datés depuis son entrée, ou appelés par un titre qu'elle détient, avec leur délai.",
  niveau_audit: "les obligations nommées et sourcées, mais non suivies au quotidien.",
};

export const LEGENDE_PORTEURS: ReadonlyArray<readonly [string, string]> = [
  ["fiche de l'équipement", "ce qui s'applique à un appareil déclaré."],
  ["Équipe (titres déclarés par salarié)", "les titres que le dirigeant déclare pour chaque salarié."],
];
