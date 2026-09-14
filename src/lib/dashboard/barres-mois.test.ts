import { describe, expect, it } from "vitest";
import { instantCivil } from "@/lib/dates";
import { repartirParMois } from "./barres-mois";

/** 10 septembre 2026, 8 h à Paris. */
const NOW = instantCivil(2026, 9, 10, 8);
const le = (mois: number, jour: number, annee = 2026) =>
  instantCivil(annee, mois, jour);

const ligne = (o: {
  datePrevue: Date;
  statut?: string;
  periodicite?: string;
  archiveLe?: Date;
  rapports?: Date[];
}) => ({
  statut: o.statut ?? "planifiee",
  datePrevue: o.datePrevue,
  periodicite: o.periodicite ?? "trimestrielle",
  archiveLe: o.archiveLe ?? null,
  libelleObligation: "Vérification trimestrielle",
  rapportsRealises: (o.rapports ?? []).map((dateRapport) => ({ dateRapport })),
});

const segments = (b: { couvert: number; aVenir: number; retard: number }) => [
  b.couvert,
  b.aVenir,
  b.retard,
];

describe("repartirParMois — chaque rapport réalisé compte dans son mois", () => {
  it("une trimestrielle contrôlée en mars puis en juin garde sa barre de mars", () => {
    // LE SCÉNARIO DE LA RELECTURE SYSTÈME DU 2026-09-14. La barre ne lisait que
    // le dernier rapport : au dépôt de juin, mars retombait à 0.
    const barres = repartirParMois(
      [ligne({ datePrevue: le(9, 15), rapports: [le(3, 12), le(6, 11)] })],
      2026,
      NOW,
    ).mois;
    expect(barres[2].couvert).toBe(1);
    expect(barres[5].couvert).toBe(1);
    // L'échéance ouverte, au 15/09, dans « à venir » — et nulle part ailleurs.
    expect(segments(barres[8])).toEqual([0, 1, 0]);
    // Rien de compté deux fois : deux faits, une échéance.
    const total = barres.reduce((n, b) => n + b.couvert + b.aVenir + b.retard, 0);
    expect(total).toBe(3);
  });

  it("deux rapports du même mois comptent deux contrôles", () => {
    const barres = repartirParMois(
      [
        ligne({
          datePrevue: le(9, 20),
          periodicite: "hebdomadaire",
          rapports: [le(9, 6), le(9, 13)],
        }),
      ],
      2026,
      NOW,
    ).mois;
    expect(segments(barres[8])).toEqual([2, 1, 0]);
  });

  it("ne pose que les rapports de l'année demandée", () => {
    const barres = repartirParMois(
      [ligne({ datePrevue: le(3, 1, 2027), rapports: [le(12, 1, 2025), le(4, 2)] })],
      2026,
      NOW,
    ).mois;
    expect(barres.reduce((n, b) => n + b.couvert, 0)).toBe(1);
    expect(barres[3].couvert).toBe(1);
  });

  it("l'échéance ouverte manquée reste en retard au mois dû, les faits d'avant restent couverts", () => {
    // Les segments « retard » et « à venir » ne changent pas : ils comptent
    // l'échéance OUVERTE, une par ligne.
    const barres = repartirParMois(
      [ligne({ datePrevue: le(6, 1), rapports: [le(3, 1)] })],
      2026,
      NOW,
    ).mois;
    expect(segments(barres[2])).toEqual([1, 0, 0]);
    expect(segments(barres[5])).toEqual([0, 0, 1]);
  });

  it("une ponctuelle consommée sans rapport garde son repli sur la date prévue", () => {
    const barres = repartirParMois(
      [
        ligne({
          datePrevue: le(2, 10),
          statut: "realisee_conforme",
          periodicite: "mise_en_service_uniquement",
        }),
      ],
      2026,
      NOW,
    ).mois;
    expect(segments(barres[1])).toEqual([1, 0, 0]);
  });

  it("une ponctuelle dont le rapport est hors de l'année ne se replie pas dans l'année", () => {
    const barres = repartirParMois(
      [
        ligne({
          datePrevue: le(2, 10),
          statut: "realisee_conforme",
          periodicite: "mise_en_service_uniquement",
          rapports: [le(12, 20, 2025)],
        }),
      ],
      2026,
      NOW,
    ).mois;
    expect(barres.every((b) => b.couvert === 0)).toBe(true);
  });

  it("une ligne sans échéance connue n'occupe aucun mois et reste comptée dans son année", () => {
    const { mois, sansEcheance } = repartirParMois(
      [
        ligne({ datePrevue: le(9, 1), statut: "a_planifier" }),
        ligne({ datePrevue: le(9, 20), statut: "a_planifier" }),
        // Générée l'an dernier : hors de l'année demandée, et pourtant en
        // retard AUJOURD'HUI — comptée dans l'année en cours.
        ligne({ datePrevue: le(12, 1, 2025), statut: "a_planifier" }),
        // Une vraie échéance, pour la contre-épreuve.
        ligne({ datePrevue: le(8, 1) }),
      ],
      2026,
      NOW,
    );
    expect(sansEcheance).toEqual({ retard: 2, aVenir: 1 });
    expect(mois.reduce((n, b) => n + b.aVenir + b.retard, 0)).toBe(1);
    expect(mois[7].retard).toBe(1);
  });

  it("un retard d'une année passée ne se reporte que sur l'année en cours", () => {
    const sansDate = [ligne({ datePrevue: le(12, 1, 2025), statut: "a_planifier" })];
    // Vue de 2026, l'année de NOW : dû maintenant, compté.
    expect(repartirParMois(sansDate, 2026, NOW).sansEcheance.retard).toBe(1);
    // Vue d'une année future : rien n'y est en retard.
    expect(repartirParMois(sansDate, 2027, NOW).sansEcheance.retard).toBe(0);
  });

  it("un retard DATÉ de l'an dernier compte dans l'année en cours, hors des barres", () => {
    // Relecture système du 2026-09-14 : un extincteur dont l'échéance
    // d'octobre dernier est manquée faisait dire « 0 en retard » à l'anneau
    // 2026, sous un bandeau « 1 en retard ».
    const datee = [ligne({ datePrevue: le(10, 1, 2025) })];
    const vue2026 = repartirParMois(datee, 2026, NOW);
    expect(vue2026.retardsAnterieurs).toBe(1);
    expect(vue2026.sansEcheance.retard).toBe(0);
    expect(vue2026.mois.every((b) => b.retard === 0)).toBe(true);
    // Vue de 2025 : il reste sur son mois, et n'est pas « antérieur ».
    const vue2025 = repartirParMois(datee, 2025, NOW);
    expect(vue2025.mois[9].retard).toBe(1);
    expect(vue2025.retardsAnterieurs).toBe(0);
    // Vue de 2027 : rien.
    expect(repartirParMois(datee, 2027, NOW).retardsAnterieurs).toBe(0);
  });

  it("une ligne archivée garde tous ses faits et ne pose aucune échéance", () => {
    const barres = repartirParMois(
      [
        ligne({
          datePrevue: le(9, 1),
          archiveLe: le(8, 1),
          rapports: [le(2, 1), le(5, 1)],
        }),
      ],
      2026,
      NOW,
    ).mois;
    expect(barres[1].couvert).toBe(1);
    expect(barres[4].couvert).toBe(1);
    expect(barres.every((b) => b.aVenir === 0 && b.retard === 0)).toBe(true);
  });
});
