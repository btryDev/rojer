// La dernière réalisation d'une ligne se lit sur ses rapports (ADR-034).
//
// Trois propriétés que la colonne `dateRealisee` obligeait à maintenir à la
// main, et qui sont vraies ici par construction — chacune a son test, pour que
// la construction ne se défasse pas en silence.

import { describe, expect, it } from "vitest";
import {
  derniereRealisation,
  indexerDernieresRealisations,
} from "./derniere-realisation";

const j = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("derniereRealisation", () => {
  it("rend la date du rapport réalisé le plus récent, dans n'importe quel ordre", () => {
    expect(
      derniereRealisation([
        { dateRapport: j("2025-05-01"), resultat: "conforme" },
        { dateRapport: j("2026-06-01"), resultat: "observations_mineures" },
        { dateRapport: j("2024-01-01"), resultat: "ecart_majeur" },
      ]),
    ).toEqual(j("2026-06-01"));
  });

  it("ignore un rapport « non vérifiable » : il n'atteste d'aucun contrôle", () => {
    // Le prestataire s'est déplacé, n'a rien pu vérifier. Plus récent que le
    // dernier contrôle, il ne doit pas le remplacer.
    expect(
      derniereRealisation([
        { dateRapport: j("2025-05-01"), resultat: "conforme" },
        { dateRapport: j("2026-06-01"), resultat: "non_verifiable" },
      ]),
    ).toEqual(j("2025-05-01"));
  });

  it("rend null sans rapport réalisé", () => {
    expect(derniereRealisation([])).toBeNull();
    expect(
      derniereRealisation([{ dateRapport: j("2026-06-01"), resultat: "non_verifiable" }]),
    ).toBeNull();
  });

  it("accepte la liste déjà filtrée d'un select, sans résultat", () => {
    // `SELECT_DERNIER_RAPPORT_REALISE` filtre en base et ne rapporte que la
    // date : l'absence de `resultat` veut dire « déjà réalisé ».
    expect(derniereRealisation([{ dateRapport: j("2026-06-01") }])).toEqual(
      j("2026-06-01"),
    );
  });
});

describe("indexerDernieresRealisations", () => {
  it("garde, par ligne, le plus récent", () => {
    const index = indexerDernieresRealisations([
      { verificationId: "v-1", dateRapport: j("2025-05-01") },
      { verificationId: "v-2", dateRapport: j("2024-01-01") },
      { verificationId: "v-1", dateRapport: j("2026-06-01") },
      { verificationId: "v-1", dateRapport: j("2025-12-01") },
    ]);
    expect(index.get("v-1")?.dateRapport).toEqual(j("2026-06-01"));
    expect(index.get("v-2")?.dateRapport).toEqual(j("2024-01-01"));
    expect(index.has("v-3")).toBe(false);
  });

  it("garde le RÉSULTAT avec la date : il donne son statut à une obligation ponctuelle", () => {
    const index = indexerDernieresRealisations([
      { verificationId: "v-1", dateRapport: j("2025-05-01"), resultat: "conforme" },
      {
        verificationId: "v-1",
        dateRapport: j("2026-06-01"),
        resultat: "ecart_majeur",
      },
    ]);
    expect(index.get("v-1")?.resultat).toBe("ecart_majeur");
  });
});
