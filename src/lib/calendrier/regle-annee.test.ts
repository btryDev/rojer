import { describe, expect, it } from "vitest";
import type { EcheanceCalendrier } from "./echeances";
import {
  lignesDuCalendrier,
  rangerParMois,
  regleDeLAnnee,
} from "./regle-annee";

/** Le 15 septembre 2026, à midi à Paris. */
const AUJOURDHUI = new Date("2026-09-15T10:00:00.000Z");
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const permis = (
  debut: string,
  fin: string,
  tone: "alerte" | "ok" = "ok",
): EcheanceCalendrier => ({
  id: `permis-feu-${debut}`,
  type: "permis-feu",
  famille: "operations",
  libelle: "Permis de feu n°1 — Cuisine",
  origine: "travaux par point chaud",
  date: jour(debut),
  dateFin: jour(fin),
  tone,
  href: "/permis-feu/1",
  batiment: null,
});

type SansVerif = Parameters<typeof lignesDuCalendrier>[0][number];

const regle = (autres: EcheanceCalendrier[]) => {
  const parMois = rangerParMois(
    lignesDuCalendrier<SansVerif>([], autres, AUJOURDHUI),
  );
  return { parMois, mois: regleDeLAnnee(parMois, 2026, AUJOURDHUI) };
};

describe("règle annuelle — où se range une opération en cours", () => {
  /**
   * CONTRÔLE VISUEL, 2026-09-15. Une opération démarrée en mars et finissant
   * dans dix jours comptait « sous 30 j » dans le segment de MARS : l'état se
   * lisait sur sa fin (`etatAutreEcheance`), le mois sur son début. La ligne
   * se range désormais à sa date en jeu, et la liste mensuelle avec elle.
   */
  it("démarrée sans alerte, elle se range au mois de sa fin, liste comprise", () => {
    const { parMois, mois } = regle([permis("2026-03-12", "2026-09-25")]);

    expect(mois[8]).toMatchObject({ cle: "2026-09", proche: 1 });
    expect(mois[2]).toMatchObject({
      cle: "2026-03",
      enRetard: 0,
      proche: 0,
      lointain: 0,
      faite: 0,
    });
    // La section du mois compte ce que son segment compte.
    expect([...parMois.keys()]).toEqual(["2026-09"]);
    expect(parMois.get("2026-09")?.[0].date).toEqual(jour("2026-09-25"));
  });

  it("à venir, ou en alerte sur un début manqué, elle reste au mois de son début", () => {
    const { mois } = regle([
      permis("2026-10-05", "2026-12-20"),
      permis("2026-09-01", "2026-11-30", "alerte"),
    ]);
    expect(mois[9]).toMatchObject({ cle: "2026-10", proche: 1 });
    expect(mois[8]).toMatchObject({ cle: "2026-09", enRetard: 1 });
    expect(mois[11]).toMatchObject({ proche: 0, lointain: 0, enRetard: 0 });
  });

  it("une échéance sans fin se range à sa date", () => {
    const attestation: EcheanceCalendrier = {
      ...permis("2026-11-02", "2026-11-02"),
      type: "attestation",
      famille: "papiers",
      dateFin: undefined,
    };
    const { mois } = regle([attestation]);
    expect(mois[10]).toMatchObject({ cle: "2026-11", lointain: 1 });
  });
});
