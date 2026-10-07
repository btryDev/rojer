#!/usr/bin/env tsx
//
// Grille de RELECTURE du référentiel : les 116 obligations, sans exception,
// rangées par ce qui les déclenche.
//
// Trois parties, une par porteur (ADR-022, ADR-023) :
//   1. par catégorie d'équipement — ce qu'un appareil déclaré fait naître ;
//   2. par domaine, pour les obligations portées par l'ÉTABLISSEMENT — elles
//      ne naissent d'aucun appareil, c'est le statut d'employeur, l'effectif
//      ou la typologie qui les déclenche ;
//   3. par domaine, pour les obligations portées par un SALARIÉ — l'employeur
//      les déclare, le produit ne les dérive jamais.
//
// La première partie existait seule jusqu'au 2026-09-01, et elle laissait
// **37 obligations sur 116 hors du document** — précisément les plus récentes,
// donc les moins éprouvées, donc celles qu'un relecteur a le plus de raisons
// de lire. Une grille organisée par appareil n'a aucune colonne où ranger une
// obligation qui ne naît d'aucun appareil : le silence était structurel, pas
// accidentel.
//
// Document de relecture, pas un document remis à un tiers : il décrit ce que
// l'outil calcule, à une version donnée du référentiel.
//
//   npx tsx scripts/generer-grille-equipements.tsx [chemin.pdf]

import { renderToFile } from "@react-pdf/renderer";
import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import path from "node:path";
import {
  obligationsConformite,
  REFERENTIEL_VERSION,
} from "@/lib/referentiels/conformite";
import {
  estPorteeParEquipement,
  estPorteeParSalarie,
  LIBELLE_NATURE,
  type ConditionApplication,
  type Obligation,
} from "@/lib/referentiels/conformite/types";
import { CORPUS } from "@/lib/referentiels/corpus";
import { mentionRythmeRetenu } from "@/lib/referentiels/conformite/mention-rythme";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import {
  CATEGORIES_EQUIPEMENT,
  PERIODICITE_EN_JOURS,
  type CategorieEquipement,
  type TypologieApplication,
} from "@/lib/referentiels/types-communs";
import {
  DESCRIPTION_CATEGORIE,
  LABEL_CATEGORIE_EQUIPEMENT,
} from "@/lib/equipements/labels";
import { LIBELLE_CARACTERISTIQUE } from "@/lib/equipements/caracteristiques";
import { LABEL_FAMILLE_ESP } from "@/lib/equipements/esp";
import type { FamilleEsp } from "@/lib/equipements/esp";
import {
  LABEL_TYPE_EXTINCTEUR,
  type TypeExtincteur,
} from "@/lib/equipements/extincteur";
import {
  CATEGORIES_AERATION,
  CATEGORIES_TRI_ETAT,
} from "@/lib/equipements/schema";
import {
  LABEL_DOMAINE,
  LABEL_PERIODICITE,
  LABEL_REALISATEUR,
} from "@/lib/calendrier/labels";
import { BOARD, stylesCommuns as s } from "@/lib/pdf/styles";

const LABEL_SOURCE: Record<string, string> = {
  CODE_TRAVAIL: "Code du travail",
  CCH: "CCH",
  CODE_ENVIRONNEMENT: "Code de l'environnement",
  ARRETE: "Arrêté",
  DECRET: "Décret",
  INRS: "INRS",
  REGLEMENT_UE: "Règlement (UE)",
  // ADR-039 : une norme se cite comme norme, jamais sous une source de droit.
  NORME: "Norme",
};

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
];

function t(s: string): string {
  return SUBSTITUTIONS.reduce((acc, [re, rep]) => acc.replace(re, rep), s);
}

/**
 * Le texte fondateur, cité comme on le citerait à l'écrit. La source n'est
 * préfixée que si la référence ne la porte pas déjà : « Arrêté, Arrêté du
 * 25 juin 1980 » se lisait comme une coquille, et c'en était une.
 */
function texteReference(r: { source: string; reference: string }): string {
  const libelle = LABEL_SOURCE[r.source] ?? r.source;
  const ref = t(r.reference);
  const premierMot = libelle.split(" ")[0].toLowerCase();
  return ref.toLowerCase().startsWith(premierMot) ? ref : `${libelle}, ${ref}`;
}

