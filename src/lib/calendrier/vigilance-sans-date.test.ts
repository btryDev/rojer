import { describe, expect, it } from "vitest";
import type { Prestataire } from "@prisma/client";
import { echeancesPrestataire } from "./echeances";
import { repartirRetards, repartirSous30j } from "./retards";
import { fusionnerEvenements } from "./evenements";
import { lignesDuCalendrier, rangerParMois, regleDeLAnnee } from "./regle-annee";
import { computeVigilance, ventilerVigilance } from "@/lib/prestataires/vigilance";

/**
 * UNE DATE ABSENTE N'EST PAS UN RETARD (contre-lecture du 2026-09-27).
 *
 * Un dossier dont toutes les attestations sont « à dater » — pièce déposée,
 * remise et émission non renseignées — doit avoir ZÉRO retard compté, sur
 * chaque surface qui additionne, et pourtant au moins une entrée au
 * calendrier : un geste est dû. Le cas « rien déposé depuis plus de six
 * mois », lui, est un retard constaté et compté — la borne haute, sans
 * laquelle un calendrier qui ne compterait plus rien passerait ce test.
 */
const NOW = new Date("2026-08-10T07:00:00Z");
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const SANS_VERIFS = { verification: 0, "titre-salarie": 0 };

function fiche(id: string, p: Partial<Prestataire> = {}): Prestataire {
  return {
    id,
    etablissementId: "e1",
    raisonSociale: `Presta ${id}`,
    siret: null,
    estOrganismeAgree: false,
    domaines: [],
    contactNom: "Nom",
    contactEmail: "a@b.fr",
    contactTelephone: null,
    attestationUrssafCle: `urssaf/${id}`,
    attestationUrssafNom: null,
    attestationUrssafValableJusquA: jour("2030-12-31"),
    attestationUrssafRemiseLe: null,
    attestationUrssafEmiseLe: null,
    assuranceRcProCle: null,
    assuranceRcProNom: null,
    assuranceRcProValableJusquA: jour("2027-06-30"),
    kbisCle: null,
    kbisNom: null,
    kbisDateEmission: null,
    notesInternes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...p,
  };
}

function lire(prestataires: Prestataire[]) {
  const autres = prestataires.flatMap((p) => echeancesPrestataire(p, NOW, "e1"));
  const lignes = lignesDuCalendrier([], autres, NOW);
  const regle = regleDeLAnnee(rangerParMois(lignes), 2026, NOW);
  return {
    autres,
    retards: repartirRetards(autres, SANS_VERIFS),
    sous30j: repartirSous30j(autres, SANS_VERIFS, NOW),
    grille: fusionnerEvenements({ verifications: [], autres, etablissementId: "e1" }),
    regleEnRetard: regle.reduce((n, m) => n + m.enRetard, 0),
    regleSansDate: regle.reduce((n, m) => n + (m.sansDate ?? 0), 0),
    vigilance: ventilerVigilance(
      prestataires.map((p) => computeVigilance(p, NOW).etatLePlusGrave),
    ),
  };
}

describe("un dossier dont toutes les attestations sont « à dater »", () => {
  const dossier = [fiche("a"), fiche("b"), fiche("c")];

  it("les fixtures sont bien « à dater »", () => {
    for (const p of dossier) expect(computeVigilance(p, NOW).urssaf).toBe("a_dater");
  });

  it("a au moins une entrée au calendrier, jamais « ok »", () => {
    const { autres } = lire(dossier);
    const urssaf = autres.filter((e) => e.id.endsWith("-urssaf"));
    expect(urssaf.length).toBe(3);
    for (const e of urssaf) {
      expect(e.tone).toBe("alerte");
      expect(e.sansEcheance).toBe(true);
      expect(e.origine).toContain("non renseignée");
    }
  });

  it("n'a AUCUN retard compté, sur aucune surface qui additionne", () => {
    const l = lire(dossier);
    expect(l.retards.total).toBe(0);
    expect(l.retards.parFamille.papiers).toBe(0);
    expect(l.sous30j.total).toBe(0);
    expect(l.grille.filter((e) => e.tone === "alerte")).toEqual([]);
    expect(l.regleEnRetard).toBe(0);
    expect(l.vigilance.enRetard).toBe(0);
    // Annoncée à part, comme une vérification sans date.
    expect(l.regleSansDate).toBe(3);
    expect(l.vigilance.aPlanifier).toBe(3);
  });

  it("borne haute : rien déposé depuis plus de six mois, c'est un retard compté", () => {
    const l = lire([fiche("d", { updatedAt: new Date("2026-01-15T07:00:00Z") })]);
    expect(l.retards.parFamille.papiers).toBe(1);
    expect(l.regleEnRetard).toBe(1);
    expect(l.vigilance.enRetard).toBe(1);
  });
});
