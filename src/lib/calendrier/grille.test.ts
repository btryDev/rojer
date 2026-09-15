import { describe, expect, it } from "vitest";
import { instantCivil } from "@/lib/dates";
import {
  construireGrilleAnnee,
  construireGrilleMois,
  type EvenementGrille,
} from "./grille";

/**
 * La grille range des dates civiles. Deux formes cohabitent en base et
 * doivent tomber dans la même case (ADR-011) :
 *   - la date **saisie** (« AAAA-MM-JJ »), stockée à minuit UTC ;
 *   - l'horodatage **réel** d'un événement de soirée, où l'heure de Paris
 *     et l'heure UTC ne désignent déjà plus le même jour.
 * Les tests n'utilisent donc jamais `new Date(2026, 7, 8)`, dont le
 * résultat dépend du fuseau du processus.
 */

/** Date civile telle que Prisma la rend : minuit UTC. */
const jourUtc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
/** Minuit heure de Paris — le repère des cases de la grille. */
const paris = (annee: number, mois: number, j: number, h = 0, min = 0) =>
  instantCivil(annee, mois, j, h, min);

const LE_8_AOUT = paris(2026, 8, 8);

function ev(id: string, y: number, m: number, d: number): EvenementGrille {
  return {
    id,
    libelle: `Événement ${id}`,
    equipement: `Équipement ${id}`,
    tone: "ok",
    date: paris(y, m, d, 9, 30),
  };
}

const grille = (mois: Date, evenements: EvenementGrille[] = []) =>
  construireGrilleMois({ mois, evenements, aujourdhui: LE_8_AOUT });

describe("construireGrilleMois — structure", () => {
  it("découpe le mois en semaines entières commençant le lundi", () => {
    const g = grille(LE_8_AOUT);
    for (const s of g.semaines) expect(s).toHaveLength(7);
    // 1er août 2026 = samedi → la grille ouvre le lundi 27 juillet.
    expect(g.semaines[0][0].date).toEqual(paris(2026, 7, 27));
    expect(g.semaines[0][0].dansLeMois).toBe(false);
  });

  it("couvre le mois sans ligne superflue", () => {
    // Août 2026 : 31 jours, démarre un samedi → 6 semaines.
    expect(grille(LE_8_AOUT).semaines).toHaveLength(6);
    // Février 2027 : 28 jours, démarre un lundi → 4 semaines pile.
    expect(grille(paris(2027, 2, 15)).semaines).toHaveLength(4);
    // Février 2028, bissextile : 29 jours, démarre un mardi → 5 semaines.
    expect(grille(paris(2028, 2, 15)).semaines).toHaveLength(5);
  });

  it("marque les jours du mois affiché et les jours de débordement", () => {
    const jours = grille(LE_8_AOUT).semaines.flat();
    expect(jours.filter((j) => j.dansLeMois)).toHaveLength(31);
    expect(jours[jours.length - 1].dansLeMois).toBe(false);
  });

  it("marque le jour courant, et lui seul", () => {
    const marques = grille(LE_8_AOUT)
      .semaines.flat()
      .filter((j) => j.estAujourdhui);
    expect(marques.map((j) => j.cle)).toEqual(["2026-08-08"]);
  });

  it("marque encore le bon jour tard le soir", () => {
    // 23:30 à Paris le 8 août = 21:30 UTC : le jour civil n'a pas changé.
    const g = construireGrilleMois({
      mois: LE_8_AOUT,
      evenements: [],
      aujourdhui: paris(2026, 8, 8, 23, 30),
    });
    expect(
      g.semaines.flat().filter((j) => j.estAujourdhui).map((j) => j.cle),
    ).toEqual(["2026-08-08"]);
  });

  it("ne marque aucun jour courant sur un autre mois", () => {
    const g = grille(paris(2026, 11, 3));
    expect(g.semaines.flat().some((j) => j.estAujourdhui)).toBe(false);
  });

  it("titre le mois en français, initiale capitale", () => {
    expect(grille(LE_8_AOUT).libelle).toBe("Août 2026");
    // Un 1er de mois pris à minuit à Paris tombe la veille en UTC : sans
    // fuseau explicite, le libellé annonçait le mois précédent.
    expect(grille(paris(2026, 7, 1)).libelle).toBe("Juillet 2026");
  });
});

