// Le geste d'une obligation hors du quotidien, tiré de ses réalisateurs
// (2026-10-17, ADR-046 ; décision c6, Q4). La page disait « À tenir
// vous-même » de la fiche d'entreprise, que le service de santé au travail
// établit (`R. 4624-46`).

import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import type { Obligation } from "@/lib/referentiels/conformite/types";
import { GESTES_HORS_QUOTIDIEN, gesteHorsQuotidien } from "./niveau-audit";

const audit = obligationsConformite.filter(estNiveauAudit);
const par = (id: string): Obligation => {
  const o = obligationsConformite.find((x) => x.id === id);
  if (!o) throw new Error(`absente du référentiel : ${id}`);
  return o;
};

describe("gesteHorsQuotidien — un geste par réalisateur", () => {
  it("la fiche d'entreprise s'obtient du service de santé au travail", () => {
    expect(gesteHorsQuotidien(par("sante-travail-etablissement-fiche-entreprise"))).toBe(
      GESTES_HORS_QUOTIDIEN.spst,
    );
  });

  it("le rapport annuel de l'entreprise d'entretien s'obtient de l'ascensoriste", () => {
    expect(gesteHorsQuotidien(par("ascenseur-rapport-annuel-activite"))).toBe(
      GESTES_HORS_QUOTIDIEN.ascensoriste,
    );
  });

  it("le propriétaire qui entretient lui-même son ascenseur n'est pas renvoyé à un ascensoriste (revue du 2026-10-17)", () => {
    expect(GESTES_HORS_QUOTIDIEN.ascensoriste).toMatch(/si vous assurez l'entretien/);
  });

  it("les chiffons imprégnés se tiennent soi-même", () => {
    expect(gesteHorsQuotidien(par("incendie-travail-chiffons-impregnes-recipients-clos"))).toBe(
      GESTES_HORS_QUOTIDIEN.exploitant,
    );
  });

  it("la révision décennale de l'extincteur se fait réaliser par une personne qualifiée", () => {
    expect(
      gesteHorsQuotidien(par("incendie-travail-extincteurs-revision-atelier-decennale")),
    ).toBe(GESTES_HORS_QUOTIDIEN.tiers);
  });

  it("le geste suit la règle sur chaque obligation hors du quotidien, et les quatre gestes servent", () => {
    // Borne basse : la règle, recalculée à partir des réalisateurs et non
    // recopiée par identifiant.
    const vus = new Set<string>();
    for (const o of audit) {
      const r = new Set(o.realisateurs);
      const attendu = r.has("exploitant")
        ? GESTES_HORS_QUOTIDIEN.exploitant
        : ["medecin_travail", "professionnel_sante_travail", "equipe_pluridisciplinaire"].some(
              (x) => r.has(x as never),
            )
          ? GESTES_HORS_QUOTIDIEN.spst
          : o.domaine === "ascenseur"
            ? GESTES_HORS_QUOTIDIEN.ascensoriste
            : GESTES_HORS_QUOTIDIEN.tiers;
      expect(gesteHorsQuotidien(o), o.id).toBe(attendu);
      vus.add(attendu);
    }
    expect(vus.size).toBe(4);
  });

  it("l'ascensoriste ne reçoit que ce qui relève du contrat d'entretien", () => {
    // Un contrôle technique d'ascenseur passé au niveau audit se fait par un
    // contrôleur, pas par l'ascensoriste : il ferait tomber ce test au lieu
    // d'afficher un faux destinataire.
    for (const o of audit) {
      if (gesteHorsQuotidien(o) !== GESTES_HORS_QUOTIDIEN.ascensoriste) continue;
      const texte = [o.libelle, ...o.referencesLegales.map((r) => r.reference)].join(" ");
      expect(texte, o.id).toMatch(/entretien/i);
    }
  });

  it("aucun geste ne qualifie ni ne promet de rappel", () => {
    for (const g of Object.values(GESTES_HORS_QUOTIDIEN)) {
      expect(g).toMatch(/Rojer ne vous le rappellera pas\.$/);
      expect(g.toLowerCase()).not.toMatch(/conforme|en règle|vous devez/);
    }
  });
});
