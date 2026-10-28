// Le formulaire et la fiche du plan de prévention, RENDUS, et ce qu'on y lit.
//
// POURQUOI RENDRE PLUTÔT QUE LIRE LE SOURCE. La première garde comptait des
// identifiants dans le source des écrans. Elle laissait passer (vérifié par
// injection, contre-lecture du 2026-09-26) : la condition de la carte
// R. 4512-12 forcée à vrai, son chapeau supprimé, `{CHAPITRE_R4512}` retiré
// du formulaire, une constante tronquée en place
// (`R4512_9.split(" Cette liste")[0]`). Tous ont en commun de laisser
// l'identifiant dans le source et d'ôter le texte de l'écran. Ici, on rend
// l'écran et on y cherche chaque texte ENTIER.
//
// Ce que ce test ne voit pas : une phrase de son cru AJOUTÉE à côté d'un
// texte entier. Seules les phrases du module sont contrôlées.
//
// [2026-10-28 — le droit derrière un livre. L'écran dit la règle en clair
// (`EN_CLAIR_*`) ; chaque verbatim se lit sous un livre (`LegalBadge`, son
// `extrait`), et les sources du diagnostic sous UN livre (`Textes`). La
// doublure rend chaque livre dans une balise à part : on y cherche le texte
// ENTIER, et on vérifie qu'il n'est PLUS lu hors d'un livre.]

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import {
  AIDE_DUREE_HEURES,
  CHAPITRE_R4512,
  CONSTAT_R4512_1,
  CONSTAT_R4512_9,
  CONSTAT_R4512_11,
  CONSTAT_R4512_12,
  EN_CLAIR_ECRIT,
  EN_CLAIR_R4463_8,
  EN_CLAIR_R4512_1,
  EN_CLAIR_R4512_2,
  EN_CLAIR_R4512_2_MOMENT,
  EN_CLAIR_R4512_7_EN_COURS,
  EN_CLAIR_R4512_9,
  EN_CLAIR_R4512_11,
  EN_CLAIR_R4512_12,
  EN_CLAIR_R4512_12_SI_ECRIT,
  EXTRAIT_R4512_12,
  FAIT_DUREE_NON_RENSEIGNEE,
  R4463_8,
  R4512_1,
  R4512_2,
  R4512_7_1_EN_COURS,
  R4512_9,
  R4512_11,
  R4512_12_1,
  SENS_R4512_6,
  SENS_R4512_7,
  URL_R4463_8,
  URL_R4512_1,
  URL_R4512_2,
  URL_R4512_6,
  URL_R4512_7,
  URL_R4512_9,
  URL_R4512_11,
  URL_R4512_12,
  RAISON_TRAVAUX_DANGEREUX,
  raisonDureeEstimee,
} from "@/lib/plan-prevention/annonces-plan";
import {
  CHAPEAU_R4512_8,
  RUBRIQUES_R4512_8,
  TEXTE_R4512_8,
  URL_R4512_8,
} from "@/lib/plan-prevention/contenu-r4512-8";

// Le livre réel ne rend son contenu qu'une fois déplié. Doublure : chaque
// livre rend sa référence, son lien, son extrait et son complément dans une
// balise `rojer-livre` ; `Textes` les range dans une `rojer-textes`. Le texte
// « visible » est la page sans ces balises.
vi.mock("@/components/ui-kit/LegalBadge", () => ({
  LegalBadge: ({
    reference,
    href,
    extrait,
    children,
  }: {
    reference: string;
    href?: string;
    extrait?: string;
    children?: ReactNode;
  }) =>
    createElement(
      "rojer-livre",
      { "data-pastille": reference, href },
      `[${reference}]`,
      extrait ? ` « ${extrait} » ` : null,
      children,
    ),
  Textes: ({ children, libelle = "Textes" }: { children: ReactNode; libelle?: string }) =>
    createElement("rojer-textes", { "data-livre": libelle }, children),
  ReferenceSansLien: ({ reference }: { reference: string }) =>
    createElement("span", null, reference),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {} }),
  usePathname: () => "/",
  notFound: () => {
    throw new Error("notFound");
  },
}));
vi.mock("@/lib/plan-prevention/actions", () => ({
  creerPlanPrevention: async () => ({ status: "idle" }),
  cloturerPlan: async () => {},
  supprimerPlan: async () => {},
  noterInformationInspection: async () => ({ status: "idle" }),
  noterHeuresRevisees: async () => ({ status: "idle" }),
  modifierPlanPrevention: async () => ({ status: "idle" }),
}));
vi.mock("@/components/signatures/SignerDepuisMonCompte", () => ({
  SignerDepuisMonCompte: () => null,
}));
vi.mock("@/components/signatures/DemanderSignatureForm", () => ({
  DemanderSignatureForm: () => null,
}));
vi.mock("@/components/plan-prevention/PlanActionsButtons", () => ({
  BoutonCloturer: () => null,
  BoutonSupprimerPlan: () => null,
}));
const planCourant: { valeur: Record<string, unknown> | null } = { valeur: null };
vi.mock("@/lib/plan-prevention/queries", () => ({
  getPlanPrevention: async () => planCourant.valeur,
}));