describe("construireGrilleMois — événements", () => {
  it("range chaque événement dans sa case, quelle que soit l'heure", () => {
    const g = grille(LE_8_AOUT, [ev("a", 2026, 8, 24), ev("b", 2026, 8, 24)]);
    const jour = g.semaines.flat().find((j) => j.cle === "2026-08-24");
    expect(jour?.evenements.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("range une date saisie (minuit UTC) dans son jour civil", () => {
    // 00:00 UTC = 02:00 à Paris en été : c'est bien le 24, pas le 23.
    const g = grille(LE_8_AOUT, [
      { ...ev("saisie", 2026, 8, 24), date: jourUtc("2026-08-24") },
    ]);
    const jour = g.semaines.flat().find((j) => j.cle === "2026-08-24");
    expect(jour?.evenements.map((e) => e.id)).toEqual(["saisie"]);
  });

  it("range un événement de soirée dans le jour de Paris, pas dans celui d'UTC", () => {
    const g = grille(LE_8_AOUT, [
      { ...ev("soir", 2026, 8, 24), date: paris(2026, 8, 24, 23, 30) },
    ]);
    const jour = g.semaines.flat().find((j) => j.cle === "2026-08-24");
    expect(jour?.evenements.map((e) => e.id)).toEqual(["soir"]);
  });

  it("affiche les événements des jours de débordement sans les compter", () => {
    // 1er septembre : visible en dernière ligne d'août, mais il compte
    // pour septembre — sinon le total du mois affiché serait faux.
    const g = grille(LE_8_AOUT, [ev("sept", 2026, 9, 1)]);
    const jour = g.semaines.flat().find((j) => j.cle === "2026-09-01");
    expect(jour?.evenements).toHaveLength(1);
    expect(g.nbEvenements).toBe(0);
  });

  it("compte les événements du mois affiché", () => {
    const g = grille(LE_8_AOUT, [
      ev("a", 2026, 8, 3),
      ev("b", 2026, 8, 20),
      ev("hors", 2026, 10, 20),
    ]);
    expect(g.nbEvenements).toBe(2);
  });

  it("trie les événements d'une même journée", () => {
    const tard = { ...ev("tard", 2026, 8, 12), date: paris(2026, 8, 12, 17) };
    const tot = { ...ev("tot", 2026, 8, 12), date: paris(2026, 8, 12, 8) };
    const g = grille(LE_8_AOUT, [tard, tot]);
    const jour = g.semaines.flat().find((j) => j.cle === "2026-08-12");
    expect(jour?.evenements.map((e) => e.id)).toEqual(["tot", "tard"]);
  });
});

const annee = (
  a: number,
  evenements: EvenementGrille[] = [],
  fenetre?: { debut: Date; fin: Date },
) => construireGrilleAnnee({ annee: a, evenements, aujourdhui: LE_8_AOUT, fenetre });

describe("construireGrilleAnnee", () => {
  it("aligne douze cartes-mois, libellées en français", () => {
    const g = annee(2026);
    expect(g.mois).toHaveLength(12);
    expect(g.mois[0].libelle).toBe("Janv.");
    expect(g.mois[7].libelle).toBe("Août");
    expect(g.mois[7].mois).toEqual(paris(2026, 8, 1));
  });

  it("compte les événements par mois et par ton", () => {
    const g = annee(2026, [
      { ...ev("a", 2026, 8, 3), tone: "alerte" },
      { ...ev("b", 2026, 8, 20), tone: "warn" },
      ev("c", 2026, 8, 24),
      ev("d", 2026, 11, 2),
    ]);
    expect(g.mois[7].nbParTon).toEqual({ alerte: 1, warn: 1, ok: 1 });
    expect(g.mois[7].nbTotal).toBe(3);
    expect(g.mois[10].nbTotal).toBe(1);
    expect(g.nbEvenements).toBe(4);
  });

  it("range les dates saisies dans le bon mois, y compris le 1er", () => {
    const g = annee(2026, [
      { ...ev("premier", 2026, 9, 1), date: jourUtc("2026-09-01") },
      { ...ev("dernier", 2026, 8, 31), date: paris(2026, 8, 31, 23, 30) },
    ]);
    expect(g.mois[8].nbTotal).toBe(1);
    expect(g.mois[7].nbTotal).toBe(1);
  });

  it("ignore les événements des autres années", () => {
    const g = annee(2026, [ev("avant", 2025, 12, 31), ev("apres", 2027, 1, 1)]);
    expect(g.nbEvenements).toBe(0);
    expect(g.mois.every((m) => m.nbTotal === 0)).toBe(true);
  });

  it("marque le mois courant, sur la bonne année seulement", () => {
    expect(annee(2026).mois.map((m) => m.estMoisCourant)).toEqual(
      Array.from({ length: 12 }, (_, m) => m === 7),
    );
    expect(annee(2027).mois.some((m) => m.estMoisCourant)).toBe(false);
  });

  it("grise les mois entièrement hors de la fenêtre chargée", () => {
    // Fenêtre mai 2026 → août 2028 : janvier–avril 2026 sont hors champ,
    // mai reste dedans même si la fenêtre s'ouvre en cours de mois.
    const g = annee(2026, [], {
      debut: paris(2026, 5, 15),
      fin: paris(2028, 8, 31),
    });
    expect(g.mois.map((m) => m.dansFenetre)).toEqual(
      Array.from({ length: 12 }, (_, m) => m >= 4),
    );
  });

  it("laisse tout accessible sans fenêtre déclarée", () => {
    expect(annee(2030).mois.every((m) => m.dansFenetre)).toBe(true);
  });
});

describe("grilles — une opération en cours se pose sur sa fin", () => {
  /**
   * Relecture du 2026-09-15 : la vue calendrier du tableau de bord posait une
   * opération démarrée en mars à son début, quand la page Calendrier la range
   * au mois de sa fin — la tuile de mars grisée, septembre vide.
   */
  const AUJ = paris(2026, 9, 15, 12);
  const operation = (tone: EvenementGrille["tone"]): EvenementGrille => ({
    id: `op-${tone}`,
    libelle: "Permis de feu n°3 — Cuisine",
    equipement: "travaux par point chaud",
    tone,
    date: jourUtc("2026-03-12"),
    dateFin: jourUtc("2026-09-25"),
    famille: "operations",
  });

  it("vue année : au mois de sa fin, démarrée sans alerte", () => {
    const g = construireGrilleAnnee({
      annee: 2026,
      evenements: [operation("ok")],
      aujourdhui: AUJ,
    });
    expect(g.mois[2].nbTotal).toBe(0);
    expect(g.mois[8].nbParTon.ok).toBe(1);
  });

  it("vue mois : sur le jour de sa fin", () => {
    const septembre = construireGrilleMois({
      mois: AUJ,
      evenements: [operation("ok")],
      aujourdhui: AUJ,
    });
    const jour = septembre.semaines.flat().find((j) => j.evenements.length > 0);
    expect(jour?.cle).toBe("2026-09-25");
    expect(septembre.nbEvenements).toBe(1);
  });

  it("en alerte sur un début manqué, elle garde son début", () => {
    const g = construireGrilleAnnee({
      annee: 2026,
      evenements: [
        {
          ...operation("alerte"),
          date: jourUtc("2026-09-01"),
          dateFin: jourUtc("2026-10-25"),
        },
      ],
      aujourdhui: AUJ,
    });
    expect(g.mois[8].nbParTon.alerte).toBe(1);
    expect(g.mois[9].nbTotal).toBe(0);
  });
});
