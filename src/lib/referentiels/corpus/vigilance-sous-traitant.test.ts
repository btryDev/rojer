// L. 8222-1-1 — l'adresse du `declareA` mène quelque part, et nulle part
// ailleurs (décision de la propriétaire du 2026-10-14).
//
// `corpus.test.ts` vérifie qu'un `declareA` est PRÉSENT, jamais que l'adresse
// citée existe. Pour cet article, elle est vérifiée : la phrase est sur la page
// Prestataires, et c'est la seule surface affichée qui le cite.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ANNONCES } from "@/lib/perimetre/manques-annonces";
import { CORPUS } from "./index";

const PAGE = "src/app/etablissements/[id]/prestataires/page.tsx";

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(tsx?|mdx?)$/.test(nom) ? [chemin] : [];
  });
}

describe("L. 8222-1-1 — une phrase du module Prestataires, et nulle part ailleurs", () => {
  const article = CORPUS.flatMap((c) => c.articles).find((a) => a.ref === "L. 8222-1-1");

  it("est au corpus, non couvert, avec sa version future et l'adresse de la page", () => {
    expect(article?.statut).toBe("non_couvert");
    expect(article?.versionFuture).toBe("2026-12-26");
    if (article?.statut !== "non_couvert") return;
    expect(article.declareA).toContain(PAGE);
  });

  it("la page porte la phrase", () => {
    const source = readFileSync(join(process.cwd(), PAGE), "utf8").replace(/\s+/g, " ");
    expect(source).toContain("(art. L. 8222-1-1). Rojer ne suit pas ces vérifications.");
    // La date reste juste des deux côtés du 2026-12-26 : jamais un jour
    // présenté comme certain (la loi dit « au plus tard six mois après la
    // promulgation » du 25 juin 2026, Légifrance date au 2026-12-26).
    expect(source).toContain("au plus tard à partir de fin décembre 2026");
  });

  it("aucune autre surface affichée ne le cite, et la page « Ce que Rojer ne couvre pas » ne l'annonce pas", () => {
    expect(Object.keys(ANNONCES)).not.toContain("L. 8222-1-1");
    const autres = ["src/app", "src/components", "src/lib/pdf", "src/lib/perimetre"]
      .flatMap((d) => fichiers(join(process.cwd(), d)))
      .filter((f) => f !== join(process.cwd(), PAGE))
      .filter((f) => readFileSync(f, "utf8").includes("L. 8222-1-1"));
    expect(autres).toEqual([]);
  });
});
