import { describe, expect, it } from "vitest";
import { CORPUS, articlesNonCouverts } from "@/lib/referentiels/corpus";
import { ADRESSE_MANQUES_ANNONCES } from "@/lib/referentiels/corpus/adresses";
import { DESCRIPTION_CATEGORIE } from "@/lib/equipements/labels";
import {
  ANNONCES,
  manquesAnnoncesDuDossier,
  type FaitsManquesAnnonces,
} from "./manques-annonces";

/** Les références que le corpus adresse à la page, lues en l'appelant. */
function adressees(): string[] {
  return CORPUS.flatMap((c) =>
    c.articles
      .filter(
        (a) =>
          a.statut === "non_couvert" && a.declareA === ADRESSE_MANQUES_ANNONCES,
      )
      .map((a) => a.ref),
  ).sort();
}

const refsProjetees = (f: FaitsManquesAnnonces) =>
  manquesAnnoncesDuDossier(CORPUS, f).flatMap((d) => d.articles.map((a) => a.ref));

// ERP de 3ᵉ catégorie et habitation (2026-10-13) : le dossier qui n'a rien
// écarté, pour que la borne haute ci-dessous voie aussi les annonces du livre
// II et de l'habitation.
const EMPLOYEUR: FaitsManquesAnnonces = {
  travail: true,
  epiPresents: null,
  categorieErp: "N3",
  habitation: true,
  operationsElectriques: null,
};

/** Un restaurant de 5ᵉ catégorie, sans habitation : le cas le plus courant de la cible. */
const RESTAURANT_N5: FaitsManquesAnnonces = {
  travail: true,
  epiPresents: null,
  categorieErp: "N5",
  habitation: false,
  operationsElectriques: null,
};

describe("l'adresse mène quelque part (C45)", () => {
  // Le défaut que `corpus.test.ts` décrit sous `MUETS` : le cliquet « vérifie
  // qu'un `declareA` est PRÉSENT, jamais que l'adresse citée existe ». Pour
  // les articles qui portent cette adresse-ci, l'égalité est tenue dans les
  // deux sens.
  it("tout article qui cite la page y a une entrée", () => {
    const sansEntree = adressees().filter((ref) => !(ref in ANNONCES));
    expect(sansEntree).toEqual([]);
  });

  it("toute entrée de la page vient d'un article qui la cite", () => {
    const adr = new Set(adressees());
    const orphelines = Object.keys(ANNONCES).filter((ref) => !adr.has(ref));
    expect(orphelines).toEqual([]);
  });

  it("un employeur qui n'a rien écarté lit toutes les entrées", () => {
    // Borne haute, dérivée de la table : aucune entrée n'est muette faute de
    // condition satisfaisable.
    expect(refsProjetees(EMPLOYEUR).sort()).toEqual(
      Object.keys(ANNONCES).sort(),
    );
  });

  it("l'adresse est visible par l'exploitant, pas une note interne", () => {
    // Le prédicat du cliquet `MUETS` tient pour muet ce qui commence par
    // `docs/` ou « Non déclaré ».
    expect(ADRESSE_MANQUES_ANNONCES.startsWith("docs/")).toBe(false);
    expect(ADRESSE_MANQUES_ANNONCES.startsWith("Non déclaré")).toBe(false);
    expect(articlesNonCouverts().map((a) => a.ref)).toEqual(
      expect.arrayContaining(adressees()),
    );
  });
});

