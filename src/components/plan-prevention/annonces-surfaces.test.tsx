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

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CHAPITRE_R4512,
  CONSTAT_R4512_1,
  CONSTAT_R4512_9,
  CONSTAT_R4512_11,
  CONSTAT_R4512_12,
  EXTRAIT_R4512_12,
  FAIT_DUREE_NON_RENSEIGNEE,
  R4463_8,
  R4512_1,
  R4512_9,
  R4512_11,
  R4512_12_1,
  R4512_12_2,
  R4512_12_CHAPEAU,
  URL_R4463_8,
  URL_R4512_1,
  URL_R4512_9,
  URL_R4512_11,
  URL_R4512_12,
} from "@/lib/plan-prevention/annonces-plan";

// La pastille réelle ne rend son lien qu'une fois dépliée. Doublure : elle
// rend sa référence et son lien, pour qu'on puisse vérifier les deux, et leur
// place dans le flux.
vi.mock("@/components/ui-kit/LegalBadge", () => ({
  LegalBadge: ({ reference, href }: { reference: string; href?: string }) => (
    <a data-pastille={reference} href={href}>
      {`[${reference}]`}
    </a>
  ),
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
    .replace(/&nbsp;| /g, " ")
    .replace(/\s+/g, " ");
}
/** Le même texte, sans les espaces de part et d'autre de la ponctuation que JSX découpe. */
const contient = (lu: string, attendu: string) =>
  lu.replace(/\s+/g, " ").includes(attendu.replace(/\s+/g, " "));

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
  return { html, lu: texte(html) };
}

const pastille = (html: string, ref: string, href: string) =>
  html.includes(`data-pastille="Art. ${ref} CT" href="${href}"`);

describe("fiche du plan : ce qui s'y lit, dans les trois états de l'écrit", () => {
  const TOUJOURS: [string, string][] = [
    ["R. 4512-9", R4512_9],
    ["constat R. 4512-9", CONSTAT_R4512_9],
    ["R. 4512-11", R4512_11],
    ["constat R. 4512-11", CONSTAT_R4512_11],
    ["R. 4463-8", R4463_8],
    ["R. 4512-1", R4512_1],
    ["antécédent du chapitre", CHAPITRE_R4512],
    ["constat R. 4512-1", CONSTAT_R4512_1],
  ];
  const R4512_12_ENTIER = [
    `« ${R4512_12_CHAPEAU} :`,
    `1° ${R4512_12_1} ;`,
    `2° ${R4512_12_2}. »`,
    CONSTAT_R4512_12,
  ];

  it.each([
    { nom: "obligatoire", plan: { dureeHeuresEstimee: 450, travauxDangereux: false }, cite: true, fait: false },
    { nom: "indéterminé", plan: { dureeHeuresEstimee: null, travauxDangereux: false }, cite: true, fait: true },
    { nom: "non imposé", plan: { dureeHeuresEstimee: 30, travauxDangereux: false }, cite: false, fait: false },
  ])("$nom", async ({ plan, cite, fait }) => {
    const { html, lu } = await rendreFiche(plan);
    for (const [nom, t] of TOUJOURS) expect(contient(lu, t), nom).toBe(true);
    for (const [ref, href] of [
      ["R. 4512-9", URL_R4512_9],
      ["R. 4512-11", URL_R4512_11],
      ["R. 4463-8", URL_R4463_8],
      ["R. 4512-1", URL_R4512_1],
    ]) expect(pastille(html, ref, href), ref).toBe(true);

    for (const t of R4512_12_ENTIER) expect(contient(lu, t), t).toBe(cite);
    expect(pastille(html, "R. 4512-12", URL_R4512_12)).toBe(cite);
    expect(contient(lu, FAIT_DUREE_NON_RENSEIGNEE)).toBe(fait);
    // Le titre neutre : le numéro, rien qui situe le 2° dans le temps.
    expect(lu).not.toMatch(/pendant les travaux/i);
  });

  it("la pastille précède la citation, article par article", async () => {
    const { html } = await rendreFiche({ dureeHeuresEstimee: null, travauxDangereux: false });
    const lu = texte(html);
    for (const [ref, t] of [
      ["R. 4512-9", R4512_9],
      ["R. 4512-11", R4512_11],
      ["R. 4463-8", R4463_8],
      ["R. 4512-1", R4512_1],
      ["R. 4512-12", R4512_12_CHAPEAU],
    ]) {
      const iPastille = lu.indexOf(`[Art. ${ref} CT]`);
      const iTexte = lu.indexOf(t.slice(0, 50));
      expect(iPastille, ref).toBeGreaterThanOrEqual(0);
      expect(iPastille < iTexte, ref).toBe(true);
    }
  });

  it("R. 4512-1 n'est pas rangé parmi ce que d'autres articles « demandent au plan »", async () => {
    // Borné par ce que la carte contient, pas par un libellé qui se répète :
    // la première version s'arrêtait sur « Art. R. 4512-1 » — que porte aussi
    // la pastille de R. 4512-1 elle-même — et restait verte quand on
    // rangeait l'article dans la carte (contre-lecture du 2026-09-26). On lit
    // donc le HTML de la carte, du titre jusqu'à la fin de sa liste.
    const { html } = await rendreFiche({ dureeHeuresEstimee: 30, travauxDangereux: false });
    const debut = html.indexOf("Ce que d&#x27;autres articles demandent au plan");
    expect(debut).toBeGreaterThanOrEqual(0);
    const fin = html.indexOf("</ul>", debut);
    expect(fin).toBeGreaterThan(debut);
    const carte = texte(html.slice(debut, fin));
    for (const t of [R4512_9, R4512_11, R4463_8]) expect(contient(carte, t)).toBe(true);
    expect(carte).not.toContain("[Art. R. 4512-1 CT]");
    expect(carte).not.toContain(R4512_1.slice(0, 50));
    // Et il reste dit ailleurs sur la fiche.
    expect(contient(texte(html), R4512_1)).toBe(true);
  });
});

describe("formulaire : ce qui s'y lit au premier affichage", async () => {
  const { FormulairePlanPrevention } = await import("./FormulairePlanPrevention");
  const html = renderToStaticMarkup(
    <FormulairePlanPrevention etablissementId="e1" prestataires={[]} />,
  );
  const lu = texte(html);

  it.each([
    ["R. 4512-1", R4512_1],
    ["antécédent du chapitre", CHAPITRE_R4512],
    ["constat R. 4512-1", CONSTAT_R4512_1],
    ["R. 4463-8", R4463_8],
    ["R. 4512-9", R4512_9],
    ["constat R. 4512-9", CONSTAT_R4512_9],
    ["R. 4512-11", R4512_11],
    ["constat R. 4512-11", CONSTAT_R4512_11],
  ])("%s, entier", (_nom, t) => {
    expect(contient(lu, t)).toBe(true);
  });

  it.each([
    ["R. 4512-1", URL_R4512_1],
    ["R. 4463-8", URL_R4463_8],
    ["R. 4512-9", URL_R4512_9],
    ["R. 4512-11", URL_R4512_11],
    ["R. 4512-12", URL_R4512_12],
  ])("pastille %s, avec son lien", (ref, href) => {
    expect(pastille(html, ref, href)).toBe(true);
  });

  // Aucune durée saisie au premier affichage : l'état est indéterminé, et
  // l'écran le dit au lieu de conclure « non imposé ».
  it("durée non saisie : le fait, R. 4512-12 entier, et pas de conclusion sur le seuil", () => {
    expect(contient(lu, "Plan dû, durée non renseignée")).toBe(true);
    expect(contient(lu, FAIT_DUREE_NON_RENSEIGNEE)).toBe(true);
    expect(contient(lu, `« ${EXTRAIT_R4512_12} »`)).toBe(true);
    expect(lu).not.toMatch(/écrit non imposé|pas atteintes ici/);
  });
});
