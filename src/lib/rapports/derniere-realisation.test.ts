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
    // Un `select` qui filtre en base (le serveur MCP) ne rapporte que la
    // date : l'absence de `resultat` veut dire « déjà réalisé ».
    expect(derniereRealisation([{ dateRapport: j("2026-06-01") }])).toEqual(
      j("2026-06-01"),
    );
  });
});

describe("indexerDernieresRealisations", () => {
  /** Instant de création : sans importance hors du départage du même jour. */
  const cree = new Date("2026-09-01T08:00:00Z");

  it("garde, par ligne, le plus récent", () => {
    const index = indexerDernieresRealisations([
      { verificationId: "v-1", dateRapport: j("2025-05-01"), createdAt: cree },
      { verificationId: "v-2", dateRapport: j("2024-01-01"), createdAt: cree },
      { verificationId: "v-1", dateRapport: j("2026-06-01"), createdAt: cree },
      { verificationId: "v-1", dateRapport: j("2025-12-01"), createdAt: cree },
    ]);
    expect(index.get("v-1")?.dateRapport).toEqual(j("2026-06-01"));
    expect(index.get("v-2")?.dateRapport).toEqual(j("2024-01-01"));
    expect(index.has("v-3")).toBe(false);
  });

  it("garde le RÉSULTAT avec la date : il donne son statut à une obligation ponctuelle", () => {
    const index = indexerDernieresRealisations([
      {
        verificationId: "v-1",
        dateRapport: j("2025-05-01"),
        createdAt: cree,
        resultat: "conforme",
      },
      {
        verificationId: "v-1",
        dateRapport: j("2026-06-01"),
        createdAt: cree,
        resultat: "ecart_majeur",
      },
    ]);
    expect(index.get("v-1")?.resultat).toBe("ecart_majeur");
  });

  it("deux rapports du MÊME JOUR : le dernier déposé l'emporte, quel que soit l'ordre lu", () => {
    // Revue du 2026-09-14. `dateRapport` est un jour civil : deux rapports du
    // même jour portent le même instant. Sans départage, le premier rendu par
    // PostgreSQL gagnait, et le statut d'une ponctuelle — lu sur ce résultat —
    // changeait d'une régénération à l'autre. Les deux ordres doivent donner
    // la même réponse : celle du dépôt le plus tardif.
    const matin = {
      verificationId: "v-1",
      dateRapport: j("2026-06-01"),
      createdAt: new Date("2026-06-01T08:00:00Z"),
      resultat: "conforme",
    };
    const soir = {
      verificationId: "v-1",
      dateRapport: j("2026-06-01"),
      createdAt: new Date("2026-06-01T17:00:00Z"),
      resultat: "ecart_majeur",
    };
    expect(indexerDernieresRealisations([matin, soir]).get("v-1")?.resultat).toBe(
      "ecart_majeur",
    );
    expect(indexerDernieresRealisations([soir, matin]).get("v-1")?.resultat).toBe(
      "ecart_majeur",
    );
  });
});