/** Le texte lu, entités décodées, balises retirées, espaces tassés. */
function texte(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;| /g, " ")
    .replace(/\s+/g, " ");
}
/** Le même texte, sans les espaces de part et d'autre de la ponctuation que JSX découpe. */
const contient = (lu: string, attendu: string) =>
  lu.replace(/\s+/g, " ").includes(attendu.replace(/\s+/g, " "));

/** Ce qui se lit sans rien déplier : la page, livres retirés. */
const visible = (html: string) =>
  texte(
    html
      .replace(/<rojer-textes[\s\S]*?<\/rojer-textes>/g, " ")
      .replace(/<rojer-livre[\s\S]*?<\/rojer-livre>/g, " "),
  );

const echapper = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Les livres de cette référence, chacun avec son lien et son texte déplié. */
function livres(html: string, ref: string) {
  const motif = new RegExp(
    `<rojer-livre data-pastille="Art\\. ${echapper(ref)} CT"(?: href="([^"]*)")?>([\\s\\S]*?)</rojer-livre>`,
    "g",
  );
  return [...html.matchAll(motif)].map((m) => ({ href: m[1], lu: texte(m[2]) }));
}

/** Un livre de cette référence, avec ce lien, qui porte ce texte entier. */
const livrePorte = (html: string, ref: string, href: string, t: string) =>
  livres(html, ref).some((l) => l.href === href && contient(l.lu, t));

/** Le contenu du livre commun (`Textes`), s'il y en a exactement un. */
function livreCommun(html: string): string {
  const tous = [...html.matchAll(/<rojer-textes[^>]*>([\s\S]*?)<\/rojer-textes>/g)];
  expect(tous.length).toBe(1);
  return tous[0][1];
}

async function rendreFiche(plan: { dureeHeuresEstimee: number | null; travauxDangereux: boolean }) {
  planCourant.valeur = {
    id: "p1",
    numero: 1,
    statut: "valide",
    entrepriseExterieureRaison: "Plomberie Test",
    entrepriseExterieureSiret: null,
    efChefNom: "Chef EE",
    efChefEmail: "ee@example.invalid",
    efEffectifIntervenant: 2,
    euChefNom: "Chef EU",
    euChefFonction: null,
    dateDebut: new Date("2026-10-01T08:00:00Z"),
    dateFin: new Date("2026-10-02T17:00:00Z"),
    lieux: "Cuisine",
    naturesTravaux: "Remplacement d'un siphon",
    inspectionDate: null,
    inspectionParticipants: null,
    lignes: [],
    phasesDangereuses: [],
    adaptationMateriels: null,
    instructionsTravailleurs: null,
    organisationSecours: null,
    participationCroisee: null,
    signatures: [],
    ...plan,
  };
  const { default: Page } = await import(
    "@/app/etablissements/[id]/plan-prevention/[planId]/page"
  );
  const element = await Page({
    params: Promise.resolve({ id: "e1", planId: "p1" }),
    searchParams: Promise.resolve({}),
  });
  const html = renderToStaticMarkup(element);
  return { html, lu: visible(html) };
}

/** Article, lien, et le verbatim que son livre porte. */
const SOUS_LIVRE_FICHE: [string, string, string][] = [
  ["R. 4512-9", URL_R4512_9, R4512_9],
  ["R. 4512-11", URL_R4512_11, R4512_11],
  ["R. 4463-8", URL_R4463_8, R4463_8],
  ["R. 4512-1", URL_R4512_1, R4512_1],
  ["R. 4512-1", URL_R4512_1, CHAPITRE_R4512],
  ["R. 4512-7", URL_R4512_7, R4512_7_1_EN_COURS],
  ["R. 4512-8", URL_R4512_8, TEXTE_R4512_8],
];

