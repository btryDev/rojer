// L'export de relecture : une ligne par couple obligation × référence.
//
// Le dossier de relecture PDF n'imprime qu'une référence par obligation — celle
// qui la fonde — et replie les autres dans un « + 1 réf. ». Or c'est exactement
// là que se logent les défauts qu'on cherche : le Code du travail renvoie
// presque toujours la périodicité à un arrêté, et une obligation qui cite
// l'article du code sans l'arrêté attribue un chiffre à un texte qui ne le
// porte pas. Un relecteur ne peut pas voir ça sur le PDF, puisque l'arrêté est
// précisément la référence masquée.
//
// Ce script déplie. Chaque référence devient une ligne, rapprochée du corpus
// par sa clé canonique `article`, avec le verbatim relevé, la date de version
// lue et la façon dont elle l'a été. Les contrôles mécaniques sont en dernière
// colonne : ce sont des constats, pas des verdicts — « aucune référence de
// cette obligation ne porte de périodicité » se vérifie sans lire le texte,
// « la périodicité est fausse » non.
//
//   pnpm relecture           → le résumé, et ce que l'export ne couvre pas
//   pnpm relecture --csv     → l'export complet, une ligne par référence
//   pnpm relecture --md      → les N premières lignes en tableau lisible
//   pnpm relecture --md --limite 12 --domaine electricite
//   pnpm relecture --alertes → les lignes qui portent au moins un constat
//   pnpm relecture --json    → l'export brut, pour un autre outil
//
// Aucune écriture : le script rend compte. Corriger une référence suppose
// d'avoir lu le texte, ce qu'un script ne sait pas faire.

import {
  obligationsConformite,
  REFERENTIEL_VERSION,
} from "../src/lib/referentiels/conformite";
import type {
  ConditionApplication,
  Obligation,
  ReferenceLegale,
  Transmission,
} from "../src/lib/referentiels/conformite/types";
import {
  articlesNonCouverts,
  couvertureParCorpus,
  indexArticlesParRef,
  obligationsManquantes,
} from "../src/lib/referentiels/corpus";
import type {
  ArticleDepouille,
  SourceLecture,
} from "../src/lib/referentiels/corpus/types";
import type { TypologieApplication } from "../src/lib/referentiels/types-communs";
import { mentionRythmeRetenu } from "../src/lib/referentiels/conformite/mention-rythme";
import {
  periodiciteEffective,
  referencesCitees,
} from "../src/lib/referentiels/conformite/rythme-retenu";

// -----------------------------------------------------------------------------
// Index du corpus, par clé canonique
// -----------------------------------------------------------------------------

type EntreeCorpus = { corpusId: string; article: ArticleDepouille };

// La règle de départage — un même article peut figurer dans deux corpus, et le
// premier dépouillé gagne — vit désormais dans `indexArticlesParRef()`, parce
// que la mesure de vérification en avait besoin à l'identique.
const PAR_ARTICLE: Map<string, EntreeCorpus> = indexArticlesParRef();

// -----------------------------------------------------------------------------
// Rendu déclaratif des champs composés
// -----------------------------------------------------------------------------

function rendreTypologies(t: TypologieApplication): string {
  const bouts: string[] = [];
  if (t.travail) bouts.push("tout employeur");
  if (t.erp === true) bouts.push("ERP");
  else if (t.erp && typeof t.erp === "object") {
    const p: string[] = [];
    if (t.erp.categories?.length) p.push(`cat. ${t.erp.categories.join("/")}`);
    if (t.erp.types?.length) p.push(`type ${t.erp.types.join("/")}`);
    bouts.push(`ERP ${p.join(" ")}`.trim());
  }
  if (t.igh === true) bouts.push("IGH");
  else if (t.igh && typeof t.igh === "object") {
    bouts.push(`IGH ${t.igh.classes.join("/")}`);
  }
  if (t.habitation) bouts.push("habitation");
  return bouts.join(" · ") || "—";
}

function rendreCondition(c: ConditionApplication): string {
  switch (c.type) {
    case "equipement_propriete_numerique":
      return `${c.categorie}.${c.propriete} ${c.operateur} ${c.valeur}`;
    case "equipement_propriete_booleenne":
      return `${c.categorie}.${c.propriete} = ${c.valeur} (seulement si)`;
    case "equipement_propriete_non_infirmee":
      return `${c.categorie}.${c.propriete} ≠ false (sauf si)`;
    case "equipement_propriete_infirmee":
      return `${c.categorie}.${c.propriete} ≠ true (sauf si)`;
    case "equipement_propriete_enum_egale":
      return `${c.categorie}.${c.propriete} = « ${c.valeur} » (seulement si)`;
    case "equipement_propriete_enum_differente":
      return `${c.categorie}.${c.propriete} ≠ « ${c.valeur} » (sauf si)`;
  }
}

