// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Prestataire } from "@prisma/client";
import { VigilancePiecePill } from "./VigilancePills";
import { computeVigilance, mentionUrssaf } from "@/lib/prestataires/vigilance";

afterEach(cleanup);

/**
 * Ce que la pastille montre réellement. `vigilance.test.ts` tient le calcul
 * et le balayage des écrans ; ces cas rendent le composant, depuis un
 * instantané calculé — pas depuis des props écrites à la main, qui pourraient
 * dire « à jour » là où le calcul ne le dit pas.
 */
const NOW = new Date("2026-08-10T07:00:00Z");
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function fiche(p: Partial<Prestataire>): Prestataire {
  return {
    id: "p1",
    etablissementId: "e1",
    raisonSociale: "Test",
    siret: null,
    estOrganismeAgree: false,
    domaines: [],
    contactNom: "Nom",
    contactEmail: "test@ex.fr",
    contactTelephone: null,
    attestationUrssafCle: null,
    attestationUrssafNom: null,
    attestationUrssafValableJusquA: null,
    attestationUrssafRemiseLe: null,
    attestationUrssafEmiseLe: null,
    assuranceRcProCle: null,
    assuranceRcProNom: null,
    assuranceRcProValableJusquA: null,
    kbisCle: null,
    kbisNom: null,
    kbisDateEmission: null,
    notesInternes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...p,
  };
}

function rendre(p: Partial<Prestataire>) {
  const v = computeVigilance(fiche(p), NOW);
  render(
    <VigilancePiecePill
      libelle="Attestation URSSAF"
      statut={v.urssaf}
      jours={v.urssafExpireDans}
      mention={mentionUrssaf(v)}
    />,
  );
  return v;
}

describe("la pastille URSSAF dit ses dates, ou qu'elles manquent", () => {
  it("dates vides : « Date non renseignée », jamais « À jour »", () => {
    rendre({
      attestationUrssafCle: "k",
      attestationUrssafValableJusquA: jour("2030-12-31"),
    });
    expect(screen.getByText("Date non renseignée")).toBeTruthy();
    expect(screen.queryByText("À jour")).toBeNull();
    // La validité saisie (2030) ne s'affiche pas en « Valide … j de plus ».
    expect(screen.queryByText(/Valide .* de plus/)).toBeNull();
    expect(
      screen.getByText(/Dates de remise et d'émission non renseignées\./),
    ).toBeTruthy();
  });

  it("dates renseignées : l'échéance, la remise et la suivante", () => {
    rendre({
      attestationUrssafRemiseLe: jour("2026-03-01"),
      attestationUrssafEmiseLe: jour("2026-02-20"),
    });
    expect(screen.getByText("Expire dans 22 j")).toBeTruthy();
    expect(screen.getByText(/Remise suivante le .* « tous les six mois »/)).toBeTruthy();
  });

  it("émission hors délai : « À redemander », sans « Valide … j de plus »", () => {
    // Remise le 1er août, émise huit mois plus tôt : la remise suivante est
    // loin, mais la pièce est à redemander. Le compte à rebours la
    // contredirait (contre-lecture du 2026-09-27).
    const v = rendre({
      attestationUrssafRemiseLe: jour("2026-08-01"),
      attestationUrssafEmiseLe: jour("2025-12-01"),
    });
    expect(v.urssaf).toBe("emission_hors_delai");
    expect(screen.getByText("À redemander")).toBeTruthy();
    expect(screen.queryByText(/Valide .* de plus/)).toBeNull();
  });

  it("la RC Pro ne porte aucune mention", () => {
    // Borne haute : une mention posée sur toutes les pièces cesserait de
    // signaler quoi que ce soit.
    render(<VigilancePiecePill libelle="RC Pro" statut="a_jour" jours={200} />);
    expect(screen.queryByText(/non renseignée/)).toBeNull();
    expect(screen.queryByText(/Remise/)).toBeNull();
  });
});