describe("fiche du plan : en clair à l'écran, le texte sous le livre, dans les trois états de l'écrit", () => {
  const TOUJOURS: [string, string][] = [
    ["R. 4512-9 en clair", EN_CLAIR_R4512_9],
    ["constat R. 4512-9", CONSTAT_R4512_9],
    ["R. 4512-11 en clair", EN_CLAIR_R4512_11],
    ["constat R. 4512-11", CONSTAT_R4512_11],
    ["R. 4463-8 en clair", EN_CLAIR_R4463_8],
    ["R. 4512-1 en clair", EN_CLAIR_R4512_1],
    ["constat R. 4512-1", CONSTAT_R4512_1],
    ["R. 4512-7 en cours, en clair", EN_CLAIR_R4512_7_EN_COURS],
  ];

  it.each([
    { nom: "obligatoire", plan: { dureeHeuresEstimee: 450, travauxDangereux: false }, cite: true, fait: false },
    { nom: "indéterminé", plan: { dureeHeuresEstimee: null, travauxDangereux: false }, cite: true, fait: true },
    { nom: "non imposé", plan: { dureeHeuresEstimee: 30, travauxDangereux: false }, cite: false, fait: false },
  ])("$nom", async ({ nom, plan, cite, fait }) => {
    const { html, lu } = await rendreFiche(plan);
    for (const [n, t] of TOUJOURS) expect(contient(lu, t), n).toBe(true);
    for (const [ref, href, t] of SOUS_LIVRE_FICHE) {
      expect(livrePorte(html, ref, href, t), `${ref} sous son livre`).toBe(true);
      expect(contient(lu, t), `${ref} hors du livre`).toBe(false);
    }

    // R. 4512-12 : en clair (sous sa condition dans l'indéterminé), le
    // constat, et l'article entier sous son livre — ou rien.
    expect(livrePorte(html, "R. 4512-12", URL_R4512_12, EXTRAIT_R4512_12)).toBe(cite);
    expect(contient(lu, CONSTAT_R4512_12)).toBe(cite);
    expect(contient(lu, EN_CLAIR_R4512_12)).toBe(nom === "obligatoire");
    expect(contient(lu, EN_CLAIR_R4512_12_SI_ECRIT)).toBe(nom === "indéterminé");
    expect(contient(lu, R4512_12_1)).toBe(false);
    expect(contient(lu, FAIT_DUREE_NON_RENSEIGNEE)).toBe(fait);
    // Le titre neutre : rien qui situe le 2° dans le temps.
    expect(lu).not.toMatch(/pendant les travaux/i);
  });

  it("écrit obligatoire : les raisons disent le fait saisi, R. 4512-7 sous le livre de la carte", async () => {
    const { html, lu } = await rendreFiche({ dureeHeuresEstimee: 450, travauxDangereux: true });
    const debut = lu.indexOf("Pourquoi l'écrit est obligatoire");
    expect(debut).toBeGreaterThan(-1);
    for (const r of [raisonDureeEstimee(450), RAISON_TRAVAUX_DANGEREUX])
      expect(contient(lu, r), r).toBe(true);
    // Plus de citation dans la carte : le texte est sous la pastille.
    const carte = lu.slice(debut, lu.indexOf("Inspection du travail", debut));
    expect(carte).not.toMatch(/«|»|\bArt\./);
    expect(livrePorte(html, "R. 4512-7", URL_R4512_7, SENS_R4512_7)).toBe(true);
    expect(contient(lu, SENS_R4512_7)).toBe(false);
  });

  it("sans date d'inspection : le moment en clair, R. 4512-2 entier sous le livre, sans « obligatoire »", async () => {
    // C40, suite : « obligatoire avant le démarrage des travaux (art.
    // R. 4512-2 CT) » prêtait à R. 4512-2 le moment de R. 4512-6.
    const { html, lu } = await rendreFiche({ dureeHeuresEstimee: null, travauxDangereux: false });
    expect(contient(lu, "Aucune date d'inspection commune enregistrée.")).toBe(true);
    expect(contient(lu, EN_CLAIR_R4512_2_MOMENT)).toBe(true);
    expect(livrePorte(html, "R. 4512-2", URL_R4512_2, R4512_2)).toBe(true);
    expect(lu).not.toMatch(/obligatoire avant le démarrage/i);
  });

  it("les rubriques vides de R. 4512-8 ne recopient plus leur alinéa à l'écran", async () => {
    const { lu } = await rendreFiche({ dureeHeuresEstimee: 30, travauxDangereux: false });
    for (const r of RUBRIQUES_R4512_8) {
      expect(contient(lu, `${r.numero}° ${r.titre}`), r.titre).toBe(true);
      expect(contient(lu, `« ${r.verbatim}`), r.titre).toBe(false);
    }
  });

  it("R. 4512-1 n'est pas rangé parmi ce que d'autres articles « demandent au plan »", async () => {
    // Borné par ce que la carte contient, du titre jusqu'à la fin de sa
    // liste (contre-lecture du 2026-09-26).
    const { html } = await rendreFiche({ dureeHeuresEstimee: 30, travauxDangereux: false });
    const debut = html.indexOf("Ce que d&#x27;autres articles demandent au plan");
    expect(debut).toBeGreaterThanOrEqual(0);
    const fin = html.indexOf("</ul>", debut);
    expect(fin).toBeGreaterThan(debut);
    const carte = html.slice(debut, fin);
    for (const t of [EN_CLAIR_R4512_9, EN_CLAIR_R4512_11, EN_CLAIR_R4463_8])
      expect(contient(visible(carte), t)).toBe(true);
    for (const [ref, href, t] of [
      ["R. 4512-9", URL_R4512_9, R4512_9],
      ["R. 4512-11", URL_R4512_11, R4512_11],
      ["R. 4463-8", URL_R4463_8, R4463_8],
    ]) expect(livrePorte(carte, ref, href, t), ref).toBe(true);
    expect(carte).not.toContain('data-pastille="Art. R. 4512-1 CT"');
    expect(contient(texte(carte), EN_CLAIR_R4512_1)).toBe(false);
    // Et il reste dit ailleurs sur la fiche.
    expect(livrePorte(html, "R. 4512-1", URL_R4512_1, R4512_1)).toBe(true);
  });
});