/** Le régime auquel l'obligation s'applique, en une ligne lisible. */
function texteTypologie(t: TypologieApplication): string {
  const bouts: string[] = [];
  if (t.travail === true) bouts.push("Travail");
  if (t.erp === true) bouts.push("ERP");
  else if (t.erp && typeof t.erp === "object") {
    const p: string[] = [];
    if (t.erp.categories?.length) p.push(`cat. ${t.erp.categories.join(", ")}`);
    if (t.erp.types?.length) p.push(`type ${t.erp.types.join(", ")}`);
    bouts.push(`ERP${p.length ? ` (${p.join(" ; ")})` : ""}`);
  } else if (t.erp === false) bouts.push("hors ERP");
  if (t.igh === true) bouts.push("IGH");
  else if (t.igh && typeof t.igh === "object")
    bouts.push(`IGH (${t.igh.classes.join(", ")})`);
  if (t.habitation === true) bouts.push("Habitation");
  if (t.effectifMin !== undefined) bouts.push(`effectif d'au moins ${t.effectifMin}`);
  if (t.effectifMax !== undefined) bouts.push(`effectif d'au plus ${t.effectifMax}`);
  if (t.personnesPresentesMin !== undefined)
    bouts.push(`au moins ${t.personnesPresentesMin} personnes présentes`);
  if (t.champR422734) bouts.push("ou matières R. 4227-22");
  return bouts.length ? bouts.join(" · ") : "Tous régimes";
}

/** La condition portée par une propriété de l'équipement, en clair. */
/**
 * Les deux cases à cocher du formulaire ne figurent pas dans
 * `LIBELLE_CARACTERISTIQUE`, qui ne nomme que les questions à trois états.
 * Sans elles, la colonne « Condition » imprimait `aGroupeElectrogene`.
 */
const LIBELLE_CASE: Record<string, string> = {
  aGroupeElectrogene: "Groupe électrogène de sécurité",
  estLocalPollutionSpecifique: "Local à pollution spécifique",
  nbVehiculesParkingCouvert: "Véhicules en parking couvert",
  // La question énumérée : sans elle, la colonne imprimait
  // `typeExtincteur : sauf « co2 »` (revue du 2026-10-07).
  typeExtincteur: "Type d'extincteur",
};

function texteCondition(c: ConditionApplication): string {
  const nom =
    LIBELLE_CARACTERISTIQUE[c.propriete as keyof typeof LIBELLE_CARACTERISTIQUE] ??
    LIBELLE_CASE[c.propriete] ??
    c.propriete;
  switch (c.type) {
    case "equipement_propriete_numerique":
      return `${nom} ${c.operateur} ${c.valeur}`;
    case "equipement_propriete_booleenne":
      return `${nom} = ${c.valeur ? "oui" : "non"}`;
    case "equipement_propriete_non_infirmee":
      return `${nom} : sauf réponse « non »`;
    case "equipement_propriete_infirmee":
      return `${nom} : sauf réponse « oui »`;
    case "equipement_propriete_enum_egale":
      return `${nom} = ${libelleValeurEnum(c.propriete, c.valeur)}`;
    case "equipement_propriete_enum_differente":
      return `${nom} : sauf ${libelleValeurEnum(c.propriete, c.valeur)}`;
  }
}

/**
 * Une valeur d'énumération s'imprime sous le libellé que le dirigeant a vu au
 * formulaire, pas sous sa clé technique : la grille est un document qu'on lui
 * remet.
 */
function libelleValeurEnum(propriete: string, valeur: string): string {
  if (propriete === "familleEsp" && valeur in LABEL_FAMILLE_ESP) {
    return `« ${LABEL_FAMILLE_ESP[valeur as FamilleEsp]} »`;
  }
  if (propriete === "typeExtincteur" && valeur in LABEL_TYPE_EXTINCTEUR) {
    return `« ${LABEL_TYPE_EXTINCTEUR[valeur as TypeExtincteur]} »`;
  }
  return `« ${valeur} »`;
}

