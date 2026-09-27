import { describe, expect, it } from "vitest";
import { CORPUS, articlesNonCouverts } from "@/lib/referentiels/corpus";
import { ADRESSE_MANQUES_ANNONCES } from "@/lib/referentiels/corpus/adresses";
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

const EMPLOYEUR: FaitsManquesAnnonces = {
  travail: true,
  epiPresents: null,
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
    expect(refsProjetees({ travail: false, epiPresents: null })).toEqual(
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
    const f = { travail: false, epiPresents: null };
    const refs = refsProjetees(f);
    expect(refs).not.toContain("R. 4227-22");
    expect(refs).not.toContain("R. 4323-63");
    expect(refs).toEqual(
      expect.arrayContaining(["R. 1321-60", "L. 8222-1"]),
    );
  });

  it("un domaine sans article pour ce dossier n'est pas rendu", () => {
    const f = { travail: false, epiPresents: null };
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
