import { describe, expect, it } from "vitest";
import { depuisSaisieDateHeure } from "@/lib/dates";
import {
  avertissementRendezVous,
  datePoseeAuCalendrier,
  mentionRendezVous,
  pastilleRendezVous,
  rendezVousEnAttenteDeRapport,
} from "./regles";

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

  it("posée au jour du rendez-vous, la pastille dit l'échéance ; après l'échéance, elle dit le rendez-vous en rose", () => {
    const avant = { rendezVousLe: t("2026-11-05T09:30"), datePrevue: t("2027-10-20T00:00"), prestataire: null };
    expect(pastilleRendezVous(avant, t("2026-11-01T08:00"))).toMatchObject({ passe: false, court: expect.stringMatching(/^Échéance /) });
    const apres = { rendezVousLe: t("2027-12-12T09:30"), datePrevue: t("2027-10-20T00:00"), prestataire: null };
    expect(pastilleRendezVous(apres, t("2026-11-01T08:00"))).toMatchObject({ passe: true, court: expect.stringMatching(/après l'échéance$/) });
    expect(pastilleRendezVous(avant, t("2026-11-20T08:00"))).toMatchObject({ court: "RDV passé", passe: true });
    expect(pastilleRendezVous({ rendezVousLe: null, datePrevue: t("2027-10-20T00:00") }, t("2026-11-01T08:00"))).toBeNull();
  });

  it("le calendrier pose l'échéance ouverte au jour d'un rendez-vous qui la précède, et seulement alors", () => {
    const v = { rendezVousLe: t("2026-11-05T09:30"), datePrevue: t("2027-10-20T00:00") };
    const courante = { date: v.datePrevue, lecture: "courante", registre: "planifiee" };
    expect(datePoseeAuCalendrier(v, courante)).toBe(v.rendezVousLe);
    // Le jour même de l'échéance : encore avant.
    expect(datePoseeAuCalendrier({ ...v, rendezVousLe: t("2027-10-20T15:00") }, courante).getTime()).toBe(
      t("2027-10-20T15:00").getTime(),
    );
    // Après l'échéance, en retard, ou pour un rapport fait : la date de la lecture.
    expect(datePoseeAuCalendrier({ ...v, rendezVousLe: t("2027-10-21T09:00") }, courante)).toBe(v.datePrevue);
    expect(datePoseeAuCalendrier(v, { ...courante, registre: "enRetard" })).toBe(v.datePrevue);
    expect(datePoseeAuCalendrier(v, { ...courante, lecture: "realisation" })).toBe(v.datePrevue);
  });

  it("le formulaire signale un rendez-vous après l'échéance ou très en avance, sans bloquer", () => {
    const echeance = t("2027-10-20T00:00");
    expect(avertissementRendezVous(t("2027-10-01T09:00"), echeance)).toBeNull();
    expect(avertissementRendezVous(t("2027-10-25T09:00"), echeance)).toMatch(/retard/);
    expect(avertissementRendezVous(t("2026-11-05T09:00"), echeance)).toMatch(/avance/);
    expect(avertissementRendezVous(t("2026-11-05T09:00"), null)).toBeNull();
  });
});
