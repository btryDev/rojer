import { describe, expect, it } from "vitest";
import type { Realisateur } from "@prisma/client";
import { depuisSaisieDateHeure } from "@/lib/dates";
import {
  agrementExige,
  avertissementAgrement,
  avertissementRendezVous,
  rangerAnnuaire,
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
    const now = t("2026-11-01T08:00");
    const avant = { rendezVousLe: t("2026-11-05T09:30"), datePrevue: t("2027-10-20T00:00"), prestataire: null };
    expect(pastilleRendezVous(avant, now, true)).toMatchObject({ passe: false, court: expect.stringMatching(/^Échéance /) });
    const apres = { rendezVousLe: t("2027-12-12T09:30"), datePrevue: t("2027-10-20T00:00"), prestataire: null };
    expect(pastilleRendezVous(apres, now, true)).toMatchObject({ passe: true, court: expect.stringMatching(/après l'échéance$/) });
    expect(pastilleRendezVous(avant, t("2026-11-20T08:00"), true)).toMatchObject({ court: "RDV passé", passe: true });
    expect(pastilleRendezVous({ rendezVousLe: null, datePrevue: t("2027-10-20T00:00") }, now, true)).toBeNull();
  });

  it("une ligne « à planifier » n'a pas d'échéance à dépasser : le rendez-vous n'y est jamais « après »", () => {
    const v = { rendezVousLe: t("2026-11-12T09:00"), datePrevue: t("2026-09-01T00:00"), prestataire: null };
    expect(pastilleRendezVous(v, t("2026-10-24T08:00"), false)).toMatchObject({ passe: false, court: expect.stringMatching(/^RDV /) });
    expect(datePoseeAuCalendrier(v, { date: v.datePrevue, lecture: "courante", registre: "aPlanifier" }, t("2026-10-24T08:00"), false)).toBe(
      v.rendezVousLe,
    );
    // Restée « à planifier » au-delà du lendemain, elle est en retard : le
    // rendez-vous la pose quand même, son état reste celui de la ligne.
    expect(datePoseeAuCalendrier(v, { date: v.datePrevue, lecture: "courante", registre: "enRetard" }, t("2026-10-24T08:00"), false)).toBe(
      v.rendezVousLe,
    );
  });

  it("le calendrier pose l'échéance ouverte au jour d'un rendez-vous À VENIR qui la précède, et seulement alors", () => {
    const now = t("2026-10-24T08:00");
    const v = { rendezVousLe: t("2026-11-05T09:30"), datePrevue: t("2027-10-20T00:00") };
    const courante = { date: v.datePrevue, lecture: "courante", registre: "planifiee" };
    expect(datePoseeAuCalendrier(v, courante, now, true)).toBe(v.rendezVousLe);
    // Le jour même de l'échéance : encore avant.
    const jourJ = { ...v, rendezVousLe: t("2027-10-20T15:00") };
    expect(datePoseeAuCalendrier(jourJ, courante, now, true)).toBe(jourJ.rendezVousLe);
    // Après l'échéance, en retard, pour un rapport fait, ou passé sans rapport : la date de la lecture.
    expect(datePoseeAuCalendrier({ ...v, rendezVousLe: t("2027-10-21T09:00") }, courante, now, true)).toBe(v.datePrevue);
    expect(datePoseeAuCalendrier(v, { ...courante, registre: "enRetard" }, now, true)).toBe(v.datePrevue);
    expect(datePoseeAuCalendrier(v, { ...courante, lecture: "realisation" }, now, true)).toBe(v.datePrevue);
    expect(datePoseeAuCalendrier(v, courante, t("2026-11-20T08:00"), true)).toBe(v.datePrevue);
  });

  it("le formulaire signale un rendez-vous après l'échéance ou très en avance, sans bloquer", () => {
    const echeance = t("2027-10-20T00:00");
    expect(avertissementRendezVous(t("2027-10-01T09:00"), echeance)).toBeNull();
    expect(avertissementRendezVous(t("2027-10-25T09:00"), echeance)).toMatch(/retard/);
    expect(avertissementRendezVous(t("2026-11-05T09:00"), echeance)).toMatch(/avance/);
    expect(avertissementRendezVous(t("2026-11-05T09:00"), null)).toBeNull();
  });
});

describe("l'agrément du prestataire attitré", () => {
  it("n'est exigé que si l'organisme agréé est le seul réalisateur admis", () => {
    const ligne = (realisateurRequis: Realisateur[], obligationId = "elec-erp-annuelle") => ({
      realisateurRequis,
      obligationId,
    });
    expect(agrementExige(ligne(["organisme_agree"]))).toBe(true);
    expect(agrementExige(ligne(["personne_qualifiee", "organisme_agree"]))).toBe(false);
    expect(agrementExige(ligne(["organisme_agree", "bureau_controle"]))).toBe(false);
    expect(agrementExige(ligne(["organisme_accredite"]))).toBe(false);
    expect(agrementExige(ligne([]))).toBe(false);
  });

  it("ne vise pas la visite de la commission de sécurité, qui n'est pas un prestataire", () => {
    expect(
      agrementExige({ realisateurRequis: ["organisme_agree"], obligationId: "incendie-erp-5-visite-commission" }),
    ).toBe(false);
  });

  it("signale un prestataire non déclaré agréé, et rien d'autre", () => {
    const apave = { raisonSociale: "Apave", estOrganismeAgree: true };
    const artisan = { raisonSociale: "Élec Martin", estOrganismeAgree: false };
    expect(avertissementAgrement(true, artisan)).toContain("Élec Martin n'est pas déclaré agréé");
    expect(avertissementAgrement(true, apave)).toBeNull();
    expect(avertissementAgrement(false, artisan)).toBeNull();
    expect(avertissementAgrement(true, null)).toBeNull();
  });
});

describe("le rangement de l'annuaire du prestataire attitré", () => {
  const a = { id: "a", couvre: false, estOrganismeAgree: true };
  const b = { id: "b", couvre: true, estOrganismeAgree: false };
  const vue = (g: ReturnType<typeof rangerAnnuaire<typeof a>>) => g.map((x) => [x.label, x.items.map((p) => p.id)]);

  it("par agrément quand le contrôle l'exige, par domaine sinon", () => {
    expect(vue(rangerAnnuaire([a, b], true))).toEqual([
      ["Organismes agréés", ["a"]],
      ["Non déclarés agréés", ["b"]],
    ]);
    expect(vue(rangerAnnuaire([a, b], false))).toEqual([
      ["Couvrent ce contrôle", ["b"]],
      ["Autres prestataires", ["a"]],
    ]);
  });

  it("omet les groupes vides, et dit « Votre annuaire » quand rien ne couvre le domaine", () => {
    expect(vue(rangerAnnuaire([a], false))).toEqual([["Votre annuaire", ["a"]]]);
    expect(vue(rangerAnnuaire([], true))).toEqual([]);
  });
});
