/**
 * Les liens des documents que Rojer produit (2026-10-29) : chaque document
 * produit s'ouvre depuis la page « Documents obligatoires », et chaque lien
 * mène à une page qui existe. Un document produit ajouté au référentiel sans
 * lien fait tomber ce test : c'est ici qu'on vient le chercher quand un
 * contrôleur le demande.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  documentsNonProduits,
  documentsProduits,
} from "@/lib/referentiels/documents-obligatoires";
import { liensDuDocument } from "./DocumentsObligatoires";

const ETAB = "etab-1";

/** Le fichier de route de l'App Router qui sert ce chemin. */
function routeExiste(href: string): boolean {
  const segments = href
    .split("/")
    .filter(Boolean)
    .map((s) => (s === ETAB ? "[id]" : s));
  const dossier = path.join(process.cwd(), "src", "app", ...segments);
  return (
    existsSync(path.join(dossier, "page.tsx")) ||
    existsSync(path.join(dossier, "route.ts"))
  );
}

describe("Documents obligatoires — liens", () => {
  it("chaque document produit par Rojer s'ouvre d'un lien", () => {
    const sansLien = documentsProduits()
      .filter((d) => liensDuDocument(d.id, ETAB).length === 0)
      .map((d) => d.id);
    expect(sansLien).toEqual([]);
  });

  it("chaque lien mène à une page qui existe", () => {
    const morts = documentsProduits()
      .flatMap((d) => liensDuDocument(d.id, ETAB))
      .map((l) => l.href)
      .filter((href) => !routeExiste(href));
    expect(morts).toEqual([]);
  });

  it("un document que Rojer ne produit pas ne promet aucun lien", () => {
    const avecLien = documentsNonProduits()
      .filter((d) => liensDuDocument(d.id, ETAB).length > 0)
      .map((d) => d.id);
    expect(avecLien).toEqual([]);
  });
});
