// Le registre s'imprime-t-il, quelles que soient les formes de fiche ?
//
// Le document a longtemps été deux tableaux : un extrait du calendrier. Il
// porte maintenant les quarante-neuf fiches, sous quatre formes qui ne se
// rendent pas pareil — questions/réponses, journal, contenu tenu ailleurs, et
// la fiche que rien ne recueille. Une largeur de colonne calculée à la volée
// ou une forme oubliée casse le rendu sans casser la compilation : ce test
// est le seul garde-fou qui le verrait.

import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { RegistreDocument, type RegistreData } from "./RegistreDocument";

const data: RegistreData = {
  entreprise: "Btry",
  etablissement: "Le Comptoir",
  adresse: "1 rue des Lilas",
  genereLe: new Date("2026-08-26T10:00:00Z"),
  regime: { estERP: true, estIGH: false },
  inventaire: null,
  bilan: { dues: 4, outillees: 3, faites: 1, aRemplir: 1, tenuesAilleurs: 1, nonOutillees: 1 },
  parties: [
    {
      id: "1",
      titre: "Organisation",
      fiches: [
        { id: "a", titre: "Renseignements généraux", attendu: "Raison sociale…", raisons: [], etat: "Toutes les réponses", ton: "faite", misAJourLe: new Date("2026-08-01T09:00:00Z"),
          champs: [{ libelle: "Raison sociale", valeur: "Btry" }, { libelle: "Adresse", valeur: "Non renseigné" }] },
        { id: "b", titre: "Contrôles administratifs", attendu: "Date, représentant…", raisons: [], etat: "Aucune ligne consignée", ton: "attente", misAJourLe: null,
          colonnes: ["Date", "Représentant", "Visa"], lignes: [] },
      ],
    },
    {
      id: "2.1",
      titre: "Matériel d'intervention",
      fiches: [
        { id: "c", titre: "Extincteurs", attendu: "Inventaire", raisons: [], etat: "Tenue dans vos équipements", ton: "renvoi", misAJourLe: null,
          source: "vos équipements", tenues: [{ titre: "Extincteur hall", meta: "Bât. A · Entrée" }] },
        { id: "d", titre: "Annexes", attendu: "Pièces libres", raisons: [], etat: "À tenir hors de l'outil", ton: "muet", misAJourLe: null },
      ],
    },
  ],
  rapports: [],
  verifsEnAttente: [],
};

/** Le nombre de pages d'un PDF, lu dans son catalogue d'objets. */
function nombreDePages(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

/** Une fiche journal de `n` lignes, seule dans son registre. */
function registreJournal(n: number): RegistreData {
  return {
    entreprise: "E",
    etablissement: "E",
    adresse: "A",
    genereLe: new Date("2026-01-01T00:00:00Z"),
    regime: { estERP: false, estIGH: false },
    inventaire: null,
    bilan: {
      dues: 1,
      outillees: 1,
      faites: 1,
      aRemplir: 0,
      tenuesAilleurs: 0,
      nonOutillees: 0,
    },
    parties: [
      {
        id: "4",
        titre: "Événements",
        fiches: [
          {
            id: "e",
            titre: "Comptes rendus d'incendie",
            attendu: "Date, nature, suites données.",
            raisons: [],
            etat: `${n} lignes consignées`,
            ton: "faite",
            misAJourLe: null,
            colonnes: ["Date", "Nature", "Suites"],
            lignes: Array.from({ length: n }, (_, i) => [
              "01/01/2026",
              `nature ${i}`,
              `suites ${i}`,
            ]),
          },
        ],
      },
    ],
    rapports: [],
    verifsEnAttente: [],
  };
}

describe("RegistreDocument", () => {
  it("rend un PDF non vide avec les quatre formes de fiche", async () => {
    const buf = await renderToBuffer(<RegistreDocument data={data} />);
    expect(buf.length).toBeGreaterThan(2000);
  }, 30000);

  // Le défaut que ce test empêche de revenir : `FichePdfVue` a porté
  // `wrap={false}`, et react-pdf n'imprime pas ce qui dépasse d'un bloc
  // insécable. Un journal de 400 lignes rendait alors 5 pages, un journal de
  // 1000 lignes en rendait 5 aussi. Le registre se coupait au milieu d'une
  // fiche, en silence, dans un document qu'on présente à un inspecteur.
  //
  // Le test ne compte pas des pages exactes — une marge changerait le
  // chiffre. Il vérifie que le document GRANDIT avec son contenu, ce qu'un
  // bloc tronqué ne fait jamais.
  it("pagine un long journal au lieu de le tronquer", async () => {
    const court = nombreDePages(await renderToBuffer(<RegistreDocument data={registreJournal(400)} />));
    const long = nombreDePages(await renderToBuffer(<RegistreDocument data={registreJournal(1000)} />));

    expect(court).toBeGreaterThan(5);
    expect(long).toBeGreaterThan(court * 1.5);
  }, 60000);

  // La taille du rendu, comme dans `DossierConformiteDocument.test.tsx` : le
  // texte d'un PDF react-pdf n'est pas lisible dans le fichier produit.
  const taille = async (d: RegistreData) =>
    (await renderToBuffer(<RegistreDocument data={d} />)).length;

  it("dit « aucun équipement déclaré » quand c'est le cas (§ 15)", async () => {
    const sans = await taille(data);
    const avec = await taille({
      ...data,
      inventaire: {
        axe: "inventaire",
        motif: "Aucun équipement en service n'est déclaré pour cet établissement.",
        consequence: "Aucune vérification attachée à un équipement ne peut donc figurer au registre.",
      },
    });
    expect(avec).toBeGreaterThan(sans);
  }, 30000);

  it("cite R. 143-44 à l'ERP seul, et R. 146-35 à l'IGH seul", async () => {
    const aucun = await taille({ ...data, regime: { estERP: false, estIGH: false } });
    const erp = await taille({ ...data, regime: { estERP: true, estIGH: false } });
    const igh = await taille({ ...data, regime: { estERP: false, estIGH: true } });
    expect(erp).toBeGreaterThan(aucun);
    expect(igh).toBeGreaterThan(aucun);
  }, 30000);
});