const LECTURE_LISIBLE: Record<SourceLecture, string> = {
  premiere_main: "première main",
  agent_verbatim: "agent (verbatim non recoupé)",
  api_legifrance: "API Légifrance (verbatim recomparé par script)",
  indirect: "indirect — ne peut pas fonder",
};

// -----------------------------------------------------------------------------
// Contrôles mécaniques
// -----------------------------------------------------------------------------

const PORTE_UN_CHIFFRE = new Set(["ARRETE", "DECRET", "REGLEMENT_UE"]);
const SANS_RECURRENCE = new Set(["mise_en_service_uniquement", "autre"]);

/**
 * Le contrôle qui motive l'export. Une périodicité récurrente doit être portée
 * par un texte qui l'écrit. Quand toutes les références d'une obligation sont
 * des articles de code — qui renvoient la modalité à un arrêté — le chiffre du
 * calendrier ne repose sur aucun texte cité.
 *
 * Constat, pas verdict : le chiffre peut être exact et l'arrêté simplement
 * absent de la citation. C'est justement ce qu'il faut aller vérifier.
 */
function periodiciteSansTexteporteur(o: Obligation): boolean {
  // Le rythme EFFECTIF (ADR-039). Un rythme retenu a son origine déclarée :
  // une norme lue (source NORME), ou le défaut annuel avec le mot du texte.
  // Ce n'est pas un chiffre sans texte porteur — c'est un chiffre qui dit
  // d'où il vient, et la colonne `rythmeRetenu` le montre au relecteur.
  if (SANS_RECURRENCE.has(periodiciteEffective(o))) return false;
  if (o.rythmeRetenu) return false;
  return !o.referencesLegales.some((r) => PORTE_UN_CHIFFRE.has(r.source));
}

function alertes(
  o: Obligation,
  r: ReferenceLegale,
  rang: number,
  e: EntreeCorpus | undefined,
): string[] {
  const a: string[] = [];

  if (rang === 0 && periodiciteSansTexteporteur(o)) {
    a.push("PERIODICITE_SANS_TEXTE_PORTEUR");
  }
  if (!r.article) {
    a.push("NON_RATTACHE"); // pas de clé : rien à rapprocher d'un corpus
  } else if (!e) {
    a.push("HORS_CORPUS"); // cité, mais aucun corpus ne connaît cet article
  } else {
    const art = e.article;
    if (art.statut === "non_depouille") a.push("NON_DEPOUILLE");
    if (art.lecture === "indirect") a.push("LECTURE_INDIRECTE");
    if (art.statut === "retenu" && !art.obligations.includes(o.id)) {
      a.push("CORPUS_NE_RENVOIE_PAS"); // l'article ne se sait pas fondateur de celle-ci
    }
    if (
      rang === 0 &&
      art.statut !== "retenu" &&
      art.statut !== "norme" &&
      art.statut !== "non_depouille"
    ) {
      // Le corpus classe l'article autrement que « retenu » alors qu'une
      // obligation le donne pour fondement. PE 4 est le cas d'école : son § 2
      // fonde la vérification triennale des ERP de 5ᵉ catégorie ET crée une
      // obligation qu'on ne porte pas. Le statut est un choix unique, il ne
      // peut pas dire les deux — et c'est le « retenu » qui disparaît.
      a.push(`FONDEMENT_NON_RETENU:${art.statut}`);
    }
    if (art.statut === "retenu" && !art.citationCle) {
      a.push("SANS_VERBATIM"); // retenu, mais rien à relire
    }
    if (
      r.versionConstatee &&
      art.versionEnVigueur &&
      r.versionConstatee !== art.versionEnVigueur
    ) {
      a.push("VERSION_DIVERGENTE");
    }
    if (art.versionFuture) a.push(`VERSION_FUTURE:${art.versionFuture}`);
  }
  if (
    rang === 0 &&
    o.transmet.some((t) => t.vers === "salarie_designe" && t.titre === null)
  ) {
    // L'obligation dit qu'une personne nommée est supposée, et le catalogue ne
    // porte pas encore le titre correspondant. Constat mécanique, pas verdict :
    // il se vérifie sans lire le texte, ce qui est le critère de cette colonne.
    a.push("TITRE_HORS_CATALOGUE");
  }
  if (!r.versionConstatee) a.push("VERSION_JAMAIS_CONSTATEE");
  if (!r.url && !e?.article.url) a.push("SANS_URL");

  return a;
}

