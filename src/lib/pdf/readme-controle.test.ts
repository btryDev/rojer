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
  retards: { nbEnRetard: 0, calendrier: { etat: "a_jour" }, inventaire: null },
  avertissementCalendrier: null,
  inventaire: null,
  presents: new Set(["01_Dossier_conformite.pdf", "03_Registre_securite.pdf", "04_Plan_actions.pdf"]),
  regime: { estERP: true, estIGH: false },
  duerpLu: true,
  echecs: new Map(),
  piecesPrestatairesManquantes: 0,
  piecesPrestataires: { attestation: 0, rcPro: 0, kbis: 0 },
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
      "art. R. 4226-16 et s. Code du travail",
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

describe("contre-lecture du 2026-09-26 : ce que le README affirmait sans l'avoir", () => {
  const plat = (a: Parameters<typeof genererReadme>[0]) =>
    aplati(genererReadme(a)).replace(/\s+/g, " ");

  it("1. il ne renvoie plus à des articles que 01 ne porte pas ; il cite la liste du dossier", () => {
    const t = plat(base);
    expect(t).not.toContain("l'article de chacune est cité");
    expect(t).toContain("R. 4226-16 et s. CT (électricité), R. 4222-20 CT (aération)");
  });

  it("2. une lecture des versions en échec ne dit pas « aucune version »", () => {
    // ~~La raison injectée était « la génération a échoué »~~ : le test
    // figeait l'erreur que la route commettait (seconde contre-lecture). La
    // route note désormais « lecture des versions en échec » quand la
    // lecture a échoué, et le contenu dit la même chose que la checklist.
    const t = plat({ ...base, duerpLu: false, echecs: new Map([["02_DUERP", "lecture des versions en échec"]]) });
    expect(t).not.toContain("aucune version validée");
    expect(t).not.toContain("aucune version figée");
    expect(t).toContain("non déterminé (lecture des versions en échec)");
    expect(t).toMatch(/02_DUERP\.pdf Non inclus — lecture des versions en échec/);
    expect(t).not.toContain("génération a échoué");
  });

  it("3. un prestataire sans pièce n'est pas annoncé avec ses attestations", () => {
    const t = plat({ ...base, nbPrestataires: 1 });
    expect(t).toContain("Aucune pièce (1 prestataire(s) déclaré(s))");
    expect(t).not.toContain("RC Pro, Kbis (1)");
    // F1 : un Kbis seul ne s'annonce plus « attestations de vigilance, RC Pro, Kbis ».
    const kbisSeul = plat({ ...base, nbPrestataires: 1, piecesPrestataires: { attestation: 0, rcPro: 0, kbis: 1 } });
    const lignePrestataires = genererReadme({ ...base, nbPrestataires: 1, piecesPrestataires: { attestation: 0, rcPro: 0, kbis: 1 } })
      .split("\n")
      .find((l) => l.startsWith(" Prestataires/"))!;
    expect(kbisSeul).toContain("1 Kbis — 1 prestataire(s)");
    expect(lignePrestataires).not.toContain("vigilance");
    expect(lignePrestataires).not.toContain("RC Pro");
  });

  it("3. 05 à 08 suivent aussi ce que le ZIP contient", () => {
    const t = plat({ ...base, nbPermisFeu: 2 });
    // Compteur à 2, fichier absent : le README ne l'annonce pas.
    expect(t).not.toContain("2 permis sur 12 mois");
  });

  it("6. le renvoi à 01 ne se fait pas quand 01 n'est pas dans le ZIP", () => {
    const t = plat({
      ...base,
      presents: new Set(["03_Registre_securite.pdf"]),
      retards: { nbEnRetard: 2, calendrier: { etat: "a_jour" }, inventaire: null },
    });
    expect(t).toContain("[!] 2 vérification(s) en retard");
    expect(t).not.toContain("en retard — voir 01_Dossier_conformite.pdf");
  });

  it("10. les conseils sont dits comme tels, et « priorisés » dit le tri réel", () => {
    const t = plat(base);
    expect(t).toContain("lu en entier (conseil de Rojer)");
    expect(t).not.toContain("(10 min)");
    expect(t).not.toContain("priorisés");
    expect(t).toContain("Actions ouvertes puis en cours, chacune par échéance puis criticité");
    expect(t).toContain("Installations et dispositifs techniques et de sécurité");
  });

  it("M3. le permis de feu n'est pas dit « obligatoire » ; l'arrêté de 1993 est cité, point 21", () => {
    const t = plat(base);
    expect(t).not.toContain("est obligatoire pour tous travaux");
    expect(t).toContain("conseil de Rojer, d'après INRS ED 6030");
    expect(t).toContain("Aucun texte ne l'impose sous ce nom");
    expect(t).toContain("(art. 1er, point 21)");
    expect(t).toContain("« Travaux de soudage oxyacétylénique exigeant le recours à un permis de feu »");
  });

  it("M4, M6. les listes ne se donnent plus pour complètes", () => {
    const t = plat(base);
    expect(t).toContain("Vérifications : notamment R. 4323-23 et s. CT");
    expect(t).not.toContain("RÉFÉRENTIELS CITÉS DANS CE DOSSIER");
    expect(t).toContain("nomme lui-même les brochures INRS");
  });

  it("F4. aucune ligne du cadre légal ne dépasse 80 colonnes", () => {
    const lignes = genererReadme(base).split("\n");
    const i = lignes.findIndex((l) => l.includes("CADRE LÉGAL"));
    const cadre = lignes.slice(i, lignes.findIndex((l, k) => k > i + 2 && l.startsWith("───")));
    expect(cadre.filter((l) => l.length > 80)).toEqual([]);
  });

  it("F5. une brique 05-08 dont la lecture échoue est dite « Non incluse », pas un 500", () => {
    const t = plat({ ...base, echecs: new Map([["06_Permis_de_feu.txt", "la lecture a échoué"]]) });
    expect(t).toMatch(/06_Permis_de_feu\.txt Non inclus — la lecture a échoué/);
  });
});
