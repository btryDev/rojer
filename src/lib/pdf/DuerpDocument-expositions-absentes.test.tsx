// La section « Expositions examinées et déclarées absentes » atteint-elle la
// page — et seulement quand la version la porte (§ 17.2) ?
//
// Le texte d'un PDF rendu ne se lit pas (`DossierConformiteDocument.test.tsx`) :
// la présence se vérifie dans l'arbre du composant, l'absence de plantage par
// un vrai rendu.

import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { elementsDansLOrdre, texteDirect } from "./arbre-rendu.test-utils";
import { DuerpDocument } from "./DuerpDocument";
import {
  CHAPEAU_EXPOSITIONS_ABSENTES,
  TITRE_EXPOSITIONS_ABSENTES,
} from "./mentions-expositions-absentes";
import type { DuerpSnapshot } from "@/lib/versions/snapshot";

const ROUTIER =
  "Des salariés conduisent-ils un véhicule (voiture, deux-roues, utilitaire) dans le cadre du travail, même occasionnellement ?";

function version(over: Partial<DuerpSnapshot> = {}): DuerpSnapshot {
  return {
    version: 2,
    genereLe: "2026-10-12T09:00:00.000Z",
    motif: "Mise à jour annuelle",
    referentielSecteurId: "bureau",
    entreprise: {
      raisonSociale: "Cabinet Exemple",
      siret: null,
      codeNaf: "69.20Z",
      effectif: 6,
      adresse: "1 rue des Lilas",
    },
    unites: [],
    ...over,
  };
}

/** Les textes du document, dans l'ordre — les conteneurs, sans texte direct, écartés. */
const textes = (snap: DuerpSnapshot, brouillon = false) =>
  elementsDansLOrdre(DuerpDocument({ snapshot: snap, historique: [], brouillon }))
    .map(texteDirect)
    .filter((x) => x !== "");

describe("DuerpDocument — expositions déclarées absentes", () => {
  it("une version figée avec un « non » l'imprime : question, réponse, date", () => {
    const t = textes(
      version({
        expositionsDeclareesAbsentes: [
          { id: "q-routier", question: ROUTIER, reponse: false },
        ],
      }),
    );
    const i = t.indexOf(TITRE_EXPOSITIONS_ABSENTES);
    expect(i).toBeGreaterThan(-1);
    expect(t[i + 1]).toBe(CHAPEAU_EXPOSITIONS_ABSENTES);
    expect(t[i + 2]).toBe(`• ${ROUTIER}`);
    expect(t[i + 3]).toBe("Réponse : non — version 2 du 12 oct. 2026");
    // Dans la méthode, avant l'appréciation.
    expect(i).toBeGreaterThan(t.indexOf("Modalités et découpage"));
    expect(i).toBeLessThan(t.indexOf("Appréciation"));
  });

  it("un aperçu ne date pas une version qui n'existe pas", () => {
    const t = textes(
      version({
        expositionsDeclareesAbsentes: [
          { id: "q-routier", question: ROUTIER, reponse: false },
        ],
      }),
      true,
    );
    expect(t).toContain("Réponse : non — à ce jour");
  });

  it("une version ancienne, sans le champ, s'imprime sans la section", async () => {
    const ancienne = version();
    expect("expositionsDeclareesAbsentes" in ancienne).toBe(false);
    expect(textes(ancienne)).not.toContain(TITRE_EXPOSITIONS_ABSENTES);
    const pdf = await renderToBuffer(
      DuerpDocument({ snapshot: ancienne, historique: [] }),
    );
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("une liste vide n'imprime pas de section", () => {
    expect(
      textes(version({ expositionsDeclareesAbsentes: [] })),
    ).not.toContain(TITRE_EXPOSITIONS_ABSENTES);
  });

  it("une version avec la section se rend en PDF", async () => {
    const pdf = await renderToBuffer(
      DuerpDocument({
        snapshot: version({
          expositionsDeclareesAbsentes: [
            { id: "q-routier", question: ROUTIER, reponse: false },
          ],
        }),
        historique: [],
      }),
    );
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
