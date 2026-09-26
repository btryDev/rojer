import { describe, expect, it } from "vitest";
import { genererReadme } from "./readme-controle";

const base: Parameters<typeof genererReadme>[0] = {
  raisonSociale: "Btry",
  etablissement: "Le Comptoir",
  adresse: "1 rue des Lilas",
  dateNow: "26/09/2026",
  duerpNumeroVersion: null,
  aDuerpPdf: false,
  aRegistreAccessibilite: false,
  nbPrestataires: 0,
  nbPermisFeu: 0,
  nbPlansPrevention: 0,
  aCarnetSanitaire: false,
  nbEcheancesContractuelles: 0,
  etatDuerp: null,
  retards: { nbEnRetard: 0, calendrier: { etat: "a_jour" }, aucunEquipement: false },
  avertissementCalendrier: null,
  inventaire: null,
  presents: new Set(["01_Dossier_conformite.pdf", "03_Registre_securite.pdf", "04_Plan_actions.pdf"]),
  echecs: new Map(),
  piecesPrestatairesManquantes: 0,
};

const INVENTAIRE = {
  axe: "inventaire" as const,
  motif: "Aucun équipement en service n'est déclaré pour cet établissement.",
  consequence: "Aucune vérification attachée à un équipement ne peut donc figurer au calendrier ni au registre.",
};

/** Le README recoupé à 60 colonnes : on recolle les lignes pour chercher. */
const aplati = (t: string) => t.replace(/\n /g, " ");

describe("le README du ZIP dit « aucun équipement déclaré » (§ 15)", () => {
  it("l'écrit en tête, avant le contenu du dossier", () => {
    const t = aplati(genererReadme({ ...base, inventaire: INVENTAIRE }));
    const fait = t.indexOf(INVENTAIRE.motif);
    expect(fait).toBeGreaterThan(-1);
    expect(t).toContain(INVENTAIRE.consequence);
    expect(fait).toBeLessThan(t.indexOf("CONTENU DU DOSSIER"));
  });

  it("n'écrit rien quand l'inventaire n'est pas vide", () => {
    const t = genererReadme(base);
    expect(t).not.toContain("Aucun équipement");
    expect(t).not.toContain("À LIRE AVANT LE RESTE");
  });

  it("tient les deux faits ensemble sous le même titre", () => {
    const t = aplati(
      genererReadme({
        ...base,
        avertissementCalendrier: "Le calendrier n'a pas encore été calculé.",
        inventaire: INVENTAIRE,
      }),
    );
    expect(t.match(/À LIRE AVANT LE RESTE/g)).toHaveLength(1);
    expect(t).toContain("Le calendrier n'a pas encore été calculé.");
    expect(t).toContain(INVENTAIRE.motif);
  });
});

describe("le README dit les deux cas de l'écrit de R. 4512-7", () => {
  // « EE ≥ 400 h » taisait le 2° : travaux dangereux, quelle que soit la
  // durée prévisible de l'opération (contre-lecture du 2026-09-26).
  it("1° et 2°, chacun dans ses mots", () => {
    const t = aplati(genererReadme(base)).replace(/\s+/g, " ");
    const ligne = t.slice(t.indexOf("Plans de prévention"), t.indexOf("Plans de prévention") + 400);
    expect(ligne).toContain("art. R. 4512-7");
    expect(ligne).toContain("égal au moins à 400 heures sur une période inférieure ou égale à douze mois");
    expect(ligne).toContain("travaux dangereux figurant sur une liste fixée");
    expect(ligne).toContain("quelle que soit la durée prévisible de l'opération");
    expect(t).not.toContain("EE ≥ 400 h");
  });
});

describe("le README ne décrit que ce que le ZIP contient (relecture du 2026-09-26)", () => {
  it("un DUERP dont le rendu a échoué n'est pas annoncé présent — le défaut d'origine", () => {
    // `aDuerpPdf` valait `duerpNumeroVersion !== null` : une version existait,
    // son rendu échouait, et le README annonçait « 02_DUERP_v3.pdf  Document
    // unique d'évaluation des risques ».
    const t = genererReadme({
      ...base,
      duerpNumeroVersion: 3,
      aDuerpPdf: false,
      echecs: new Map([["02_DUERP", "la génération a échoué"]]),
    });
    expect(t).toContain("02_DUERP_v3.pdf");
    expect(t).toContain("Non inclus — la génération a échoué");
    expect(t).not.toContain("Document unique d'évaluation des risques");
  });

  it("une brique absente du ZIP le dit, et dit pourquoi quand elle a échoué", () => {
    const t = genererReadme({
      ...base,
      presents: new Set(["03_Registre_securite.pdf"]),
      echecs: new Map([["01_Dossier_conformite.pdf", "la génération a échoué"]]),
    });
    expect(t).toMatch(/01_Dossier_conformite\.pdf\s+Non inclus — la génération a échoué/);
    expect(t).toMatch(/04_Plan_actions\.pdf\s+Non inclus/);
    expect(t).toMatch(/03_Registre_securite\.pdf\s+Rapports de vérifications/);
  });

  it("des pièces de prestataires non récupérées sont comptées", () => {
    const t = genererReadme({ ...base, nbPrestataires: 2, piecesPrestatairesManquantes: 1 });
    expect(t).toContain("1 pièce(s) déclarée(s) non récupérée(s)");
  });
});

describe("le cadre légal du README dit ce que les textes disent (relus le 2026-09-26)", () => {
  const t = aplati(genererReadme(base)).replace(/\s+/g, " ");

  it("les formulations d'origine ne reviennent pas", () => {
    for (const faux of [
      "Attestations URSSAF prestataires < 6 mois",
      "QR code en entrée",
      "Formation sécurité du personnel à jour",
      "R. 4226-16 et s.",
      "Maintien en conformité",
      "Responsabilité finale",
      "(conservation : art. D. 4711-3, cinq ans)",
    ])
      expect(t, faux).not.toContain(faux);
  });

  it("les seuils et les mots des textes y sont", () => {
    expect(t).toContain("5 000 euros hors taxes");
    expect(t).toContain("consultable par le public sur place");
    expect(t).toContain("« sauf dispositions particulières »");
    expect(t).toContain("deux derniers contrôles ou vérifications");
    expect(t).toContain("entretenus et vérifiés suivant une périodicité appropriée");
  });
});
