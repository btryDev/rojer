// Un état permanent établi d'après les titres déclarés (audit du 2026-10-16).
//
// Le défaut fermé : l'habilitation se cochait « en place » sans lire les
// titres, et le dossier remis à l'inspecteur pouvait la dire en place à côté
// d'un titre expiré. Ces tests prennent les cas qui le montraient.

import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { titreParId } from "@/lib/salaries/catalogue";
import { etatParLesTitres, titreDuDouble } from "./par-les-titres";

const ligne = (id: string) => {
  const o = obligationsConformite.find((x) => x.id === id);
  if (!o) throw new Error(`${id} a quitté le référentiel`);
  return o;
};
const habilitation = titreParId("elec-salarie-habilitation")!;
const NOW = new Date("2026-10-16T10:00:00Z");
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("titreDuDouble — à quelle ligne la règle s'applique", () => {
  it("l'habilitation du personnel est établie d'après le titre de chaque personne", () => {
    expect(titreDuDouble(ligne("elec-travail-habilitation-personnel"))).toBe(
      "elec-salarie-habilitation",
    );
  });

  it("une transmission ordinaire ne suffit pas : le carnet, le CSE, les secours se déclarent", () => {
    // « CSE en place » ne se déduit pas d'une formation SST, ni le carnet
    // d'une habilitation : ce sont d'autres obligations.
    for (const id of [
      "elec-travail-carnet-prescriptions",
      "prevention-etablissement-cse",
      "secours-etablissement-mesures",
      "prevention-etablissement-salarie-designe",
    ]) {
      expect(titreDuDouble(ligne(id)), id).toBeNull();
    }
  });
});

describe("etatParLesTitres — ce que la ligne affirme", () => {
  it("aucun titre déclaré : pas en place, et la phrase dit où les déclarer", () => {
    const e = etatParLesTitres(habilitation, [], NOW);
    expect(e.enPlace).toBe(false);
    expect(e.phrase).toContain("aucun titre « Habilitation électrique du travailleur désigné »");
    expect(e.phrase).toContain("fiche Équipe");
  });

  it("un titre dont l'échéance n'est pas dépassée : en place", () => {
    const e = etatParLesTitres(
      habilitation,
      [{ personne: "Léa Martin", delivreLe: jour("2025-03-01"), echeanceLe: null }],
      NOW,
    );
    expect(e.enPlace).toBe(true);
    expect(e.phrase).toBe("Établi d'après les titres déclarés : 1 titre, aucune échéance dépassée.");
  });

  it("le seul titre a dépassé ses 3 ans : PAS en place, et la personne est nommée", () => {
    // Le cas du dossier contradictoire : délivré le 1er juin 2022, recyclage
    // dû le 1er juin 2025 (NF C 18-510, relevé par le préventeur).
    const e = etatParLesTitres(
      habilitation,
      [{ personne: "Léa Martin", delivreLe: jour("2022-06-01"), echeanceLe: null }],
      NOW,
    );
    expect(e.enPlace).toBe(false);
    expect(e.phrase).toMatch(
      /^Établi d'après les titres déclarés : 1 titre ; Léa Martin : échéance calculée dépassée le 0?1\/06\/2025\.$/,
    );
  });

  it("une date de fin saisie prime sur le calcul", () => {
    const e = etatParLesTitres(
      habilitation,
      [{ personne: "Léa Martin", delivreLe: jour("2022-06-01"), echeanceLe: jour("2027-01-01") }],
      NOW,
    );
    expect(e.enPlace).toBe(true);
  });

  it("une date de fin saisie et dépassée se dit « déclarée »", () => {
    const e = etatParLesTitres(
      habilitation,
      [{ personne: "Léa Martin", delivreLe: jour("2024-06-01"), echeanceLe: jour("2026-01-01") }],
      NOW,
    );
    expect(e.enPlace).toBe(false);
    expect(e.phrase).toContain("Léa Martin : échéance déclarée dépassée le");
  });

  it("un titre dont l'échéance n'est pas dépassée et un autre dont elle l'est : en place, et le second reste nommé", () => {
    const e = etatParLesTitres(
      habilitation,
      [
        { personne: "Léa Martin", delivreLe: jour("2025-03-01"), echeanceLe: null },
        { personne: "Tom Petit", delivreLe: jour("2021-01-10"), echeanceLe: null },
      ],
      NOW,
    );
    expect(e.enPlace).toBe(true);
    expect(e.phrase).toMatch(/: 2 titres ; Tom Petit : échéance calculée dépassée le/);
  });

  it("ne dit jamais que tout le personnel est habilité : Rojer ne sait pas qui intervient", () => {
    const e = etatParLesTitres(
      habilitation,
      [{ personne: "Léa Martin", delivreLe: jour("2025-03-01"), echeanceLe: null }],
      NOW,
    );
    expect(e.phrase).toMatch(/^Établi d'après les titres déclarés/);
    // Ni « à jour » (affirmation de conformité), ni « expiré » (état de
    // droit, quand le triennal vient d'une norme) : les mots de la fiche.
    for (const titres of [
      [{ personne: "Léa Martin", delivreLe: jour("2025-03-01"), echeanceLe: null }],
      [{ personne: "Léa Martin", delivreLe: jour("2022-06-01"), echeanceLe: null }],
    ]) {
      expect(etatParLesTitres(habilitation, titres, NOW).phrase).not.toMatch(
        /tout le personnel|tous habilités|conforme|à jour|expir|renouvel/i,
      );
    }
  });
});