describe("formulaire : ce qui s'y lit au premier affichage", async () => {
  const { FormulairePlanPrevention } = await import("./FormulairePlanPrevention");
  const html = renderToStaticMarkup(
    <FormulairePlanPrevention etablissementId="e1" prestataires={[]} />,
  );
  const lu = visible(html);

  it.each([
    ["R. 4512-1 en clair", EN_CLAIR_R4512_1],
    ["constat R. 4512-1", CONSTAT_R4512_1],
    ["R. 4512-2 en clair", EN_CLAIR_R4512_2],
    ["R. 4463-8 en clair", EN_CLAIR_R4463_8],
    ["R. 4512-9 en clair", EN_CLAIR_R4512_9],
    ["constat R. 4512-9", CONSTAT_R4512_9],
    ["R. 4512-11 en clair", EN_CLAIR_R4512_11],
    ["constat R. 4512-11", CONSTAT_R4512_11],
    ["aide de la durée", AIDE_DUREE_HEURES],
  ])("%s, à l'écran", (_nom, t) => {
    expect(contient(lu, t)).toBe(true);
  });

  it.each([
    ["R. 4512-1", URL_R4512_1, R4512_1],
    ["R. 4512-1", URL_R4512_1, CHAPITRE_R4512],
    ["R. 4512-2", URL_R4512_2, R4512_2],
    ["R. 4463-8", URL_R4463_8, R4463_8],
    ["R. 4512-9", URL_R4512_9, R4512_9],
    ["R. 4512-11", URL_R4512_11, R4512_11],
    ["R. 4512-8", URL_R4512_8, TEXTE_R4512_8],
  ])("%s : entier sous son livre, et plus à l'écran", (ref, href, t) => {
    expect(livrePorte(html, ref, href, t)).toBe(true);
    expect(contient(lu, t)).toBe(false);
  });

  it("R. 4512-8 : ni le chapeau ni les alinéas ne sont recopiés sous les champs", () => {
    expect(contient(lu, CHAPEAU_R4512_8)).toBe(false);
    for (const r of RUBRIQUES_R4512_8) expect(contient(lu, `« ${r.verbatim}`), r.titre).toBe(false);
  });

  it("l'aide de la durée ne redit plus le seuil", () => {
    expect(lu).not.toMatch(/Seuil R\. 4512-7/);
  });

  it("la case des travaux dangereux : l'arrêté daté en toutes lettres, exemples tirés de sa liste", () => {
    // C40, suite. Chaque exemple entre guillemets de la case est un point de
    // l'article 1er de l'arrêté du 19 mars 1993, tel que le corpus le porte.
    // [2026-10-28 : « (art. R. 4512-7, 2°) » retiré de la case — l'article
    // s'ouvre sous le livre du diagnostic.]
    expect(contient(lu, "liste des travaux dangereux de l'arrêté du 19 mars 1993 ou, pour les travaux agricoles, de l'arrêté du ministre chargé de l'agriculture")).toBe(true);
    expect(lu).not.toContain("19-03-1993");
    const liste = (
      indexArticlesParRef().get("Arrêté 1993-03-19 art. 1er")?.article.citationCle ?? ""
    ).replace(/\s+/g, " ");
    expect(liste.length).toBeGreaterThan(0);
    const debut = lu.indexOf("Parmi les vingt et un points de la liste");
    expect(debut).toBeGreaterThan(-1);
    const bloc = lu.slice(debut, lu.indexOf("…", debut));
    const exemples = [...bloc.matchAll(/«\s*([^»]+?)\s*»/g)].map((m) => m[1].replace(/\s+/g, " "));
    expect(exemples.length).toBe(4);
    for (const e of exemples) expect(liste, e).toContain(e);
  });

  // Aucune durée saisie au premier affichage : l'état est indéterminé, et
  // l'écran le dit au lieu de conclure « non imposé ».
  it("durée non saisie : le titre, la phrase en clair, et pas de conclusion sur le seuil", () => {
    expect(contient(lu, "Plan dû, durée non renseignée")).toBe(true);
    expect(contient(lu, EN_CLAIR_ECRIT.indetermine)).toBe(true);
    expect(lu).not.toMatch(/écrit non imposé|pas atteintes ici/);
    // Plus aucune citation dans le bloc lui-même.
    expect(contient(lu, EXTRAIT_R4512_12)).toBe(false);
    expect(contient(lu, SENS_R4512_7)).toBe(false);
  });

  it("le diagnostic : UN livre, qui porte R. 4512-7, -2, -6 et R. 4512-12 entier", () => {
    // Deux livres « Texte » côte à côte (R. 4512-7 et R. 4512-12) ne se
    // distinguaient pas : un seul, `Textes`.
    const commun = livreCommun(html);
    expect(livrePorte(commun, "R. 4512-7", URL_R4512_7, SENS_R4512_7)).toBe(true);
    expect(livrePorte(commun, "R. 4512-2", URL_R4512_2, R4512_2)).toBe(true);
    expect(livrePorte(commun, "R. 4512-6", URL_R4512_6, SENS_R4512_6)).toBe(true);
    expect(livrePorte(commun, "R. 4512-12", URL_R4512_12, EXTRAIT_R4512_12)).toBe(true);
    // Et aucun livre isolé de R. 4512-7 ou R. 4512-12 hors du livre commun.
    const horsCommun = html.replace(/<rojer-textes[\s\S]*?<\/rojer-textes>/g, "");
    expect(livres(horsCommun, "R. 4512-7")).toEqual([]);
    expect(livres(horsCommun, "R. 4512-12")).toEqual([]);
  });
});

