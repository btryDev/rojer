import { describe, expect, it } from "vitest";
import {
  lireContexteDemande,
  presentationDemandeSignature,
  presentationRefusAvecLien,
  type ContexteDemande,
} from "./mail-demande";

/**
 * Ce que dit le courriel d'un lien de signature (2026-11-19) : qui demande,
 * l'encadré du plan, le bouton — dérivés de l'objet, jamais du navigateur.
 */

const PLAN: ContexteDemande = {
  libelle: "Plan de prévention PP-007 — Nettoyage SARL",
  demandeur: "Boulangerie Martin",
  plan: {
    reference: "PP-007",
    entrepriseExterieure: "Nettoyage SARL",
    lieux: "Cuisine, réserve",
    dateDebut: new Date("2026-12-01T08:00:00Z"),
    dateFin: new Date("2026-12-05T17:00:00Z"),
  },
};

describe("E1 — la demande de signature", () => {
  it("un plan : l'entreprise qui demande, l'encadré, le bouton du plan", () => {
    const p = presentationDemandeSignature(PLAN);
    expect(p.sujetMail).toBe("Plan de prévention à signer — PP-007 (Boulangerie Martin)");
    expect(p.titreMail).toBe("Plan de prévention à signer");
    expect(p.messageMail).toContain(
      "Boulangerie Martin vous invite à signer le plan de prévention relatif à l'intervention de Nettoyage SARL sur son site.",
    );
    expect(p.encadreMail).toEqual([
      { libelle: "Référence", valeur: "PP-007" },
      { libelle: "Entreprise extérieure", valeur: "Nettoyage SARL" },
      { libelle: "Lieux", valeur: "Cuisine, réserve" },
      { libelle: "Période", valeur: "du mardi 1 décembre 2026 au samedi 5 décembre 2026" },
    ]);
    expect(p.boutonMail).toBe("Consulter et signer le plan");
    // Aucun code : il part à la demande.
    expect(JSON.stringify(p)).not.toMatch(/code/i);
  });

  it("un autre document : son libellé dans l'encadré, « Consulter et signer »", () => {
    const p = presentationDemandeSignature({ libelle: "Ma vérification — rapport du 03/03/2026", demandeur: "Boulangerie Martin", plan: null });
    expect(p.sujetMail).toBe("Signature à apporter : Ma vérification — rapport du 03/03/2026");
    expect(p.messageMail).toContain("Boulangerie Martin vous invite à signer électroniquement le document suivant.");
    expect(p.encadreMail).toEqual([{ libelle: "Document", valeur: "Ma vérification — rapport du 03/03/2026" }]);
    expect(p.boutonMail).toBe("Consulter et signer");
  });

  it("sans raison sociale lisible, le message ne nomme personne", () => {
    const p = presentationDemandeSignature({ ...PLAN, demandeur: null });
    expect(p.sujetMail).toBe("Plan de prévention à signer — PP-007");
    expect(p.messageMail).toMatch(/^Vous êtes invité\(e\) à signer le plan de prévention/);
  });
});

describe("E5 — le refus porte un nouveau lien", () => {
  it("dit le refus, et le bouton signe le plan tel qu'il est", () => {
    const p = presentationRefusAvecLien(PLAN);
    expect(p.sujetMail).toBe("Proposition non retenue — PP-007");
    expect(p.titreMail).toBe("Proposition non retenue");
    expect(p.messageMail).toContain("Boulangerie Martin n'a pas retenu votre proposition");
    expect(p.messageMail).toContain("le plan reste tel qu'il était");
    expect(p.boutonMail).toBe("Consulter et signer le plan");
  });
});

describe("lireContexteDemande", () => {
  const db = (plan: Record<string, unknown> | null, raison: string | null) =>
    ({
      planPrevention: { findFirst: async () => plan },
      etablissement: { findFirst: async () => (raison === null ? null : { entreprise: { raisonSociale: raison } }) },
    }) as never;

  it("réduit le texte saisi à une ligne, sans caractère de contrôle", async () => {
    const c = await lireContexteDemande(
      db(
        {
          numero: 7,
          entrepriseExterieureRaison: "Nettoyage\r\nSARL",
          lieux: "Cuisine\n\nréserve\u0007",
          dateDebut: new Date("2026-12-01T08:00:00Z"),
          dateFin: new Date("2026-12-05T17:00:00Z"),
        },
        "Boulangerie\nMartin",
      ),
      "plan_prevention",
      "pp-7",
      "etab-1",
    );
    expect(c?.demandeur).toBe("Boulangerie Martin");
    expect(c?.plan).toMatchObject({ reference: "PP-007", entrepriseExterieure: "Nettoyage SARL", lieux: "Cuisine réserve" });
    expect(c?.libelle).toBe("Plan de prévention PP-007 — Nettoyage SARL");
  });

  it("un objet hors de l'établissement : rien", async () => {
    expect(await lireContexteDemande(db(null, "X"), "plan_prevention", "ailleurs", "etab-1")).toBeNull();
  });
});