describe("n'annonce à un dossier que ce qui peut le concerner", () => {
  // ~~« non » aux équipements de protection retire la formation au port ;
  // le silence ne retire rien~~ — 2026-10-17, sous-lot B : `R. 4323-106` a
  // quitté la page pour l'aide des quatre catégories d'EPI (décision de c6).
  it("la formation au port des EPI n'est plus sur la page, à aucun dossier (déplacée, pas dupliquée)", () => {
    expect("R. 4323-106" in ANNONCES).toBe(false);
    expect(refsProjetees({ ...EMPLOYEUR, epiPresents: null })).not.toContain("R. 4323-106");
    // Borne basse : le reste du domaine reste là.
    expect(refsProjetees({ ...EMPLOYEUR, epiPresents: false })).toContain("L. 4141-5");
  });

  it("le cocontractant étranger est annoncé à tout dossier : aucun fait déclaré ne l'exclut (M4)", () => {
    // Un annuaire de prestataires vide est un silence, pas un « non ».
    expect(refsProjetees({ travail: false, epiPresents: null, categorieErp: null, habitation: false, operationsElectriques: null })).toEqual(
      expect.arrayContaining(["D. 8222-7", "L. 8222-1", "D. 8222-5"]),
    );
  });

  it("F2 : l'intitulé lu sous « ne suit pas » nomme la part non suivie", () => {
    const articles = manquesAnnoncesDuDossier(CORPUS, EMPLOYEUR).flatMap((d) => d.articles);
    const de = (ref: string) => articles.find((a) => a.ref === ref)?.intitule ?? "";
    expect(de("L. 4121-3")).toMatch(/selon le sexe/);
    expect(de("R. 4463-8")).toMatch(/chaleur intense/);
  });

  // ~~« l'eau et la vigilance restent »~~ — 2026-10-14 : l'eau et l'échelle
  // (R. 4323-63) ont quitté la page pour la liste des matériels non couverts.
  it("sans travailleur, rien du Code du travail — la vigilance reste", () => {
    const f = { travail: false, epiPresents: null, categorieErp: null, habitation: false, operationsElectriques: null };
    const refs = refsProjetees(f);
    expect(refs).not.toContain("R. 4227-22");
    expect(refs).not.toContain("R. 4412-11");
    expect(refs).toEqual(expect.arrayContaining(["L. 8222-1"]));
  });

  it("2026-10-14 : l'eau, l'échelle et les escaliers mécaniques ne sont plus sur la page", () => {
    const refs = refsProjetees(EMPLOYEUR);
    for (const ref of [
      "R. 4323-63",
      "R. 1321-60",
      "Arrêté 10-09-2021 art. 4",
      "Arrêté 10-09-2021 art. 8",
      "Arrêté 10-09-2021 art. 9",
      "Arrêté 10-09-2021 art. 10",
      "Arrêté 10-09-2021 art. 12",
      "AS 10",
    ]) {
      expect(refs, ref).not.toContain(ref);
    }
    const titres = manquesAnnoncesDuDossier(CORPUS, EMPLOYEUR).map((d) => d.titre);
    for (const t of ["Travail en hauteur", "Réseaux intérieurs d'eau", "Escaliers mécaniques et trottoirs roulants"]) {
      expect(titres).not.toContain(t);
    }
  });

  it("rubrique « Risque chimique » (décision du 2026-10-08) : R. 4412-11 et R. 4412-17, à l'employeur seul", () => {
    const rubrique = manquesAnnoncesDuDossier(CORPUS, EMPLOYEUR).find(
      (d) => d.cle === "risque_chimique",
    );
    expect(rubrique?.titre).toBe("Risque chimique");
    expect(rubrique?.articles.map((a) => a.ref).sort()).toEqual(["R. 4412-11", "R. 4412-17"]);
    const sansTravailleur = refsProjetees({ travail: false, epiPresents: null, categorieErp: null, habitation: false, operationsElectriques: null });
    expect(sansTravailleur).not.toContain("R. 4412-11");
    expect(sansTravailleur).not.toContain("R. 4412-17");
  });

  it("un domaine sans article pour ce dossier n'est pas rendu", () => {
    const f = { travail: false, epiPresents: null, categorieErp: null, habitation: false, operationsElectriques: null };
    const cles = manquesAnnoncesDuDossier(CORPUS, f).map((d) => d.cle);
    expect(cles).not.toContain("formation");
    for (const d of manquesAnnoncesDuDossier(CORPUS, f)) {
      expect(d.articles.length, d.cle).toBeGreaterThan(0);
    }
  });

  it("un article qui perd son adresse disparaît de la page", () => {
    // La projection lit le corpus, pas la table : un article couvert ou
    // reclassé cesse d'être annoncé, même si la table le nomme encore.
    // L'article RESTE au corpus, couvert entre-temps : c'est le cas réel. Le
    // retirer du corpus ne prouverait rien — une projection par la table le
    // ferait disparaître aussi (épreuve du 2026-09-27 : la première écriture
    // de ce test passait avec une projection qui ignorait le corpus).
    const corpusSans = CORPUS.map((c) => ({
      ...c,
      articles: c.articles.map((a) =>
        a.ref === "R. 4227-22"
          ? { ...a, statut: "retenu" as const, obligations: ["x"] as [string], declareA: undefined }
          : a,
      ),
    })) as unknown as typeof CORPUS;
    const refs = manquesAnnoncesDuDossier(corpusSans, EMPLOYEUR).flatMap((d) =>
      d.articles.map((a) => a.ref),
    );
    expect(refs).not.toContain("R. 4227-22");
    expect(refs).toContain("R. 4227-23");
  });
});