describe("formulaire rouvert, écrit obligatoire : les raisons sans citation", async () => {
  const { FormulairePlanPrevention } = await import("./FormulairePlanPrevention");
  const html = renderToStaticMarkup(
    <FormulairePlanPrevention
      etablissementId="e1"
      prestataires={[]}
      plan={{
        id: "p1",
        prestataireId: null,
        entrepriseExterieureRaison: "Plomberie Test",
        entrepriseExterieureSiret: null,
        efChefNom: "Chef EE",
        efChefEmail: "ee@example.invalid",
        efEffectifIntervenant: 2,
        euChefNom: "Chef EU",
        euChefFonction: null,
        dateDebut: "2026-10-01T08:00",
        dateFin: "2026-10-02T17:00",
        dureeHeuresEstimee: 450,
        lieux: "Cuisine",
        batimentId: null,
        naturesTravaux: "Remplacement d'un siphon",
        travauxDangereux: true,
        inspectionDate: null,
        inspectionParticipants: null,
        lignes: [],
        phases: [],
        adaptationMateriels: null,
        instructionsTravailleurs: null,
        organisationSecours: null,
        participationCroisee: null,
      }}
    />,
  );
  const lu = visible(html);

  it("le titre, la phrase en clair, puis les deux faits saisis — sans guillemets ni article", () => {
    const debut = lu.indexOf("Plan écrit obligatoire");
    expect(debut).toBeGreaterThan(-1);
    const fin = lu.indexOf(RAISON_TRAVAUX_DANGEREUX, debut) + RAISON_TRAVAUX_DANGEREUX.length;
    const bloc = lu.slice(debut, fin);
    expect(contient(bloc, EN_CLAIR_ECRIT.obligatoire)).toBe(true);
    expect(contient(bloc, raisonDureeEstimee(450))).toBe(true);
    expect(bloc).not.toMatch(/«|»|\bArt\.|R\. \d{4}/);
    expect(livrePorte(livreCommun(html), "R. 4512-7", URL_R4512_7, SENS_R4512_7)).toBe(true);
  });
});
