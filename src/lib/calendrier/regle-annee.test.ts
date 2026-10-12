import { describe, expect, it } from "vitest";
import type { EcheanceCalendrier } from "./echeances";
import {
  lignesDuCalendrier,
  rangerParMois,
  regleDeLAnnee,
} from "./regle-annee";
import { AUCUNE_PRUDENCE, type RetenueParPrudence } from "./prudence";
import { repartirVerifications } from "@/lib/pdf/etat-verifications";

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
  graceJusquAu: null,
  libelleObligation: "Vérification périodique des installations électriques",
  derniereRealisation: derniereRealisation ? jour(derniereRealisation) : null,
  obligationId: "elec-travail-periodique-annuelle",
  prescriptionId: null as string | null,
});

const regle = (
  autres: EcheanceCalendrier[],
  verifs: ReturnType<typeof verif>[] = [],
  annee = 2026,
  prudence: RetenueParPrudence = AUCUNE_PRUDENCE,
) => {
  const lignes = lignesDuCalendrier(verifs, autres, AUJOURDHUI, prudence);
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

describe("règle annuelle — une échéance retenue par prudence (D26, 2026-10-12)", () => {
  // Le bandeau et le rail la sortent des retards (D1 (a)) ; l'en-tête rouge du
  // mois, la règle et le mois déplié à l'arrivée lisaient `registre ===
  // "enRetard"` et la comptaient encore. Le registre dit « à confirmer ».
  const toutEstPrudent: RetenueParPrudence = () => true;

  it("ne compte pas en retard une échéance passée que seul le silence retient", () => {
    const { lignes, mois } = regle([], [verif("2026-06-01", "planifiee")], 2026, toutEstPrudent);
    expect(lignes.map((l) => l.genre === "verif" && l.registre)).toEqual(["aConfirmer"]);
    expect(mois[5].enRetard).toBe(0);
    // Elle n'a pas d'état de barre : ni rouge, ni un autre.
    expect(mois[5].proche + mois[5].lointain + mois[5].faite).toBe(0);
  });

  it("la même échéance, sans prudence, reste en retard", () => {
    const { lignes, mois } = regle([], [verif("2026-06-01", "planifiee")]);
    expect(lignes.map((l) => l.genre === "verif" && l.registre)).toEqual(["enRetard"]);
    expect(mois[5].enRetard).toBe(1);
  });

  it("sans échéance connue, elle reste « sans date » mais pas un retard sans date", () => {
    const { mois } = regle([], [verif("2026-06-01", "a_planifier")], 2026, toutEstPrudent);
    expect(mois[5].sansDate).toBe(1);
    expect(mois[5].retardSansDate).toBe(0);
  });

  it("une échéance à venir n'est pas touchée : la prudence ne vise que le retard", () => {
    const { lignes } = regle([], [verif("2026-12-01", "planifiee")], 2026, toutEstPrudent);
    expect(lignes.map((l) => l.genre === "verif" && l.registre)).toEqual(["lointain"]);
  });
});

describe("pas de double compte : l'en-tête des mois dit le retard du bandeau (D26)", () => {
  // Le bandeau du calendrier, le rail et le tableau de bord lisent
  // `repartirVerifications` (`compterEtatCalendrier` → `repartirRetards`). Les
  // en-têtes rouges des mois lisent le registre des lignes : la somme des
  // seconds doit valoir le premier, prudence comprise.
  it("somme des « en retard » des mois = retards de repartirVerifications", () => {
    const verifs = [
      { ...verif("2026-03-01", "planifiee"), obligationId: "prudente" },
      { ...verif("2026-04-01", "planifiee"), obligationId: "certaine" },
      { ...verif("2026-05-01", "a_planifier"), obligationId: "prudente" },
      { ...verif("2026-06-01", "a_planifier"), obligationId: "certaine" },
      { ...verif("2026-11-01", "planifiee"), obligationId: "prudente" },
      { ...verif("2026-07-01", "planifiee"), obligationId: "prudente", prescriptionId: "p" },
    ];
    const prudence: RetenueParPrudence = (v) =>
      v.prescriptionId === null && v.obligationId === "prudente";
    const { lignes } = regle([], verifs, 2026, prudence);
    const enTetes = lignes.filter((l) => l.genre === "verif" && l.registre === "enRetard").length;
    const bandeau = repartirVerifications(verifs, AUJOURDHUI, prudence).enRetard.length;
    expect(enTetes).toBe(bandeau);
    expect(bandeau).toBe(3);
  });
});