// ~~« 2026-10-13 : le gaz et les escaliers mécaniques ne visent que leurs
// dossiers »~~ — 2026-10-14, décision de la propriétaire : le gaz a quitté la
// page pour l'aide de la catégorie « Installation de gaz ». La garde devient :
// il n'y est plus, et il n'a pas perdu son adresse (voir aussi « un declareA
// qui cite l'aide d'une catégorie la cite mot pour mot », plus bas).
describe("2026-10-14 : le gaz a quitté la page pour l'aide de sa catégorie", () => {
  const GAZ = ["GZ 13", "GZ 14", "Arrêté 23-02-2018 art. 26 § 3"];

  it("aucun dossier ne lit plus le gaz sur la page, même celui qui n'a rien écarté", () => {
    const refs = refsProjetees(EMPLOYEUR);
    for (const ref of GAZ) expect(refs).not.toContain(ref);
    expect(manquesAnnoncesDuDossier(CORPUS, EMPLOYEUR).map((d) => d.titre)).not.toContain(
      "Installations de gaz",
    );
  });

  it("chacun garde une adresse : l'aide de la catégorie, citée mot pour mot", () => {
    const aide = DESCRIPTION_CATEGORIE.INSTALLATION_GAZ ?? "";
    for (const ref of GAZ) {
      const a = CORPUS.flatMap((c) => c.articles).find((x) => x.ref === ref);
      expect(a?.statut, ref).toBe("non_couvert");
      const declareA = a && a.statut === "non_couvert" ? (a.declareA ?? "") : "";
      expect(declareA, ref).toContain("DESCRIPTION_CATEGORIE.INSTALLATION_GAZ");
      const cite =
        /DESCRIPTION_CATEGORIE\.[A-Z_]+`?\)?\s*:\s*«\s*([\s\S]+?)\s*»\s*$/.exec(declareA)?.[1] ?? "∅";
      expect(aide, ref).toContain(cite);
    }
  });
});

describe("2026-10-13 : l'immeuble d'habitation ne vise que ses dossiers", () => {
  it("l'immeuble d'habitation ne va qu'au régime d'habitation", () => {
    for (const ref of [
      "Arrêté 1986-01-31 art. 78-1",
      "Arrêté 1986-01-31 art. 102",
    ]) {
      expect(refsProjetees(RESTAURANT_N5), ref).not.toContain(ref);
      expect(refsProjetees({ ...RESTAURANT_N5, habitation: true }), ref).toContain(ref);
    }
  });
});

describe("2026-10-13 : les travaux sous tension, annoncés sauf « non » aux opérations électriques", () => {
  it("le silence ne retire rien, « oui » l'annonce, « non » le retire", () => {
    expect(refsProjetees(RESTAURANT_N5)).toContain("R. 4544-11");
    expect(refsProjetees({ ...RESTAURANT_N5, operationsElectriques: true })).toContain("R. 4544-11");
    expect(refsProjetees({ ...RESTAURANT_N5, operationsElectriques: false })).not.toContain("R. 4544-11");
  });

  it("sans travailleur, rien", () => {
    expect(
      refsProjetees({ ...RESTAURANT_N5, travail: false, operationsElectriques: true }),
    ).not.toContain("R. 4544-11");
  });
});

describe("2026-10-14 : les poussières en nuage sont annoncées, pas questionnées", () => {
  it("la rubrique des matières annonce les atmosphères explosives dues aux poussières", () => {
    const rubrique = manquesAnnoncesDuDossier(CORPUS, RESTAURANT_N5).find(
      (d) => d.cle === "matieres_inflammables",
    );
    expect(rubrique?.phrase).toMatch(/atmosphères explosives/);
    expect(rubrique?.phrase).toMatch(/poussières/);
    expect(rubrique?.phrase).toMatch(/R\. 4227-42 à R\. 4227-54/);
  });
});

describe("aucun score, aucune qualification", () => {
  const textes = () =>
    manquesAnnoncesDuDossier(CORPUS, EMPLOYEUR)
      .flatMap((d) => [d.titre, d.phrase ?? "", ...d.articles.map((a) => a.phrase ?? "")])
      .join(" ")
      .toLowerCase();

  it("ne qualifie jamais la situation au regard du droit", () => {
    for (const interdit of [
      "conforme",
      "en infraction",
      "en règle",
      "illégal",
      "vous devez",
      "pensez à",
    ]) {
      expect(textes(), interdit).not.toContain(interdit);
    }
  });

  it("ne compte rien", () => {
    expect(textes()).not.toMatch(/%|\bscore\b|\bsur \d+\b/);
  });
});

describe("un declareA qui cite l'aide d'une catégorie la cite mot pour mot (revue du 2026-10-07)", () => {
  // Les articles retirés du référentiel le 2026-10-07 (équipements sous
  // pression, stockage de matières dangereuses) donnent pour adresse l'aide de
  // la catégorie au formulaire, et en recopient la phrase. Rien ne vérifiait
  // que la phrase y était encore : changer l'aide, c'était couper l'annonce en
  // silence. Éprouvé en retouchant un mot de l'aide du stockage.
  const MOTIF = /DESCRIPTION_CATEGORIE\.([A-Z_]+)`?\)?\s*:\s*«\s*([\s\S]+?)\s*»\s*$/;

  const citant = CORPUS.flatMap((c) =>
    c.articles.flatMap((a) =>
      a.statut === "non_couvert" && a.declareA?.includes("DESCRIPTION_CATEGORIE")
        ? [{ ref: `${c.id} ${a.ref}`, declareA: a.declareA }]
        : [],
    ),
  );

  it("chaque phrase citée figure dans DESCRIPTION_CATEGORIE de la catégorie nommée", () => {
    for (const { ref, declareA } of citant) {
      const m = MOTIF.exec(declareA);
      expect(m, `${ref} : citation illisible`).not.toBeNull();
      const [, categorie, phrase] = m!;
      const aide = DESCRIPTION_CATEGORIE[categorie as keyof typeof DESCRIPTION_CATEGORIE];
      expect(aide, `${ref} : catégorie ${categorie} inconnue`).toBeDefined();
      expect(aide, ref).toContain(phrase);
    }
  });

  it("borne basse : la garde porte sur des cas réels", () => {
    // Dix au 2026-10-07 (quatre ESP, six stockage) ; on n'en fige pas la liste.
    expect(citant.length).toBeGreaterThan(0);
  });
});