/**
 * Une transmission, rendue pour un relecteur (ADR-024).
 *
 * C'est LA colonne que ce script existe désormais pour porter. Un relecteur a
 * l'article sous les yeux sur Légifrance ; le schéma « ceci se transmet là »
 * doit être devant lui à ce moment-là, pas redécouvert trois mois plus tard en
 * revue. Les treize implications recensées l'ont toutes été de cette façon.
 *
 * Le motif n'est pas repris ici — il est long, et cette colonne se lit en
 * diagonale. Elle dit VERS QUOI ça part ; le motif est dans le référentiel, à
 * côté de la déclaration, où il se relit avec elle.
 */
function rendreTransmission(t: Transmission): string {
  switch (t.vers) {
    case "salarie_designe":
      return t.titre === null
        ? "salarié désigné (aucun titre au catalogue)"
        : `salarié désigné → ${t.titre}`;
    case "modele_absent":
      return `modèle absent → ${t.modele}`;
    case "attribut_absent":
      return `attribut absent → ${t.sujet}.${t.attribut}`;
  }
}

// -----------------------------------------------------------------------------
// La ligne
// -----------------------------------------------------------------------------

type Ligne = {
  obligation: string;
  domaine: string;
  libelle: string;
  periodicite: string;
  /** ADR-039 : le rythme retenu et sa mention, vide quand le texte le chiffre. */
  rythmeRetenu: string;
  realisateurs: string;
  criticite: number;
  champ: string;
  conditions: string;
  transmet: string;
  rang: string;
  source: string;
  reference: string;
  article: string;
  url: string;
  versionConstatee: string;
  corpus: string;
  statutCorpus: string;
  lecture: string;
  luLe: string;
  versionEnVigueur: string;
  prescrit: string;
  verbatim: string;
  note: string;
  alertes: string;
};

function lignes(): Ligne[] {
  const out: Ligne[] = [];
  for (const o of obligationsConformite) {
    const mention = mentionRythmeRetenu(o);
    const nbTexte = o.referencesLegales.length;
    // La norme d'un rythme retenu sort en ligne à elle, rang « rythme retenu » :
    // le relecteur doit la voir comme il voit un arrêté qui porte un chiffre.
    referencesCitees(o).forEach((r, i) => {
      const e = r.article ? PAR_ARTICLE.get(r.article) : undefined;
      const art = e?.article;
      out.push({
        obligation: o.id,
        domaine: o.domaine,
        libelle: o.libelle,
        periodicite: o.periodicite,
        rythmeRetenu: mention
          ? `${periodiciteEffective(o)} — ${mention.long}`
          : "",
        realisateurs: o.realisateurs.join(" ou "),
        criticite: o.criticite,
        champ: rendreTypologies(o.typologies),
        conditions: (o.conditions ?? []).map(rendreCondition).join(" ET "),
        transmet: o.transmet.map(rendreTransmission).join(" ; "),
        rang:
          i >= nbTexte ? "rythme retenu" : i === 0 ? "fondement" : `contexte ${i}`,
        source: r.source,
        reference: r.reference,
        article: r.article ?? "",
        url: r.url ?? art?.url ?? "",
        versionConstatee: r.versionConstatee ?? "",
        corpus: e?.corpusId ?? "",
        statutCorpus: art?.statut ?? "",
        lecture: art?.lecture ? LECTURE_LISIBLE[art.lecture] : "",
        luLe: art?.luLe ?? "",
        versionEnVigueur: art?.versionEnVigueur ?? "",
        prescrit: art?.prescrit ?? "",
        verbatim: art?.citationCle ?? "",
        note: r.note ?? "",
        alertes: alertes(o, r, i, e).join(" "),
      });
    });
  }
  return out;
}

// -----------------------------------------------------------------------------
// Sorties
// -----------------------------------------------------------------------------

