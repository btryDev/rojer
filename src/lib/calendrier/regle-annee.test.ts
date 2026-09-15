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

const verif = (
  datePrevue: string,
  statut: string,
  derniereRealisation: string | null = null,
) => ({
  statut,
  datePrevue: jour(datePrevue),
  periodicite: "annuelle",
  archiveLe: null,
  libelleObligation: "Vérification périodique des installations électriques",
  derniereRealisation: derniereRealisation ? jour(derniereRealisation) : null,
});

const regle = (
  autres: EcheanceCalendrier[],
  verifs: ReturnType<typeof verif>[] = [],
  annee = 2026,
) => {
  const lignes = lignesDuCalendrier(verifs, autres, AUJOURDHUI);
  const parMois = rangerParMois(lignes);
  return { lignes, parMois, mois: regleDeLAnnee(parMois, annee, AUJOURDHUI) };
};

describe("règle annuelle — où se range une opération en cours", () => {
  /**
   * CONTRÔLE VISUEL, 2026-09-15. Une opération démarrée en mars et finissant
   * dans dix jours comptait « sous 30 j » dans le segment de MARS : l'état se
   * lisait sur sa fin (`etatAutreEcheance`), le mois sur son début. La ligne
   * se range désormais à sa date en jeu, et la liste mensuelle avec elle.
   */
  it("démarrée sans alerte, elle se range au mois de sa fin, liste comprise", () => {
    const { lignes, parMois, mois } = regle([permis("2026-03-12", "2026-09-25")]);
    // La ligne sait qu'elle est posée sur la fin : l'écran le dit en tête.
    expect(lignes[0]).toMatchObject({ genre: "autre", fin: true, etat: "proche" });

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
    const { lignes, mois } = regle([
      permis("2026-10-05", "2026-12-20"),
      permis("2026-09-01", "2026-11-30", "alerte"),
    ]);
    expect(mois[9]).toMatchObject({ cle: "2026-10", proche: 1 });
    expect(mois[8]).toMatchObject({ cle: "2026-09", enRetard: 1 });
    expect(mois[11]).toMatchObject({ proche: 0, lointain: 0, enRetard: 0 });
    expect(lignes.map((l) => l.genre === "autre" && l.fin)).toEqual([false, false]);
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

describe("règle annuelle — les vérifications", () => {
  it("un retard sans échéance connue n'a pas de barre : il se compte « sans date »", () => {
    // Sa date est celle de la génération de la ligne (`aUnRendezVous`).
    const { mois } = regle([], [verif("2026-09-01", "a_planifier")]);
    expect(mois[8]).toMatchObject({
      cle: "2026-09",
      enRetard: 0,
      proche: 0,
      lointain: 0,
      faite: 0,
      sansDate: 1,
      retardSansDate: 1,
    });
  });

  it("une échéance connue et passée est une barre « dépassée »", () => {
    const { mois } = regle([], [verif("2026-08-20", "planifiee")]);
    expect(mois[7]).toMatchObject({ enRetard: 1, sansDate: 0, retardSansDate: 0 });
  });

  it("un rapport daté pose le fait à son jour, et l'échéance ouverte à la sienne", () => {
    const lignes = [verif("2027-03-10", "planifiee", "2026-03-10")];
    expect(regle([], lignes).mois[2]).toMatchObject({ faite: 1, lointain: 0 });
    expect(regle([], lignes, 2027).mois[2]).toMatchObject({
      cle: "2027-03",
      faite: 0,
      lointain: 1,
    });
  });
});
