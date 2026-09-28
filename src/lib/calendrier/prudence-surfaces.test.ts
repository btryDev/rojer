import { describe, expect, it } from "vitest";
import { repartirParEquipement } from "@/lib/equipements/etat-verifications";
import { repartirVerifications } from "@/lib/pdf/etat-verifications";
import { ligneVerif } from "@/lib/pdf/builders";
import type { VerificationListee } from "@/lib/calendrier/queries";
import { retenueParPrudence } from "./prudence";

/**
 * La MENTION et la PRUDENCE sont deux choses (contre-revue du lot 3,
 * 2026-09-28). Une ligne marquée « à confirmer » ET prescrite (ADR-035) est
 * en retard — une autorité l'a rythmée — et porte sa mention — le silence de
 * la fiche retient toujours son obligation. Le parc et le dossier PDF doivent
 * le dire tous deux. Le parc la perdait : sa mention était attachée à la
 * prudence (f9234c89).
 *
 * Éprouvé en recollant la mention à la prudence au parc.
 */

const NOW = new Date("2026-09-27T10:00:00Z");
const MARQUES = new Map([["o-marquee", { phrases: ["La fiche est muette."], effectif: false }]]);

const ligne = (prescriptionId: string | null) =>
  ({
    id: "v1",
    equipementId: "eq1",
    obligationId: "o-marquee",
    prescriptionId,
    libelleObligation: "Vérification annuelle",
    statut: "planifiee",
    periodicite: "annuelle",
    datePrevue: new Date("2026-03-01T00:00:00Z"),
    archiveLe: null,
    derniereRealisation: null,
    equipement: null,
    salarie: null,
    prescription: prescriptionId ? { source: "assureur" } : null,
  }) as unknown as VerificationListee;

function surfaces(prescriptionId: string | null) {
  const v = ligne(prescriptionId);
  const parc = repartirParEquipement([v], NOW, MARQUES).get("eq1")!;
  const etat = repartirVerifications([v], NOW, retenueParPrudence(MARQUES));
  const imprimees = [...etat.enRetard, ...etat.retenuesParPrudence].map((l) =>
    ligneVerif(l, false, NOW, MARQUES),
  );
  return {
    parc: { enRetard: parc.enRetard, mention: parc.aConfirmer },
    pdf: {
      enRetard: etat.enRetard.length,
      statut: imprimees[0]?.statut,
      mention: imprimees[0]?.aConfirmer ?? [],
    },
  };
}

describe("parc et dossier PDF concordent sur une ligne marquée", () => {
  it("prescrite : en retard ET mentionnée, sur les deux surfaces", () => {
    const s = surfaces("presc-1");
    expect(s.parc).toEqual({ enRetard: 1, mention: ["La fiche est muette."] });
    expect(s.pdf).toEqual({ enRetard: 1, statut: "en_retard", mention: ["La fiche est muette."] });
  });

  it("sans prescription : retenue par prudence, hors des retards, mentionnée, sur les deux surfaces", () => {
    const s = surfaces(null);
    expect(s.parc).toEqual({ enRetard: 0, mention: ["La fiche est muette."] });
    expect(s.pdf).toEqual({ enRetard: 0, statut: "a_confirmer", mention: ["La fiche est muette."] });
  });
});
