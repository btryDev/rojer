#!/usr/bin/env tsx
//
// Grille de RELECTURE du référentiel : ~~les 116 obligations~~ toutes les
// obligations [2026-10-13 : 176 au référentiel 2026-10-13.1 ; le compte n'est
// plus écrit ici, l'en-tête du PDF l'imprime, calculé sur
// `obligationsConformite`], sans exception, rangées par ce qui les déclenche.
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
//   pnpm exec tsx --import ./scripts/server-only-hors-next.mjs scripts/generer-grille-equipements.tsx [chemin.pdf]
//     [--propositions-audit propositions.json] [--annexe-relecture remarques.json]
//
// Les deux options lisent des données de RELECTURE, tenues hors du dépôt
// (`src/lib/pdf/entrees-grille-relecture.ts`) :
//   --propositions-audit  [{ id, motif }] : lignes que nous proposons de passer
//                         au niveau audit. ~~Marquées « Proposé » avec leur
//                         motif.~~ [2026-10-09, C67 : depuis la décision de la
//                         propriétaire du 2026-10-08, elles portent la MÊME
//                         mention que les lignes déjà au niveau audit —
//                         `MENTION_NIVEAU_AUDIT`, « Audit », en couleur —, sans
//                         motif ni statut.] Le `motif` reste exigé dans le JSON
//                         (`lirePropositionsAudit` le refuse vide) : c'est la
//                         trace, pour nous, de pourquoi la ligne est proposée.
//                         Il n'est plus imprimé. Elles n'entrent pas au
//                         référentiel ;
//   --annexe-relecture    { intro?, remarques: [{ page, objet?, remarque, fait,
//                         statut }], questions: [] } : la réponse aux remarques
//                         du relecteur, imprimée en tête du document.