function conditionsTexte(o: Obligation): string {
  if (!o.conditions?.length) return "—";
  return o.conditions.map(texteCondition).join(" ; ");
}

/** Les questions du formulaire qui bornent les obligations de la catégorie. */
function questionsCategorie(c: CategorieEquipement): string[] {
  const q: string[] = [];
  if (c === "INSTALLATION_ELECTRIQUE") q.push("Groupe électrogène de sécurité");
  if (CATEGORIES_AERATION.includes(c)) q.push("Local à pollution spécifique");
  // Le type borne la maintenance approfondie (NF S 61-919, tableau A.1).
  if (c === "EXTINCTEUR") q.push(LIBELLE_CASE.typeExtincteur);
  for (const { champ, categories } of CATEGORIES_TRI_ETAT) {
    if (categories.includes(c)) q.push(LIBELLE_CARACTERISTIQUE[champ]);
  }
  return q;
}

function obligationsDe(c: CategorieEquipement): Obligation[] {
  // Les obligations portées par l'établissement ne figurent pas dans la
  // grille par catégorie : elles ne se déclenchent sur aucun équipement
  // (ADR-022). La grille dit ce qu'un appareil déclenche, pas ce qui est dû.
  return obligationsConformite
    .filter((o) => estPorteeParEquipement(o) && o.categoriesEquipement.includes(c))
    .sort(
      (a, b) =>
        b.criticite - a.criticite ||
        (PERIODICITE_EN_JOURS[periodiciteEffective(a)] ?? 1e9) -
          (PERIODICITE_EN_JOURS[periodiciteEffective(b)] ?? 1e9),
    );
}

/**
 * Les obligations portées par l'établissement, groupées par domaine.
 *
 * Elles ne naissent d'aucun appareil : c'est le statut d'employeur, l'effectif
 * ou la typologie du bâtiment qui les déclenche. Le domaine est donc le seul
 * regroupement qui ait un sens ici — il n'y a pas d'objet à ranger dessous.
 */
function parDomaine(obligations: Obligation[]): Map<string, Obligation[]> {
  const m = new Map<string, Obligation[]>();
  for (const o of obligations) {
    const l = m.get(o.domaine) ?? [];
    l.push(o);
    m.set(o.domaine, l);
  }
  for (const [, l] of m) {
    l.sort(
      (a, b) =>
        b.criticite - a.criticite ||
        (PERIODICITE_EN_JOURS[periodiciteEffective(a)] ?? 1e9) -
          (PERIODICITE_EN_JOURS[periodiciteEffective(b)] ?? 1e9),
    );
  }
  return m;
}

/**
 * Ce que le corpus a relevé, par clé d'article.
 *
 * **Le verbatim ne vit pas sur l'obligation.** `ReferenceLegale` porte la
 * référence, l'URL et la version constatée ; c'est `ArticleDepouille`, dans le
 * corpus, qui porte le texte relevé — `prescrit` (ce que l'article impose, en
 * une phrase) et `citationCle` (l'extrait qui le prouve). Un dossier de
 * relecture qui n'irait pas les chercher demanderait au relecteur de croire
 * l'encodage sur parole.
 *
 * Toutes les références n'ont pas de correspondance : un article cité que
 * personne n'a dépouillé n'a rien à montrer, et l'absence est dite plutôt que
 * masquée.
 */
const RELEVE_PAR_ARTICLE = new Map<
  string,
  { prescrit?: string; citationCle?: string; version?: string; statut: string }
>();
for (const corpus of CORPUS) {
  for (const a of corpus.articles) {
    RELEVE_PAR_ARTICLE.set(a.ref, {
      prescrit: a.prescrit,
      citationCle: a.citationCle,
      version: a.versionEnVigueur,
      statut: a.statut,
    });
  }
}

const OBLIGATIONS_ETABLISSEMENT = obligationsConformite.filter(
  (o) => !estPorteeParEquipement(o) && !estPorteeParSalarie(o),
);
const OBLIGATIONS_SALARIE = obligationsConformite.filter(estPorteeParSalarie);

// ── Mise en page ───────────────────────────────────────────────────────────