const COLONNES: (keyof Ligne)[] = [
  "obligation", "domaine", "libelle", "periodicite", "rythmeRetenu", "realisateurs",
  "criticite", "champ", "conditions", "transmet", "rang", "source", "reference",
  "article", "url", "versionConstatee", "corpus", "statutCorpus", "lecture",
  "luLe", "versionEnVigueur", "prescrit", "verbatim", "note", "alertes",
];

function csv(rows: Ligne[]): string {
  const echap = (v: string | number) => {
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return [
    COLONNES.join(","),
    ...rows.map((l) => COLONNES.map((c) => echap(l[c])).join(",")),
  ].join("\n");
}

function md(rows: Ligne[]): string {
  const cols: (keyof Ligne)[] = [
    "obligation", "rang", "reference", "article", "periodicite", "rythmeRetenu",
    "statutCorpus", "lecture", "transmet", "verbatim", "alertes",
  ];
  const cell = (v: string | number) =>
    String(v).replaceAll("|", "\\|").replaceAll("\n", " ") || "—";
  return [
    `| ${cols.join(" | ")} |`,
    `| ${cols.map(() => "---").join(" | ")} |`,
    ...rows.map((l) => `| ${cols.map((c) => cell(l[c])).join(" | ")} |`),
  ].join("\n");
}

function resume(rows: Ligne[]): string {
  const compte = (t: string) =>
    rows.filter((l) => l.alertes.split(" ").some((a) => a.startsWith(t))).length;
  const obligationsTouchees = (t: string) =>
    new Set(
      rows
        .filter((l) => l.alertes.split(" ").some((a) => a.startsWith(t)))
        .map((l) => l.obligation),
    ).size;

  const nbObl = obligationsConformite.length;
  const fondements = rows.filter((l) => l.rang === "fondement").length;
  const contextes = rows.length - fondements;

  const l: string[] = [];
  l.push(`Référentiel ${REFERENTIEL_VERSION}`);
  l.push("");
  l.push(`${nbObl} obligations · ${rows.length} lignes de référence`);
  l.push(
    `  ${fondements} fondements · ${contextes} références de contexte — ` +
      `celles que le PDF replie dans un « + N réf. »`,
  );
  l.push("");
  l.push("Constats mécaniques (une obligation peut en porter plusieurs) :");
  for (const [code, quoi] of [
    ["PERIODICITE_SANS_TEXTE_PORTEUR", "périodicité récurrente, aucun arrêté ni décret cité"],
    ["NON_RATTACHE", "référence sans clé canonique — non rapprochable d'un corpus"],
    ["HORS_CORPUS", "article cité qu'aucun corpus ne connaît"],
    ["NON_DEPOUILLE", "article au corpus, jamais lu"],
    ["LECTURE_INDIRECTE", "lu ailleurs qu'à la source — ne peut pas fonder"],
    ["CORPUS_NE_RENVOIE_PAS", "l'article retenu ne cite pas cette obligation en retour"],
    ["FONDEMENT_NON_RETENU", "le corpus ne classe pas « retenu » un article donné pour fondement"],
    ["SANS_VERBATIM", "article retenu sans citation relevée — rien à relire"],
    ["VERSION_DIVERGENTE", "version constatée ≠ version lue au corpus"],
    ["VERSION_FUTURE", "version future programmée"],
    ["TITRE_HORS_CATALOGUE", "l'obligation suppose une personne nommée, aucun titre au catalogue ne la porte"],
    ["VERSION_JAMAIS_CONSTATEE", "aucune date de version constatée"],
    ["SANS_URL", "aucun lien consultable"],
  ] as const) {
    const n = compte(code);
    if (n === 0) continue;
    l.push(
      `  ${String(n).padStart(4)} lignes · ${String(obligationsTouchees(code)).padStart(3)} obligations · ${code}`,
    );
    l.push(`       ${quoi}`);
  }
  l.push("");
  const avecTransmission = obligationsConformite.filter(
    (o) => o.transmet.length > 0,
  );
  l.push(
    `Transmissions déclarées : ${avecTransmission.length} obligations sur ${nbObl} (ADR-024)`,
  );
  for (const o of avecTransmission) {
    for (const t of o.transmet) {
      l.push(`  ${o.id}`);
      l.push(`       ${rendreTransmission(t)}`);
    }
  }
  l.push(
    `  Les ${nbObl - avecTransmission.length} autres déclarent n'impliquer rien ailleurs.`,
  );
  l.push(
    "  Un tableau vide est une réponse ; un champ absent n'en serait pas une,",
  );
  l.push("  et c'est pourquoi le champ est requis.");
  l.push("");
  l.push("Ce que cet export ne dit pas :");
  l.push("  — si une périodicité est exacte. Il dit seulement si un texte cité");
  l.push("    peut la porter.");
  l.push("  — si le champ d'application retenu est le bon. R. 4224-17 vise tout");
  l.push("    le bâti technique ; rien ici ne le compare à ce qu'on en a fait.");
  l.push("  — ce qui manque. Un article jamais cité n'a pas de ligne : c'est le");
  l.push("    bloc ci-dessous, tenu par le corpus, qui le porte.");
  l.push("  — si une transmission déclarée est complète. Il dit ce que quelqu'un");
  l.push("    a écrit en lisant le texte, pas ce que le texte implique vraiment.");
  l.push("");
  l.push(completude());
  return l.join("\n");
}


/**
 * Le volet que l'export par référence ne peut pas porter.
 *
 * Une ligne existe parce qu'une obligation cite un article. Un article que
 * personne ne cite n'a donc pas de ligne — et c'est précisément là que se
 * trouve ce qui manque. La complétude ne se lit pas dans l'export : elle se lit
 * au corpus, qui tient le registre inverse.
 */
function completude(): string {
  const couv = couvertureParCorpus();
  const somme = (f: (c: (typeof couv)[number]) => number) =>
    couv.reduce((n, c) => n + f(c), 0);

  const integraux = couv.filter((c) => c.etendue === "integral");
  const partiels = couv.filter((c) => c.etendue === "articles_cites");
  const manquantes = obligationsManquantes();
  const nonCouverts = articlesNonCouverts();
  const silences = nonCouverts.filter((a) => !a.declareA);

  const l: string[] = [];
  l.push("Complétude — ce que le corpus déclare avoir lu :");
  l.push(
    `  ${somme((c) => c.total)} articles au corpus · ${somme((c) => c.depouilles)} dépouillés · ` +
      `${somme((c) => c.nonDepouilles)} jamais lus`,
  );
  const s = (n: number) => (n > 1 ? "s" : "");
  const nbComplets = integraux.filter((c) => c.complet).length;
  l.push(
    `  ${integraux.length} corpus intégral${integraux.length > 1 ? "aux" : ""} ` +
      `(${nbComplets} complet${s(nbComplets)}) · ` +
      `${partiels.length} limité${s(partiels.length)} aux articles cités`,
  );
  l.push(
    "  Un corpus limité aux articles cités ne prouve rien sur le reste du texte :",
  );
  l.push("  il dit ce qu'on a lu de ce qu'on utilise, pas ce que le texte contient.");
  l.push("");
  l.push(
    `  ${manquantes.length} article${s(manquantes.length)} impose${manquantes.length > 1 ? "nt" : ""} ` +
      `une obligation que le référentiel ne porte pas`,
  );
  for (const m of manquantes.slice(0, 6)) {
    l.push(`       ${m.ref} — ${m.motif.split(".")[0]}.`);
  }
  if (manquantes.length > 6) l.push(`       … et ${manquantes.length - 6} autres`);
  l.push("");
  l.push(
    `  ${nonCouverts.length} article${s(nonCouverts.length)} écarté${s(nonCouverts.length)} ` +
      `par un choix explicite de ne pas les porter`,
  );
  l.push(
    `       dont ${silences.length} sans mention à l'utilisateur — un manque non déclaré`,
  );
  return l.join("\n");
}

// -----------------------------------------------------------------------------

const argv = process.argv.slice(2);
const opt = (n: string) => {
  const i = argv.indexOf(n);
  return i >= 0 ? argv[i + 1] : undefined;
};

let rows = lignes();

const domaine = opt("--domaine");
if (domaine) rows = rows.filter((l) => l.domaine === domaine);
if (argv.includes("--alertes")) rows = rows.filter((l) => l.alertes !== "");

const limite = opt("--limite");
if (limite) rows = rows.slice(0, Number(limite));

if (argv.includes("--json")) {
  console.log(
    JSON.stringify(
      { version: REFERENTIEL_VERSION, lignes: rows, completude: completude() },
      null,
      2,
    ),
  );
} else if (argv.includes("--csv")) console.log(csv(rows));
else if (argv.includes("--md")) console.log(md(rows));
else console.log(resume(rows));