import { renderToFile } from "@react-pdf/renderer";
import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  decompteStatuts,
  lireAnnexeRelecture,
  lireArguments,
  lirePropositionsAudit,
  type AnnexeRelecture,
  type PropositionAudit,
} from "@/lib/pdf/entrees-grille-relecture";
import {
  estNiveauAudit,
  MENTION_NIVEAU_AUDIT,
  nombreObligationsSuivies,
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
import { mentionRythmeRetenu } from "@/lib/referentiels/conformite/mention-rythme";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import { libelleRythme } from "@/lib/referentiels/conformite/renvoi-aux-normes";
import {
  CATEGORIES_EQUIPEMENT,
  PERIODICITE_EN_JOURS,
  type CategorieEquipement,
} from "@/lib/referentiels/types-communs";
import {
  LEGENDE_REGIME,
  pourHelvetica as t,
  LEGENDE_PORTEURS,
  LEGENDE_SURFACE,
  LIBELLE_SURFACE,
  suiviParPersonne,
  texteOuVisible,
  texteTypologie,
} from "@/lib/pdf/textes-grille-relecture";
import { SURFACES } from "@/lib/surfaces/obligations-sans-surface";
import { ReferenceDetaillee } from "@/lib/pdf/ReferenceDetaillee";
import {
  DESCRIPTION_CATEGORIE,
  LABEL_CATEGORIE_EQUIPEMENT,
} from "@/lib/equipements/labels";
import { LIBELLE_CARACTERISTIQUE } from "@/lib/equipements/caracteristiques";
import { LABEL_FAMILLE_ESP } from "@/lib/equipements/esp";
import type { FamilleEsp } from "@/lib/equipements/esp";
import {
  CATEGORIES_AERATION,
  CATEGORIES_TRI_ETAT,
} from "@/lib/equipements/schema";
import {
  LABEL_DOMAINE,
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

// `t` (la table SUBSTITUTIONS) vit dans `src/lib/pdf/textes-grille-relecture.ts`
// sous le nom `pourHelvetica` depuis le 2026-10-13 : le bloc de référence du
// dossier, extrait pour être testé, en a besoin.

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

// La ligne « Régime » (`texteTypologie`) vit dans
// `src/lib/pdf/textes-grille-relecture.ts`, où le compilateur tient qu'elle
// rend chaque critère de `TypologieApplication` (2026-10-13).

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
  // Les deux suivants s'imprimaient en clé brute depuis la grille du 28/09
  // (relevé le 2026-10-08) ; libellés de la fiche équipement et du formulaire.
  aSystemeDeRecyclage: "Système de recyclage d'air",
  familleEsp: "Famille d'équipement sous pression",
  // ~~`typeExtincteur`~~ : question retirée le 2026-10-08 (C66).
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
  return `« ${valeur} »`;
}

function conditionsTexte(o: Obligation): string {
  const parts = (o.conditions ?? []).map(texteCondition);
  // 2026-10-13 : une obligation d'établissement peut naître d'un appareil
  // déclaré (`siEquipementDeclare`) — la grille le taisait.
  const si = o.siEquipementDeclare;
  if (si?.length) {
    parts.push(
      `si déclaré au parc : ${si.map((c) => LABEL_CATEGORIE_EQUIPEMENT[c]).join(" ou ")}`,
    );
  }
  return parts.length ? parts.join(" ; ") : "—";
}

/** Les questions du formulaire qui bornent les obligations de la catégorie. */
function questionsCategorie(c: CategorieEquipement): string[] {
  const q: string[] = [];
  if (c === "INSTALLATION_ELECTRIQUE") q.push("Groupe électrogène de sécurité");
  if (CATEGORIES_AERATION.includes(c)) q.push("Local à pollution spécifique");
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
// La recherche passe par l'index canonique, `indexArticlesParRef()` : voir
// `releveDe` (`src/lib/pdf/textes-grille-relecture.ts`). La boucle locale qui
// tenait lieu d'index ici gardait le dernier corpus, le dépôt le premier
// dépouillé (2026-10-13).

const OBLIGATIONS_ETABLISSEMENT = obligationsConformite.filter(
  (o) => !estPorteeParEquipement(o) && !estPorteeParSalarie(o),
);
const OBLIGATIONS_SALARIE = obligationsConformite.filter(estPorteeParSalarie);

// ── Mise en page ───────────────────────────────────────────────────────────

const C = {
  obligation: "26%",
  periodicite: "10%",
  realisateur: "12%",
  regime: "15%",
  condition: "13%",
  reference: "18%",
  audit: "6%",
} as const;

// 2026-10-13, retour de la propriétaire : 6 → 12, plus d'air entre les
// colonnes qui passent à la ligne.
const cell = { paddingRight: 12 } as const;

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
    <View style={[s.thead, { marginTop: 14 }]}>
      <Text style={[s.th, cell, { width: C.obligation }]}>Obligation</Text>
      <Text style={[s.th, cell, { width: C.periodicite }]}>Échéance</Text>
      <Text style={[s.th, cell, { width: C.realisateur }]}>Par qui</Text>
      <Text style={[s.th, cell, { width: C.regime }]}>Régime visé</Text>
      <Text style={[s.th, cell, { width: C.condition }]}>Condition</Text>
      <Text style={[s.th, cell, { width: C.reference }]}>
        Texte fondateur
      </Text>
      <Text style={[s.th, { width: C.audit }]}>Audit</Text>
    </View>
  );
}

/**
 * Les propositions de passage au niveau audit, par id — vide sans l'option.
 * Données de relecture : elles ne touchent pas au référentiel.
 */
type Propositions = ReadonlyMap<string, PropositionAudit>;