const C = {
  obligation: "27%",
  periodicite: "10%",
  realisateur: "13%",
  regime: "16%",
  condition: "14%",
  reference: "20%",
} as const;

const cell = { paddingRight: 6 } as const;

/**
 * `stylesCommuns.page` porte `lineHeight: 1.4`. Dans cette version de
 * @react-pdf, un `lineHeight` posé sur la Page fait disparaître tout élément
 * `fixed` en position absolue : le pied de page — donc la pagination —
 * n'était tout simplement pas imprimé. On reprend le style de page sans lui.
 * (Le défaut vaut aussi pour les documents de l'application, cf. note remise
 * avec ce PDF.)
 */
const stylePage = { ...s.page, lineHeight: undefined } as const;

function EnTeteTableau() {
  return (
    <View style={s.thead}>
      <Text style={[s.th, cell, { width: C.obligation }]}>Obligation</Text>
      <Text style={[s.th, cell, { width: C.periodicite }]}>Échéance</Text>
      <Text style={[s.th, cell, { width: C.realisateur }]}>Par qui</Text>
      <Text style={[s.th, cell, { width: C.regime }]}>Régime visé</Text>
      <Text style={[s.th, cell, { width: C.condition }]}>Condition</Text>
      <Text style={[s.th, cell, { width: C.reference }]}>
        Texte fondateur
      </Text>
    </View>
  );
}

function LigneObligation({ o }: { o: Obligation }) {
  const [fondatrice, ...autres] = o.referencesLegales;
  const refTexte = texteReference(fondatrice);
  return (
    <View style={s.row} wrap={false}>
      <View style={[cell, { width: C.obligation }]}>
        <Text style={s.td}>{t(o.libelle)}</Text>
        <Text style={[s.small, { marginTop: 1 }]}>
          criticité {o.criticite}/5 · {LABEL_DOMAINE[o.domaine]} ·{" "}
          {LIBELLE_NATURE[o.nature]}
        </Text>
      </View>
      <View style={[cell, { width: C.periodicite }]}>
        <Text style={s.td}>{LABEL_PERIODICITE[periodiciteEffective(o)]}</Text>
        {/* ADR-039 : un rythme que le texte n'écrit pas dit d'où il vient. */}
        {o.rythmeRetenu && (
          <Text style={[s.small, { marginTop: 1 }]}>
            {t(mentionRythmeRetenu(o)!.court)}
          </Text>
        )}
      </View>
      <Text style={[s.td, cell, { width: C.realisateur }]}>
        {o.realisateurs.map((r) => LABEL_REALISATEUR[r]).join(" ou ")}
      </Text>
      <Text style={[s.td, cell, { width: C.regime }]}>
        {texteTypologie(o.typologies)}
      </Text>
      <Text style={[s.td, cell, { width: C.condition }]}>
        {conditionsTexte(o)}
      </Text>
      <View style={[cell, { width: C.reference }]}>
        {fondatrice.url ? (
          <Link src={fondatrice.url} style={[s.td, { color: BOARD.encre }]}>
            {refTexte}
          </Link>
        ) : (
          <Text style={s.td}>{refTexte}</Text>
        )}
        {autres.length > 0 && (
          <Text style={[s.small, { marginTop: 1 }]}>
            aussi : {autres.map((r) => t(r.reference)).join(" ; ")}
          </Text>
        )}
      </View>
    </View>
  );
}

function PiedDePage({ document }: { document?: string }) {
  return (
    <Text
      style={s.footer}
      fixed
      render={({ pageNumber, totalPages }) =>
        `Rojer — ${document ?? "grille de relecture du référentiel"} ${REFERENTIEL_VERSION} · page ${pageNumber}/${totalPages}`
      }
    />
  );
}

