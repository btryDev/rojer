import { describe, expect, it } from "vitest";
import { depuisSaisieDateHeure } from "@/lib/dates";
import { mentionRendezVous, rendezVousEnAttenteDeRapport } from "./regles";

const t = depuisSaisieDateHeure;

describe("le rendez-vous d'un contrôle (ADR-049)", () => {
  it("le jour même, le rendez-vous n'attend pas encore son rapport ; le lendemain, si", () => {
    const rdv = t("2026-11-12T09:30");
    expect(rendezVousEnAttenteDeRapport(rdv, t("2026-11-12T18:00"))).toBe(false);
    expect(rendezVousEnAttenteDeRapport(rdv, t("2026-11-13T08:00"))).toBe(true);
    expect(rendezVousEnAttenteDeRapport(null, t("2026-11-13T08:00"))).toBe(false);
  });

  it("la mention nomme le prestataire, et dit un rendez-vous passé", () => {
    const v = { rendezVousLe: t("2026-11-12T09:30"), prestataire: { raisonSociale: "Socotec" } };
    expect(mentionRendezVous(v, t("2026-11-01T08:00"))).toMatch(/^RDV le .* avec Socotec$/);
    expect(mentionRendezVous(v, t("2026-11-20T08:00"))).toMatch(/passé : rapport attendu$/);
    expect(mentionRendezVous({ rendezVousLe: null }, t("2026-11-01T08:00"))).toBeNull();
  });
});