function LigneObligation({
  o,
  propositions,
}: {
  o: Obligation;
  propositions: Propositions;
}) {
  const [fondatrice, ...autres] = o.referencesLegales;
  const refTexte = texteReference(fondatrice);
  const proposition = propositions.get(o.id);
  return (
    <View
      style={[s.row, { flexDirection: "column" }]}
      wrap={false}
    >
    <View style={{ flexDirection: "row" }}>
      <View style={[cell, { width: C.obligation }]}>
        <Text style={s.td}>{t(o.libelle)}</Text>
        <Text style={[s.small, { marginTop: 1 }]}>
          criticité {o.criticite}/5 · {LABEL_DOMAINE[o.domaine]} ·{" "}
          {LIBELLE_NATURE[o.nature]}
        </Text>
        {/* 2026-10-13 : où le dirigeant la voit, lu dans `surfacesDe` — une
            ligne courte sous le libellé plutôt qu'une colonne de plus. */}
        <Text style={[s.small, { marginTop: 1, color: BOARD.bleuEncre }]}>
          {t(`Visible : ${texteOuVisible(o)}`)}
        </Text>
      </View>
      <View style={[cell, { width: C.periodicite }]}>
        <Text style={s.td}>{libelleRythme(o)}</Text>
        {/* ADR-039 : un rythme que le texte n'écrit pas dit d'où il vient. */}
        {o.rythmeRetenu && (
          <Text style={[s.small, { marginTop: 1 }]}>
            {t(mentionRythmeRetenu(o)!.court)}
          </Text>
        )}
        {/* Le renvoi vers le titre qui porte le rythme, DANS la colonne
            Échéance : c'est celle que le préventeur lit (grille du 13/10,
            p. 8). « Sans rythme écrit » reste au-dessus, fidèle au texte. */}
        {suiviParPersonne(o, obligationsConformite).map((ligne) => (
          <Text
            key={ligne}
            style={[s.small, { marginTop: 2, color: BOARD.bleuEncre }]}
          >
            {t(ligne)}
          </Text>
        ))}
      </View>
      <Text style={[s.td, cell, { width: C.realisateur }]}>
        {o.realisateurs.map((r) => LABEL_REALISATEUR[r]).join(" ou ")}
      </Text>
      <Text style={[s.td, cell, { width: C.regime }]}>
        {t(texteTypologie(o.typologies))}
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
      {/* ADR-042 : au référentiel, hors du quotidien — marquée, jamais tue. */}
      {/* 2026-10-08 (propriétaire) : une seule mention, en couleur, sur les
          lignes au niveau audit et sur celles proposées au préventeur — sans
          motif ni statut dans la grille qu'on lui renvoie. */}
      <Text
        style={[
          s.td,
          { width: C.audit, fontFamily: "Helvetica-Bold", color: BOARD.ambreEncre },
        ]}
      >
        {estNiveauAudit(o) || proposition ? MENTION_NIVEAU_AUDIT : ""}
      </Text>
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

/**
 * « Vos remarques et ce qui en a été fait » — en tête du document, quand
 * `--annexe-relecture` est passé. Une ligne par remarque du relecteur, puis
 * les questions qui restent posées.
 */
const R = {
  page: "13%",
  remarque: "35%",
  fait: "40%",
  statut: "12%",
} as const;

function PageRemarques({
  annexe,
  genereLe,
}: {
  annexe: AnnexeRelecture;
  genereLe: string;
}) {
  return (
    <Page size="A4" orientation="landscape" style={stylePage}>
      <Text style={{ fontSize: 10, color: BOARD.ardoiseMoyenne }}>
        Rojer — référentiel de conformité {REFERENTIEL_VERSION}
      </Text>
      <Text style={[s.h1, { marginTop: 4 }]}>
        Vos remarques et ce qui en a été fait
      </Text>
      <Text style={{ fontSize: 10, color: BOARD.ardoiseMoyenne }}>
        {annexe.remarques.length} remarques ·{" "}
        {decompteStatuts(annexe.remarques)
          .map(([statut, n]) => `${statut} : ${n}`)
          .join(" · ")}{" "}
        · document généré le {genereLe}
      </Text>
      {annexe.intro && (
        <Text style={[s.small, { marginTop: 6 }]}>{t(annexe.intro)}</Text>
      )}
      <View style={s.thead} fixed>
        <Text style={[s.th, cell, { width: R.page }]}>Page</Text>
        <Text style={[s.th, cell, { width: R.remarque }]}>Votre remarque</Text>
        <Text style={[s.th, cell, { width: R.fait }]}>
          Ce qui a été fait
        </Text>
        <Text style={[s.th, { width: R.statut }]}>Statut</Text>
      </View>
      {annexe.remarques.map((r, i) => (
        <View key={i} style={s.row} wrap={false}>
          <View style={[cell, { width: R.page }]}>
            <Text style={s.td}>{r.page}</Text>
            {r.objet && <Text style={s.small}>{t(r.objet)}</Text>}
          </View>
          <Text
            style={[s.td, cell, { width: R.remarque, fontFamily: "Helvetica-Oblique" }]}
          >
            {"«\u00a0"}
            {t(r.remarque)}
            {"\u00a0»"}
          </Text>
          <Text style={[s.td, cell, { width: R.fait }]}>{t(r.fait)}</Text>
          <Text
            style={[s.td, { width: R.statut, fontFamily: "Helvetica-Bold" }]}
          >
            {r.statut}
          </Text>
        </View>
      ))}
      {annexe.questions.length > 0 && (
        <View wrap={false}>
          <Text style={s.h2}>
            {annexe.questions.length > 1
              ? "Les questions qui restent"
              : "La question qui reste"}
          </Text>
          {annexe.questions.map((q, i) => (
            <Text key={i} style={[s.td, { marginBottom: 6 }]}>
              {annexe.questions.length > 1 ? `${i + 1}. ` : ""}
              {t(q)}
            </Text>
          ))}
        </View>
      )}
      <PiedDePage />
    </Page>
  );
}

/** La référence courte d'une obligation : son article, sinon sa référence. */
function referenceCourte(o: Obligation): string {
  const r = o.referencesLegales[0];
  return r.article ?? r.reference;
}

/** Primitives de la charte board, transposées au PDF (docs/charte-board.md). */
const BOARD_PDF = {
  /** `.board-eyebrow` : mono, capitales, espacé. Courier tient lieu de JetBrains Mono, non embarquée. */
  eyebrow: {
    fontFamily: "Courier",
    fontSize: 8,
    letterSpacing: 1.6,
    color: BOARD.ardoiseDouce,
    textTransform: "uppercase" as const,
  },
  /** `.carte-board` : blanc, rayon 30 px (≈ 22 pt), filet très léger. */
  carte: {
    backgroundColor: BOARD.carte,
    borderRadius: 18,
    borderWidth: 0.6,
    borderColor: BOARD.ardoiseFilet,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  /** `.pastille-board` : pilule, champ bleu pâle, encre bleue. */
  pastille: {
    backgroundColor: BOARD.cielPale,
    color: BOARD.bleuEncre,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    marginRight: 5,
  },
} as const;

function Pastille({ children, ton }: { children: string; ton?: "ambre" }) {
  return (
    <Text
      style={[
        BOARD_PDF.pastille,
        ton === "ambre" ? { backgroundColor: "#fdecc8", color: BOARD.ambreEncre } : {},
      ]}
    >
      {t(children)}
    </Text>
  );
}

function CarteProposition({ o, motif }: { o: Obligation; motif: string }) {
  return (
    <View wrap={false} style={BOARD_PDF.carte}>
      <View style={{ flexDirection: "row", marginBottom: 7 }}>
        <Pastille>{referenceCourte(o)}</Pastille>
        <Pastille>{LABEL_DOMAINE[o.domaine]}</Pastille>
      </View>
      <Text
        style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: BOARD.encre, lineHeight: 1.35 }}
      >
        {t(o.libelle)}
      </Text>
      <Text style={{ fontSize: 10.5, lineHeight: 1.55, marginTop: 6, color: BOARD.ardoiseEncre }}>
        {t(motif)}
      </Text>
      <Text style={{ fontSize: 9, marginTop: 6, color: BOARD.bleuEncre }}>
        {t(`Aujourd'hui visible : ${texteOuVisible(o)}`)}
      </Text>
    </View>
  );
}

function TitrePartie({
  sousTitre,
  titre,
  explication,
}: {
  sousTitre: string;
  titre: string;
  explication: string;
}) {
  return (
    // `minPresenceAhead` : le titre ne reste pas seul en bas de page, il
    // part avec sa première carte.
    <View style={{ marginTop: 20, marginBottom: 10 }} wrap={false} minPresenceAhead={110}>
      <Text style={BOARD_PDF.eyebrow}>{t(sousTitre)}</Text>
      <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: BOARD.encre, marginTop: 4 }}>
        {t(titre)}
      </Text>
      <Text style={{ fontSize: 10, color: BOARD.ardoiseMoyenne, marginTop: 3, lineHeight: 1.45 }}>
        {t(explication)}
      </Text>
    </View>
  );
}