function GrilleDocument({ genereLe }: { genereLe: string }) {
  const lignes = CATEGORIES_EQUIPEMENT.map((c) => ({
    categorie: c,
    obligations: obligationsDe(c),
  }));
  const total = obligationsConformite.length;

  return (
    <Document
      title="Rojer — grille de relecture du référentiel"
      author="Rojer"
    >
      {/* Récapitulatif */}
      <Page size="A4" orientation="landscape" style={stylePage}>
        <Text style={{ fontSize: 10, color: BOARD.ardoiseMoyenne }}>
          Rojer — référentiel de conformité {REFERENTIEL_VERSION}
        </Text>
        <Text style={[s.h1, { marginTop: 4 }]}>
          Grille de relecture du référentiel
        </Text>
        <Text style={{ fontSize: 10, color: BOARD.ardoiseMoyenne }}>
          {total} obligations · {CATEGORIES_EQUIPEMENT.length} catégories
          d&apos;équipement · document généré le {genereLe}
        </Text>

        <View style={s.mentionsLegalesBloc}>
          <Text>
            Ce document décrit ce que l&apos;outil calcule : les catégories
            d&apos;équipement qu&apos;un établissement peut déclarer, et les
            obligations du référentiel qui citent chacune d&apos;elles. Une
            obligation n&apos;apparaît au calendrier d&apos;un établissement
            que si son régime (colonne « Régime visé ») et ses conditions
            (colonne « Condition ») sont satisfaits — la présence d&apos;une
            ligne ici ne signifie donc pas qu&apos;elle s&apos;applique partout.
            Le périmètre du référentiel n&apos;est pas celui du droit :
            l&apos;absence d&apos;une obligation n&apos;emporte aucune
            conclusion. Rojer calcule, il n&apos;avise pas.
          </Text>
          <Text style={{ marginTop: 6 }}>
            Le document couvre les {total} obligations, rangées par ce qui les
            déclenche : un équipement déclaré, le statut de
            l&apos;établissement, ou un titre que l&apos;employeur déclare pour
            une personne. Une obligation sans échéance chiffrée n&apos;est pas
            un manque de dépouillement — la colonne « nature », sous chaque
            libellé, dit si le texte impose un rythme, un état à maintenir, un
            acte ponctuel ou une obligation qui renaît à chaque événement.
          </Text>
        </View>

        <Text style={s.h2}>Récapitulatif par porteur</Text>
        <View style={s.thead}>
          <Text style={[s.th, cell, { width: "22%" }]}>Porteur</Text>
          <Text style={[s.th, cell, { width: "8%" }]}>Obligations</Text>
          <Text style={[s.th, cell, { width: "70%" }]}>
            Ce qui la fait naître
          </Text>
        </View>
        {(
          [
            [
              "Équipement",
              obligationsConformite.filter(estPorteeParEquipement).length,
              "Un appareil déclaré au parc. L'instance est dérivée par le moteur : une obligation par appareil concerné.",
            ],
            [
              "Établissement",
              OBLIGATIONS_ETABLISSEMENT.length,
              "Le statut d'employeur, l'effectif, la typologie du bâtiment ou la co-activité. Aucun appareil n'est requis : un bureau sans matériel en reçoit.",
            ],
            [
              "Salarié",
              OBLIGATIONS_SALARIE.length,
              "Un titre que l'employeur déclare pour une personne nommée. Le produit ne dérive JAMAIS qui est concerné (ADR-023) : sans déclaration, aucune échéance.",
            ],
          ] as [string, number, string][]
        ).map(([nom, n, quoi]) => (
          <View key={nom} style={s.row} wrap={false}>
            <Text
              style={[s.td, cell, { width: "22%", fontFamily: "Helvetica-Bold" }]}
            >
              {nom}
            </Text>
            <Text style={[s.td, cell, { width: "8%" }]}>{n}</Text>
            <Text style={[s.small, cell, { width: "70%" }]}>{t(quoi)}</Text>
          </View>
        ))}

        <Text style={s.h2}>Récapitulatif par catégorie d&apos;équipement</Text>
        <View style={s.thead}>
          <Text style={[s.th, cell, { width: "22%" }]}>Catégorie</Text>
          <Text style={[s.th, cell, { width: "30%" }]}>Ce qu&apos;elle couvre</Text>
          <Text style={[s.th, cell, { width: "8%" }]}>Obligations</Text>
          <Text style={[s.th, cell, { width: "18%" }]}>Échéances</Text>
          <Text style={[s.th, cell, { width: "22%" }]}>
            Questions qui bornent
          </Text>
        </View>
        {lignes.map(({ categorie, obligations }) => {
          const rythmes = [
            ...new Set(obligations.map((o) => LABEL_PERIODICITE[periodiciteEffective(o)])),
          ];
          const questions = questionsCategorie(categorie);
          return (
            <View key={categorie} style={s.row} wrap={false}>
              <Text
                style={[
                  s.td,
                  cell,
                  { width: "22%", fontFamily: "Helvetica-Bold" },
                ]}
              >
                {LABEL_CATEGORIE_EQUIPEMENT[categorie]}
              </Text>
              <Text style={[s.small, cell, { width: "30%" }]}>
                {t(DESCRIPTION_CATEGORIE[categorie] ?? "—")}
              </Text>
              <Text style={[s.td, cell, { width: "8%" }]}>
                {obligations.length || "aucune"}
              </Text>
              <Text style={[s.td, cell, { width: "18%" }]}>
                {rythmes.length ? rythmes.join(", ") : "—"}
              </Text>
              <Text style={[s.small, cell, { width: "22%" }]}>
                {questions.length ? questions.join(" · ") : "—"}
              </Text>
            </View>
          );
        })}
        <PiedDePage />
      </Page>

      {/* Un sous-tableau par catégorie, une page par catégorie */}
      {lignes.map(({ categorie, obligations }) => (
        <Page
          key={categorie}
          size="A4"
          orientation="landscape"
          style={stylePage}
        >
          <Text style={{ fontSize: 9, color: BOARD.ardoiseMoyenne }}>
            Équipement déclarable
          </Text>
          <Text style={[s.h1, { fontSize: 16, marginTop: 2, marginBottom: 4 }]}>
            {LABEL_CATEGORIE_EQUIPEMENT[categorie]}
          </Text>
          {DESCRIPTION_CATEGORIE[categorie] && (
            <Text style={s.small}>
              {t(DESCRIPTION_CATEGORIE[categorie]!)}
            </Text>
          )}
          {questionsCategorie(categorie).length > 0 && (
            <Text style={[s.small, { marginTop: 4 }]}>
              Questions posées à la déclaration :{" "}
              {questionsCategorie(categorie).join(" · ")}
            </Text>
          )}

          {obligations.length === 0 ? (
            <Text style={[s.td, { marginTop: 12 }]}>
              Aucune obligation du référentiel ne cite cette catégorie :
              l&apos;outil ne produit aucune échéance pour un équipement rangé
              ici. Cela ne dit rien du droit applicable à l&apos;appareil.
            </Text>
          ) : (
            <EnTeteTableau />
          )}
          {obligations.map((o) => (
            <LigneObligation key={o.id} o={o} />
          ))}
          <PiedDePage />
        </Page>
      ))}

      {/* Portées par l'établissement — une page par domaine */}
      {[...parDomaine(OBLIGATIONS_ETABLISSEMENT)].map(([domaine, liste]) => (
        <Page
          key={`etab-${domaine}`}
          size="A4"
          orientation="landscape"
          style={stylePage}
        >
          <Text style={{ fontSize: 9, color: BOARD.ardoiseMoyenne }}>
            Portée par l&apos;établissement · aucun équipement requis
          </Text>
          <Text style={[s.h1, { fontSize: 16, marginTop: 2, marginBottom: 4 }]}>
            {LABEL_DOMAINE[domaine as keyof typeof LABEL_DOMAINE]}
          </Text>
          <Text style={s.small}>
            {t(
              "Ces obligations ne naissent d'aucun appareil déclaré : elles sont dues au titre du statut d'employeur, de l'effectif, de la typologie du bâtiment ou de la co-activité. Un établissement sans le moindre équipement en reçoit.",
            )}
          </Text>
          <EnTeteTableau />
          {liste.map((o) => (
            <LigneObligation key={o.id} o={o} />
          ))}
          <PiedDePage />
        </Page>
      ))}

      {/* Portées par un salarié — une page par domaine */}
      {[...parDomaine(OBLIGATIONS_SALARIE)].map(([domaine, liste]) => (
        <Page
          key={`sal-${domaine}`}
          size="A4"
          orientation="landscape"
          style={stylePage}
        >
          <Text style={{ fontSize: 9, color: BOARD.ardoiseMoyenne }}>
            Portée par un salarié · déclarée par l&apos;employeur
          </Text>
          <Text style={[s.h1, { fontSize: 16, marginTop: 2, marginBottom: 4 }]}>
            {LABEL_DOMAINE[domaine as keyof typeof LABEL_DOMAINE]}
          </Text>
          <Text style={s.small}>
            {t(
              "Le produit ne dérive jamais qui est concerné : rien, dans le dossier, ne dit quelle personne opère sur quoi (ADR-023). C'est l'employeur qui déclare le titre pour une personne nommée, et l'échéance qu'il saisit prime sur tout calcul. Sans déclaration, aucune ligne n'est produite — et ce silence est un constat juste, pas un défaut.",
            )}
          </Text>
          <EnTeteTableau />
          {liste.map((o) => (
            <LigneObligation key={o.id} o={o} />
          ))}
          <PiedDePage />
        </Page>
      ))}
    </Document>
  );
}

