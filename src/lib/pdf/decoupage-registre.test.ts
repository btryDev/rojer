// Les pages du corps du registre (revues de la PR #286, 2026-11-10) : une
// fiche longue s'étend sur plusieurs pages sans perdre une ligne, aucune page
// ne dépasse le paquet, et les petites sections partagent une feuille.

import { describe, expect, it } from "vitest";
import { lignesDeLAttente, pagesDuRegistre, type PageRegistre } from "./decoupage-registre";
import type { RegistreData } from "./RegistreDocument";

const base: RegistreData = {
  entreprise: "E",
  etablissement: "E",
  adresse: "A",
  genereLe: new Date("2026-11-10T10:00:00Z"),
  calendrier: { etat: "a_jour" },
  regime: { estERP: true, estIGH: false },
  inventaire: null,
  bilan: { dues: 0, outillees: 0, faites: 0, aRemplir: 0, tenuesAilleurs: 0, nonOutillees: 0 },
  parties: [],
  rapports: [],
  verifsEnAttente: [],
};

/** Une fiche journal de `n` lignes. */
const journal = (id: string, n: number) => ({
  id,
  titre: `Journal ${id}`,
  attendu: "",
  raisons: [],
  aConfirmer: [],
  etat: "",
  ton: "faite" as const,
  misAJourLe: null,
  colonnes: ["Date", "Fait"],
  lignes: Array.from({ length: n }, (_, i) => [`${i}`, `ligne ${i}`]),
});

const attente = (i: number, lourde = false) => ({
  id: `v${i}`,
  datePrevue: new Date(Date.UTC(2027, 0, 1)),
  echeanceConnue: true,
  statut: "a_venir",
  libelleObligation: "Contrôle",
  equipementLibelle: "Extincteur",
  domaine: null,
  contractuelle: lourde,
  aConfirmer: lourde ? ["À confirmer."] : [],
  rythmeRetenu: lourde ? "1 fois par an" : null,
  pourInformation: false,
}) as unknown as RegistreData["verifsEnAttente"][number];

const genres = (pages: PageRegistre[]) => pages.map((p) => `${p.genre}:${p.poids}`);

describe("pagesDuRegistre", () => {
  it("une fiche de 250 lignes : trois morceaux, « suite » ensuite, le pied sur le dernier, rien de perdu", () => {
    const data = {
      ...base,
      parties: [{ id: "4", titre: "Événements", fiches: [journal("j", 250), journal("k", 3)] }],
    } as unknown as RegistreData;
    const pages = pagesDuRegistre(data, 100);
    const fiches = pages.filter((p): p is Extract<PageRegistre, { genre: "fiches" }> => p.genre === "fiches");
    const morceaux = fiches.flatMap((p) => p.morceaux);
    expect(morceaux.map((m) => [m.fiche.id, m.poids, m.suite, m.dernier, m.ouvrePartie])).toEqual([
      ["j", 100, false, false, true],
      ["j", 100, true, false, false],
      ["j", 50, true, true, false],
      ["k", 3, false, true, false],
    ]);
    // Toutes les lignes, dans l'ordre.
    const lignes = morceaux.filter((m) => m.fiche.id === "j").flatMap((m) => m.fiche.lignes!);
    expect(lignes).toEqual(journal("j", 250).lignes);
    // Aucune page au-delà du paquet.
    expect(Math.max(...fiches.map((p) => p.poids))).toBeLessThanOrEqual(100);
  });

  it("un petit registre : l'index vide, les attentes et la tenue sur une seule feuille", () => {
    const pages = pagesDuRegistre({ ...base, verifsEnAttente: [attente(1), attente(2)] }, 100);
    expect(genres(pages)).toEqual(["index:2"]);
    const index = pages[0] as Extract<PageRegistre, { genre: "index" }>;
    expect(index.feuille).toEqual([]);
    expect(index.attente).toMatchObject({ rang: 0, dernier: true });
  });

  it("sans rien en attente, le fait de l'attente vide et la tenue rejoignent l'index", () => {
    const pages = pagesDuRegistre(base, 100);
    expect(genres(pages)).toEqual(["index:0"]);
    expect((pages[0] as Extract<PageRegistre, { genre: "index" }>).attente).toMatchObject({ paquet: [], dernier: true });
  });

  it("une page d'index pleine : les attentes partent sur la suivante", () => {
    const rapports = Array.from({ length: 100 }, (_, i) => ({
      id: `r${i}`,
      dateRapport: new Date(Date.UTC(2026, 5, 1)),
      points: [],
      domaine: null,
    })) as unknown as RegistreData["rapports"];
    const pages = pagesDuRegistre({ ...base, rapports, verifsEnAttente: [attente(1)] }, 100);
    expect(genres(pages)).toEqual(["index:100", "attente:1"]);
  });

  it("égalité : un index de 96 lignes et une attente de 4 font une seule page de 100", () => {
    const rapports = Array.from({ length: 96 }, (_, i) => ({
      id: `r${i}`,
      dateRapport: new Date(Date.UTC(2026, 5, 1)),
      points: [],
      domaine: null,
    })) as unknown as RegistreData["rapports"];
    const pages = pagesDuRegistre({ ...base, rapports, verifsEnAttente: [attente(1, true)] }, 100);
    expect(genres(pages)).toEqual(["index:100"]);
  });

  it("limite connue : un rapport seul de 150 points fait une page de 151 lignes (rien ne borne les points)", () => {
    const rapports = [
      {
        id: "r",
        dateRapport: new Date(Date.UTC(2026, 5, 1)),
        points: Array.from({ length: 150 }, (_, i) => ({ id: `p${i}` })),
        domaine: null,
      },
    ] as unknown as RegistreData["rapports"];
    // L'index déborde : la section d'attente (vide) et la tenue partent sur la
    // page suivante.
    expect(genres(pagesDuRegistre({ ...base, rapports }, 100))).toEqual(["index:151", "attente:0"]);
  });

  it("le poids d'une attente : sa ligne, le marquage contractuel, le rythme, « À confirmer »", () => {
    expect(lignesDeLAttente(attente(1))).toBe(1);
    expect(lignesDeLAttente(attente(1, true))).toBe(4);
  });
});