/**
 * La légende des écrans nommés par « Visible : … » (2026-10-13). En page 1
 * dans tous les cas : dans la page des propositions quand elle existe, sinon
 * dans le récapitulatif — revue du 2026-10-13, A2 : elle n'était rendue
 * qu'avec des propositions, et un document sans l'option nommait des écrans
 * sans jamais les expliquer.
 */
function LegendeEcrans() {
  return (
    <View style={[BOARD_PDF.carte, { marginTop: 4 }]} wrap={false}>
      <Text style={BOARD_PDF.eyebrow}>Où le dirigeant voit une obligation</Text>
      {[
        ...SURFACES.map((s2) => [LIBELLE_SURFACE[s2], LEGENDE_SURFACE[s2]] as const),
        ...LEGENDE_PORTEURS,
      ].map(([nom, explication]) => (
        <Text key={nom} style={{ fontSize: 9.5, lineHeight: 1.5, marginTop: 4, color: BOARD.ardoiseEncre }}>
          <Text style={{ fontFamily: "Helvetica-Bold", color: BOARD.bleuEncre }}>{t(nom)}</Text>
          {t(` — ${explication}`)}
        </Text>
      ))}
    </View>
  );
}

/**
 * « Nos propositions de passage au niveau audit » — en tête du document, quand
 * `--propositions-audit` est passé (2026-10-13, demande de la propriétaire :
 * la liste à part, au début, lisible par le préventeur). Le motif, qui n'est
 * plus imprimé dans la grille depuis le 2026-10-09, l'est ici : c'est
 * l'argument soumis. Les obligations déjà au niveau audit suivent, pour
 * rappel.
 *
 * 2026-10-13, retour de la propriétaire : la première version était un
 * tableau dense à trois colonnes, « étouffant pour un humain ». Une carte par
 * proposition, en portrait, avec de l'air : le titre, la référence courte, le
 * motif en une phrase. Deux parties — ce que nous proposons, ce que nous
 * voulons discuter —, puis le rappel de ce qui est déjà décidé.
 */