/**
 * Le dossier détaillé : une entrée par obligation, avec ce qui la fonde.
 *
 * La grille dit CE QUE l'outil calcule ; ce document dit SUR QUOI. Un relecteur
 * qui veut contester une périodicité a besoin des trois choses que la grille ne
 * porte pas — le texte relevé à la source, la version constatée, et
 * l'argumentation qui a conduit à encoder ainsi plutôt qu'autrement.
 *
 * Les notes internes y figurent telles quelles. Elles sont écrites pour la
 * personne suivante qui touchera la ligne, pas pour un lecteur extérieur, et
 * leur ton s'en ressent — elles disent « ne retirez pas ceci », elles nomment
 * des erreurs passées, elles se contredisent parfois d'une version à l'autre.
 * **C'est précisément ce qui en fait le meilleur support de relecture** : un
 * défaut d'encodage se voit dans le raisonnement bien avant de se voir dans le
 * tableau.
 */
function DossierDetaille({ genereLe }: { genereLe: string }) {
  const parPorteur: [string, string, Obligation[]][] = [
    [
      "Portées par un équipement",
      "Elles naissent d'un appareil déclaré au parc.",
      obligationsConformite.filter(estPorteeParEquipement),
    ],
    [
      "Portées par l'établissement",
      "Elles naissent du statut d'employeur, de l'effectif ou de la typologie. Aucun appareil n'est requis.",
      OBLIGATIONS_ETABLISSEMENT,
    ],
    [
      "Portées par un salarié",
      "L'employeur les déclare pour une personne nommée. Le produit ne dérive jamais qui est concerné.",
      OBLIGATIONS_SALARIE,
    ],
  ];

  return (
    <Document title="Rojer — dossier de relecture détaillé" author="Rojer">
      <Page size="A4" style={stylePage}>
        <Text style={{ fontSize: 10, color: BOARD.ardoiseMoyenne }}>
          Rojer — référentiel de conformité {REFERENTIEL_VERSION}
        </Text>
        <Text style={[s.h1, { marginTop: 4 }]}>Dossier de relecture détaillé</Text>
        <Text style={{ fontSize: 10, color: BOARD.ardoiseMoyenne }}>
          {obligationsConformite.length} obligations · document généré le{" "}
          {genereLe}
        </Text>
        <View style={s.mentionsLegalesBloc}>
          <Text>
            {t(
              "Une entrée par obligation. Pour chacune : ce que le dirigeant lit, les textes cités avec ce que le corpus en a relevé à la source, et l'argumentation d'encodage telle qu'elle a été écrite.",
            )}
          </Text>
          <Text style={{ marginTop: 6 }}>
            {t(
              "Les notes d'encodage sont internes : elles s'adressent à la personne suivante qui touchera la ligne, elles nomment des erreurs passées et des réserves non levées. Elles sont reproduites sans retouche — un défaut se lit dans le raisonnement avant de se lire dans le tableau. Le référentiel n'est pas le droit : l'absence d'une obligation n'emporte aucune conclusion.",
            )}
          </Text>
          <Text style={{ marginTop: 6 }}>
            {t(
              "Sous chaque référence, deux mentions reviennent souvent et il faut les lire pour ce qu'elles sont. « Dépouillé, aucun extrait relevé » : quelqu'un a ouvert l'article et l'a classé, sans en recopier le texte — le relecteur doit donc l'ouvrir lui-même, et c'est le cas le plus fréquent du référentiel. « Aucune version constatée » : la date de la version lue n'a pas été notée, donc rien ne dit que l'article n'a pas changé depuis. Ces deux silences sont affichés plutôt que masqués : ils bornent ce que cette relecture peut établir.",
            )}
          </Text>
        </View>
        <PiedDePage document="dossier de relecture détaillé ·" />
      </Page>

      {parPorteur.map(([titre, sous, liste]) => (
        <Page key={titre} size="A4" style={stylePage}>
          <Text style={[s.h1, { fontSize: 18 }]}>{titre}</Text>
          <Text style={[s.small, { marginTop: 2 }]}>
            {t(sous)} — {liste.length} obligations.
          </Text>
          {liste.map((o) => (
            <View key={o.id} style={{ marginTop: 14 }} wrap>
              <Text
                style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}
              >
                {t(o.libelle)}
              </Text>
              <Text style={[s.small, { marginTop: 1 }]}>
                {o.id} · {LABEL_DOMAINE[o.domaine]} · {LIBELLE_NATURE[o.nature]}{" "}
                · {LABEL_PERIODICITE[periodiciteEffective(o)]} · criticité {o.criticite}/5
                · par {o.realisateurs.map((r) => LABEL_REALISATEUR[r]).join(" ou ")}
              </Text>
              <Text style={[s.small, { marginTop: 1 }]}>
                Régime : {texteTypologie(o.typologies)} · Condition :{" "}
                {conditionsTexte(o)}
              </Text>
              {o.rythmeRetenu && (
                <Text style={[s.small, { marginTop: 1 }]}>
                  {t(mentionRythmeRetenu(o)!.long)}
                </Text>
              )}
              {o.description && (
                <Text style={[s.td, { marginTop: 4 }]}>{t(o.description)}</Text>
              )}
              {o.referencesLegales.map((r, i) => {
                const releve = r.article
                  ? RELEVE_PAR_ARTICLE.get(r.article)
                  : undefined;
                return (
                  <View key={i} style={{ marginTop: 4 }}>
                    <Text style={[s.small, { fontFamily: "Helvetica-Bold" }]}>
                      {t(r.reference)}
                      {r.versionConstatee
                        ? ` — version constatée ${r.versionConstatee}`
                        : " — aucune version constatée"}
                    </Text>
                    {releve?.prescrit && (
                      <Text style={s.small}>{t(releve.prescrit)}</Text>
                    )}
                    {releve?.citationCle && (
                      <Text style={[s.small, { fontFamily: "Helvetica-Oblique" }]}>
                        « {t(releve.citationCle)} »
                      </Text>
                    )}
                    {!releve && (
                      <Text style={s.small}>
                        {t("Absent du corpus — jamais dépouillé.")}
                      </Text>
                    )}
                    {releve && !releve.prescrit && !releve.citationCle && (
                      <Text style={s.small}>
                        {t("Dépouillé, aucun extrait relevé — texte à ouvrir.")}
                      </Text>
                    )}
                  </View>
                );
              })}
              {o.notesInternes && (
                <Text style={[s.small, { marginTop: 4 }]}>
                  {t(o.notesInternes)}
                </Text>
              )}
            </View>
          ))}
          <PiedDePage document="dossier de relecture détaillé ·" />
        </Page>
      ))}
    </Document>
  );
}

const detaille = process.argv.includes("--detail");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const sortie =
  args[0] ??
  path.resolve(
    process.cwd(),
    "..",
    detaille ? "Rojer-dossier-relecture.pdf" : "Rojer-grille-equipements.pdf",
  );

const genereLe = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: "Europe/Paris",
}).format(new Date());

renderToFile(
  detaille ? (
    <DossierDetaille genereLe={genereLe} />
  ) : (
    <GrilleDocument genereLe={genereLe} />
  ),
  sortie,
).then(
  () => console.log(`PDF écrit : ${sortie}`),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
