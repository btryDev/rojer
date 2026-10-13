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
  it("« non » aux équipements de protection retire la formation au port, et elle seule", () => {
    const sans = refsProjetees({ ...EMPLOYEUR, epiPresents: false });
    expect(sans).not.toContain("R. 4323-106");
    // Borne basse : le reste du domaine reste là.
    expect(sans).toContain("L. 4141-5");
  });

  it("le silence sur les équipements de protection ne retire rien", () => {
    // L'incertitude ne réduit jamais la couverture.
    expect(refsProjetees({ ...EMPLOYEUR, epiPresents: null })).toContain(
      "R. 4323-106",
    );
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

  it("sans travailleur, rien du Code du travail — l'eau et la vigilance restent", () => {
    const f = { travail: false, epiPresents: null, categorieErp: null, habitation: false, operationsElectriques: null };
    const refs = refsProjetees(f);
    expect(refs).not.toContain("R. 4227-22");
    expect(refs).not.toContain("R. 4323-63");
    expect(refs).toEqual(
      expect.arrayContaining(["R. 1321-60", "L. 8222-1"]),
    );
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

describe("2026-10-13 : le gaz et les escaliers mécaniques ne visent que leurs dossiers", () => {
  const GAZ_ERP = ["GZ 13", "GZ 14"];

  it("un ERP des quatre premières catégories lit le gaz et les escaliers mécaniques", () => {
    expect(refsProjetees({ ...RESTAURANT_N5, categorieErp: "N4" })).toEqual(
      expect.arrayContaining([...GAZ_ERP, "AS 10"]),
    );
  });

  it("un ERP de 5ᵉ catégorie ne les lit pas — le livre II ne le vise pas", () => {
    const refs = refsProjetees(RESTAURANT_N5);
    for (const ref of [...GAZ_ERP, "AS 10"]) expect(refs).not.toContain(ref);
  });

  it("un établissement qui ne reçoit pas de public ne les lit pas", () => {
    const refs = refsProjetees({ ...RESTAURANT_N5, categorieErp: null });
    for (const ref of [...GAZ_ERP, "AS 10"]) expect(refs).not.toContain(ref);
  });

  it("le gaz collectif et l'immeuble d'habitation ne vont qu'au régime d'habitation", () => {
    for (const ref of [
      "Arrêté 23-02-2018 art. 26 § 3",
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