function PagePropositions({
  propositions,
  genereLe,
}: {
  propositions: Propositions;
  genereLe: string;
}) {
  const motifDe = (o: Obligation) => propositions.get(o.id)!.motif;
  const aDiscuter = (o: Obligation) => /^À discuter\s*:/.test(motifDe(o));
  const sansPrefixe = (m: string) => {
    const r = m.replace(/^À discuter\s*:\s*/, "");
    return r.charAt(0).toUpperCase() + r.slice(1);
  };
  const toutes = obligationsConformite.filter((o) => propositions.has(o.id));
  const fermes = toutes.filter((o) => !aDiscuter(o));
  const ouvertes = toutes.filter(aDiscuter);
  const dejaAudit = obligationsConformite.filter((o) => estNiveauAudit(o));
  return (
    <Page
      size="A4"
      style={{
        ...stylePage,
        backgroundColor: BOARD.canevas,
        paddingHorizontal: 48,
        paddingTop: 44,
        paddingBottom: 56,
      }}
    >
      <Text style={BOARD_PDF.eyebrow}>
        {t(`Rojer · référentiel ${REFERENTIEL_VERSION} · ${genereLe}`)}
      </Text>
      <Text
        style={{ fontSize: 24, fontFamily: "Helvetica-Bold", color: BOARD.encre, marginTop: 10, lineHeight: 1.2 }}
      >
        Passer des obligations au niveau audit
      </Text>
      <View style={[BOARD_PDF.carte, { marginTop: 14, backgroundColor: BOARD.cielPale, borderColor: BOARD.cielPale }]}>
        <Text style={{ fontSize: 10.5, lineHeight: 1.55, color: BOARD.ardoiseEncre }}>
          {t(
            "Le niveau audit garde une obligation dans le référentiel, avec sa source, mais ne la suit plus au quotidien : pas d'échéance au calendrier, pas de ligne au tableau de bord. Elle reste nommée sur la page « Ce que Rojer ne couvre pas ». Rien n'est retiré.",
          )}
        </Text>
        <Text style={{ fontSize: 10.5, lineHeight: 1.55, marginTop: 5, color: BOARD.ardoiseEncre, fontFamily: "Helvetica-Bold" }}>
          {t(
            ouvertes.length > 0
              ? `Ce sont des propositions, rien n'est décidé : ${fermes.length} que nous soutenons, ${ouvertes.length} sur lesquelles votre avis tranchera.`
              : `Ce sont des propositions, rien n'est décidé : ${fermes.length} lignes que nous proposons de passer au niveau audit, à valider ou non.`,
          )}
        </Text>
      </View>

      <LegendeEcrans />

      {dejaAudit.length > 0 && (
        <View wrap={false}>
          <TitrePartie
            sousTitre="Rappel"
            titre={`Déjà au niveau audit (${dejaAudit.length})`}
            explication="Décidé le 8 octobre 2026, sur vos remarques."
          />
          <View style={BOARD_PDF.carte}>
            {dejaAudit.map((o, i) => (
              <View
                key={o.id}
                style={{ flexDirection: "row", alignItems: "center", marginTop: i === 0 ? 0 : 7 }}
              >
                <Pastille>{referenceCourte(o)}</Pastille>
                <Text style={{ fontSize: 10.5, color: BOARD.ardoiseEncre, flex: 1 }}>
                  {t(o.libelle)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <TitrePartie
        sousTitre={`${fermes.length} propositions`}
        titre="Nous proposons"
        explication="Des documents faits une fois ou des exigences d'installation, que le dirigeant n'a pas à piloter au quotidien."
      />
      {fermes.map((o) => (
        <CarteProposition key={o.id} o={o} motif={motifDe(o)} />
      ))}

      {ouvertes.length > 0 && (
        <>
          <TitrePartie
            sousTitre={`${ouvertes.length} questions`}
            titre="À discuter avec vous"
            explication="Nous hésitons : votre avis tranchera."
          />
          {ouvertes.map((o) => (
            <CarteProposition key={o.id} o={o} motif={sansPrefixe(motifDe(o))} />
          ))}
        </>
      )}

      <PiedDePage />
    </Page>
  );
}

function GrilleDocument({
  genereLe,
  propositions,
  annexe,
}: {
  genereLe: string;
  propositions: Propositions;
  annexe?: AnnexeRelecture;
}) {
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
      {propositions.size > 0 && (
        <PagePropositions propositions={propositions} genereLe={genereLe} />
      )}
      {annexe && <PageRemarques annexe={annexe} genereLe={genereLe} />}

      {/* Récapitulatif */}
      <Page size="A4" orientation="landscape" style={stylePage}>
        <Text style={{ fontSize: 10, color: BOARD.ardoiseMoyenne }}>
          Rojer — référentiel de conformité {REFERENTIEL_VERSION}
        </Text>
        <Text style={[s.h1, { marginTop: 4 }]}>
          Grille de relecture du référentiel
        </Text>
        <Text style={{ fontSize: 10, color: BOARD.ardoiseMoyenne }}>
          {total} obligations, dont {total - nombreObligationsSuivies()} au
          niveau audit ({nombreObligationsSuivies()} suivies au quotidien)
          ·{" "}
          {CATEGORIES_EQUIPEMENT.length} catégories d&apos;équipement ·
          document généré le {genereLe}
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
          <Text style={{ marginTop: 6 }}>{t(LEGENDE_REGIME)}</Text>
          <Text style={{ marginTop: 6 }}>
            Colonne{" "}
            <Text style={{ fontFamily: "Helvetica-Bold", color: BOARD.ambreEncre }}>
              Audit
            </Text>{" "}
            : obligation légale que nous proposons de garder au référentiel
            sans que Rojer la suive au quotidien — ni calendrier, ni
            alertes —, listée sur la page « Ce que Rojer ne couvre pas ».
            Votre avis ?
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

        {propositions.size === 0 && <LegendeEcrans />}

        {/* Le titre part avec son tableau : la légende l'aurait laissé seul en bas de page. */}
        <Text style={s.h2} minPresenceAhead={80}>Récapitulatif par porteur</Text>
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
            ...new Set(obligations.map((o) => libelleRythme(o))),
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
          <Text style={[s.h1, { fontSize: 16, marginTop: 2, marginBottom: 8 }]}>
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
            <LigneObligation key={o.id} o={o} propositions={propositions} />
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
          <Text style={[s.h1, { fontSize: 16, marginTop: 2, marginBottom: 8 }]}>
            {LABEL_DOMAINE[domaine as keyof typeof LABEL_DOMAINE]}
          </Text>
          <Text style={s.small}>
            {t(
              "Ces obligations ne naissent d'aucun appareil déclaré : elles sont dues au titre du statut d'employeur, de l'effectif, de la typologie du bâtiment ou de la co-activité. Un établissement sans le moindre équipement en reçoit.",
            )}
          </Text>
          <EnTeteTableau />
          {liste.map((o) => (
            <LigneObligation key={o.id} o={o} propositions={propositions} />
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
          <Text style={[s.h1, { fontSize: 16, marginTop: 2, marginBottom: 8 }]}>
            {LABEL_DOMAINE[domaine as keyof typeof LABEL_DOMAINE]}
          </Text>
          <Text style={s.small}>
            {t(
              "Le produit ne dérive jamais qui est concerné : rien, dans le dossier, ne dit quelle personne opère sur quoi (ADR-023). C'est l'employeur qui déclare le titre pour une personne nommée, et l'échéance qu'il saisit prime sur tout calcul. Sans déclaration, aucune ligne n'est produite — et ce silence est un constat juste, pas un défaut.",
            )}
          </Text>
          <EnTeteTableau />
          {liste.map((o) => (
            <LigneObligation key={o.id} o={o} propositions={propositions} />
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
          {obligationsConformite.length} obligations, dont{" "}
          {obligationsConformite.length - nombreObligationsSuivies()} au niveau
          audit ({nombreObligationsSuivies()} suivies au quotidien, chiffre
          affiché au public et dans l&apos;app) · document généré le{" "}
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
              "Sous chaque référence, deux mentions reviennent souvent et il faut les lire pour ce qu'elles sont. « Dépouillé, aucun extrait relevé » : quelqu'un a ouvert l'article et l'a classé, sans en recopier le texte — le relecteur doit donc l'ouvrir lui-même, et c'est le cas le plus fréquent du référentiel. « Aucune version constatée » : la date de la version lue n'a pas été notée, donc rien ne dit que l'article n'a pas changé depuis. Ces deux silences sont affichés plutôt que masqués : ils bornent ce que cette relecture peut établir. Sous la référence, une ligne en petit corps dit la provenance de ce qui suit : le sort de l'article au corpus (« retenu » s'il fonde une obligation), la façon dont il a été lu, la date de lecture, et la version lue au corpus quand elle n'est pas celle que la référence dit avoir constatée.",
            )}
          </Text>
          <Text style={{ marginTop: 6 }}>{t(LEGENDE_REGIME)}</Text>
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
                · {libelleRythme(o)} · criticité {o.criticite}/5
                · par {o.realisateurs.map((r) => LABEL_REALISATEUR[r]).join(" ou ")}
              </Text>
              <Text style={[s.small, { marginTop: 1 }]}>
                {t(`Régime : ${texteTypologie(o.typologies)} · Condition : ${conditionsTexte(o)}`)}
              </Text>
              {o.rythmeRetenu && (
                <Text style={[s.small, { marginTop: 1 }]}>
                  {t(mentionRythmeRetenu(o)!.long)}
                </Text>
              )}
              {o.description && (
                <Text style={[s.td, { marginTop: 4 }]}>{t(o.description)}</Text>
              )}
              {o.referencesLegales.map((r, i) => (
                <ReferenceDetaillee key={i} r={r} />
              ))}
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

const { options, drapeaux, positionnels: args } = lireArguments(
  process.argv.slice(2),
  ["propositions-audit", "annexe-relecture"],
);
const detaille = drapeaux.has("detail");

function lireJson(chemin: string): unknown {
  return JSON.parse(readFileSync(path.resolve(chemin), "utf8"));
}

const propositions = options.has("propositions-audit")
  ? lirePropositionsAudit(
      lireJson(options.get("propositions-audit")!),
      new Set(obligationsConformite.map((o) => o.id)),
      new Set(obligationsConformite.filter(estNiveauAudit).map((o) => o.id)),
    )
  : new Map<string, PropositionAudit>();
const annexe = options.has("annexe-relecture")
  ? lireAnnexeRelecture(lireJson(options.get("annexe-relecture")!))
  : undefined;
if (detaille && (propositions.size > 0 || annexe)) {
  throw new Error(
    "--propositions-audit et --annexe-relecture s'impriment dans la grille, pas dans le dossier détaillé (--detail)",
  );
}

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
    <GrilleDocument
      genereLe={genereLe}
      propositions={propositions}
      annexe={annexe}
    />
  ),
  sortie,
).then(
  () => console.log(`PDF écrit : ${sortie}`),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
