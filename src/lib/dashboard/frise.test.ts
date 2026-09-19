import { describe, expect, it } from "vitest";
import { instantCivil } from "@/lib/dates";
import {
  CADRAGE_INITIAL,
  construireFrise,
  ECART_MIN_PX,
  PX_PAR_JOUR,
  type EvenementFrise,
} from "./frise";

const LE_8_AOUT = new Date(2026, 7, 8);

function ev(
  id: string,
  dansNJours: number,
  tone: EvenementFrise["tone"] = "ok",
): EvenementFrise {
  const d = new Date(LE_8_AOUT);
  d.setDate(d.getDate() + dansNJours);
  return {
    id,
    libelle: `Événement ${id}`,
    equipement: `Équipement ${id}`,
    tone,
    date: d,
  };
}

const frise = (
  evenements: EvenementFrise[],
  echelle: "jours" | "mois" = "jours",
) => construireFrise({ evenements, aujourdhui: LE_8_AOUT, echelle });

/** Distance en pixels correspondant à N jours à l'échelle « jours ». */
const px = (jours: number) => jours * PX_PAR_JOUR.jours;

describe("construireFrise — fenêtre", () => {
  it("ouvre trois mois avant et deux ans après, sur des mois entiers", () => {
    const f = frise([]);
    // 8 août − 90 j = 10 mai → la fenêtre démarre au 1er mai.
    expect(f.debut).toEqual(new Date(2026, 4, 1));
    // 8 août + 730 j = 8 août 2028 → la fenêtre finit fin août 2028.
    expect(f.fin).toEqual(new Date(2028, 7, 31));
  });

  it("place aujourd'hui à sa distance réelle du début de fenêtre", () => {
    // Du 1er mai au 8 août 2026 : 31 + 30 + 31 + 7 = 99 jours.
    expect(frise([]).xAujourdhui).toBe(px(99));
  });

  it("dimensionne l'axe sur la fenêtre entière", () => {
    const f = frise([]);
    expect(f.largeur).toBeGreaterThan(f.xAujourdhui);
    // Somme des blocs mensuels = largeur totale de l'axe.
    const somme = f.mois.reduce((t, m) => t + m.largeur, 0);
    expect(somme).toBeCloseTo(f.largeur, 5);
  });

  it("resserre l'axe à l'échelle « mois »", () => {
    expect(frise([], "mois").largeur).toBeCloseTo(
      (frise([]).largeur * PX_PAR_JOUR.mois) / PX_PAR_JOUR.jours,
      5,
    );
  });
});

describe("construireFrise — le passé", () => {
  it("garde les événements passés sur l'axe, marqués comme tels", () => {
    const f = frise([
      ev("a", -30, "alerte"),
      ev("b", -12, "alerte"),
      ev("c", 20),
    ]);
    // Le passé est consultable : on défile vers la gauche.
    expect(f.marqueurs.map((m) => m.cle)).toEqual(["a", "b", "c"]);
    expect(f.marqueurs.map((m) => m.passe)).toEqual([true, true, false]);
  });

  it("ne place pas ce qui est antérieur à la fenêtre", () => {
    const f = frise([
      ev("vieux", -400, "alerte"),
      ev("recent", -10, "alerte"),
      ev("c", 20),
    ]);
    expect(f.marqueurs.map((m) => m.cle)).toEqual(["recent", "c"]);
    expect(f.nbPlaces).toBe(2);
  });

  it("place tout ce qui tombe dans la fenêtre, quel qu'en soit le ton", () => {
    // La frise place, elle ne qualifie pas : le retard se compte dans
    // `lib/calendrier/retards`, seule source des nombres du board.
    const f = frise([
      ev("a-planifier", -10, "warn"),
      ev("reguliere", -5, "ok"),
      ev("vrai-retard", -2, "alerte"),
    ]);
    expect(f.nbPlaces).toBe(3);
  });

  it("ne marque « passé » qu'une grappe entièrement derrière nous", () => {
    // Une grappe à cheval sur aujourd'hui reste une échéance à venir.
    const f = frise([ev("hier", -1), ev("demain", 1)]);
    expect(f.marqueurs).toHaveLength(1);
    expect(f.marqueurs[0].passe).toBe(false);
  });
});

describe("construireFrise — placement", () => {
  it("positionne en pixels proportionnels au nombre de jours", () => {
    const f = frise([ev("a", 45)]);
    expect(f.marqueurs[0].x).toBe(frise([]).xAujourdhui + px(45));
  });

  it("ignore ce qui dépasse la fenêtre", () => {
    const f = frise([ev("a", 30), ev("b", 900)]);
    expect(f.marqueurs.map((m) => m.cle)).toEqual(["a"]);
    expect(f.nbPlaces).toBe(1);
  });

  it("garde les échéances lointaines, désormais atteignables au défilement", () => {
    // 400 jours : hors des anciens 90 j comme des anciens 365 j.
    const f = frise([ev("a", 400)]);
    expect(f.marqueurs.map((m) => m.cle)).toEqual(["a"]);
  });

  it("alterne les côtés pour éviter le chevauchement", () => {
    const f = frise([ev("a", 0), ev("b", 20), ev("c", 40), ev("d", 60)]);
    expect(f.marqueurs.map((m) => m.cote)).toEqual([
      "haut",
      "bas",
      "haut",
      "bas",
    ]);
  });

  it("trie par date même si l'entrée ne l'est pas", () => {
    const f = frise([ev("c", 60), ev("a", 10), ev("b", 35)]);
    expect(f.marqueurs.map((m) => m.cle)).toEqual(["a", "b", "c"]);
  });

  it("titre une échéance seule par son libellé et sa date complète", () => {
    // 8 août + 47 j = 24 septembre 2026
    const m = frise([ev("a", 47)]).marqueurs[0];
    expect(m.titre).toBe("Événement a");
    expect(m.sousTitre).toBe("24 SEPT. 2026");
    expect(m.evenements[0].libelleDate).toBe("24 SEPT.");
  });
});

describe("construireFrise — regroupement", () => {
  it("réunit les échéances trop rapprochées au lieu d'en cacher", () => {
    // 4 événements sur 9 jours, soit 90 px : sous le seuil d'écart.
    const f = frise([ev("a", 1), ev("b", 3), ev("c", 6), ev("d", 9)]);
    expect(f.marqueurs).toHaveLength(1);
    expect(f.marqueurs[0].evenements.map((e) => e.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    // Rien n'est perdu : le compte placé égale le compte entrant.
    expect(f.nbPlaces).toBe(4);
  });

  it("annonce le compte et la plage de dates d'une grappe", () => {
    const f = frise([ev("a", 1), ev("b", 6)]);
    expect(f.marqueurs[0].titre).toBe("2 échéances");
    // 9 → 14 août : même mois, le mois n'est écrit qu'une fois.
    expect(f.marqueurs[0].sousTitre).toBe("9 → 14 AOÛT");
  });

  it("date la plage au jour civil de Paris, quel que soit le fuseau du serveur", () => {
    // Une échéance est stockée à minuit de PARIS (`debutDuJour`, ADR-011) :
    // sur un serveur en UTC — Vercel —, cet instant tombe la veille à 22 h.
    // Le libellé lisait le jour par `getDate()`, dans le fuseau du processus,
    // et affichait « 8 → 14 AOÛT » pour une grappe qui commence le 9.
    // Rejoué sous `TZ=UTC` (la suite l'est) ; sous Paris, il passait déjà.
    const aParis = (jour: number): EvenementFrise => ({
      id: `p${jour}`,
      libelle: `Événement ${jour}`,
      equipement: "Équipement",
      tone: "ok",
      date: instantCivil(2026, 8, jour),
    });
    const f = frise([aParis(9), aParis(14)]);
    expect(f.marqueurs).toHaveLength(1);
    expect(f.marqueurs[0].sousTitre).toBe("9 → 14 AOÛT");
    // Et une grappe d'un seul jour civil garde sa forme courte.
    const g = frise([aParis(9), { ...aParis(9), id: "p9bis" }]);
    expect(g.marqueurs[0].sousTitre).toBe("9 AOÛT");
  });

  it("écrit les deux mois quand la grappe est à cheval", () => {
    const f = frise([ev("a", 22), ev("b", 26)], "mois");
    expect(f.marqueurs[0].sousTitre).toBe("30 AOÛT → 3 SEPT.");
  });

  it("respecte le seuil d'écart minimal", () => {
    const jours = Math.ceil(ECART_MIN_PX / PX_PAR_JOUR.jours);
    const f = frise([ev("a", 0), ev("b", jours)]);
    expect(f.marqueurs).toHaveLength(2);
  });

  it("borne la grappe sur sa première échéance, pas en chaîne", () => {
    // Régression possible d'un regroupement « de proche en proche » :
    // dix échéances espacées de 8 jours n'en feraient qu'une seule grappe
    // de bout en bout. Le seuil se mesure depuis la tête du groupe.
    const evs = Array.from({ length: 10 }, (_, i) => ev(`e${i}`, i * 8));
    const f = frise(evs);
    expect(f.marqueurs.length).toBeGreaterThan(3);
    for (const m of f.marqueurs) {
      expect(m.xFin - m.x).toBeLessThan(ECART_MIN_PX);
    }
  });

  it("ne plafonne plus le nombre de marqueurs", () => {
    // Régression : la frise n'affichait que 5 marqueurs, quelle que soit
    // la charge. L'axe défilant, tout ce qui est lisible est affiché.
    const evs = Array.from({ length: 12 }, (_, i) => ev(`e${i}`, i * 14));
    const f = frise(evs);
    expect(f.marqueurs).toHaveLength(12);
  });

  it("garde tous les événements quand ils sont peu nombreux et espacés", () => {
    const f = frise([ev("a", 5), ev("b", 30), ev("c", 60)]);
    expect(f.marqueurs.map((m) => m.cle)).toEqual(["a", "b", "c"]);
    expect(f.marqueurs.every((m) => m.evenements.length === 1)).toBe(true);
  });

  it("regroupe par mois à l'échelle « 12 mois », par jours à l'échelle serrée", () => {
    // 30 jours = 78 px à l'échelle mois : sous le seuil, donc une grappe
    // — alors que la vue serrée les distingue.
    const evs = [ev("a", 10), ev("b", 40)];
    expect(frise(evs, "mois").marqueurs).toHaveLength(1);
    expect(frise(evs).marqueurs).toHaveLength(2);
  });

  it("laisse l'alerte donner son ton à toute la grappe", () => {
    const f = frise([ev("calme", 2, "ok"), ev("urgent", 4, "alerte")]);
    expect(f.marqueurs).toHaveLength(1);
    expect(f.marqueurs[0].tone).toBe("alerte");
  });

  it("ne surclasse pas un groupe calme", () => {
    const f = frise([ev("a", 2, "ok"), ev("b", 4, "warn")]);
    expect(f.marqueurs[0].tone).toBe("warn");
  });
});

describe("construireFrise — proche", () => {
  it("marque proche une échéance à moins de 30 jours, aujourd'hui compris", () => {
    expect(frise([ev("a", 0)]).marqueurs[0].proche).toBe(true);
    expect(frise([ev("a", 30)]).marqueurs[0].proche).toBe(true);
  });

  it("laisse calmes le lointain et le passé", () => {
    expect(frise([ev("a", 31)]).marqueurs[0].proche).toBe(false);
    expect(frise([ev("a", -5)]).marqueurs[0].proche).toBe(false);
  });

  it("une opération démarrée sans alerte se lit sur sa fin", () => {
    // Relecture du 2026-09-14 : posée sur son début passé, elle restait grise
    // à dix jours de son terme, quand le « sous 30 j » du tableau de bord la
    // comptait.
    const fin = (n: number) => {
      const d = new Date(LE_8_AOUT);
      d.setDate(d.getDate() + n);
      return d;
    };
    expect(frise([{ ...ev("op", -20), dateFin: fin(10) }]).marqueurs[0].proche).toBe(true);
    expect(frise([{ ...ev("op", -20), dateFin: fin(90) }]).marqueurs[0].proche).toBe(false);
  });

  it("une opération commencée avant la fenêtre, qui finit dedans, y entre au bord gauche", () => {
    // 2026-09-15 : filtrée sur son début, une opération démarrée il y a plus
    // de trois mois et finissant dans dix jours n'apparaissait pas, quand le
    // « sous 30 j » du tableau de bord la comptait.
    const fin = (n: number) => {
      const d = new Date(LE_8_AOUT);
      d.setDate(d.getDate() + n);
      return d;
    };
    const f = frise([{ ...ev("op", -150), dateFin: fin(10) }]);
    expect(f.marqueurs).toHaveLength(1);
    expect(f.marqueurs[0].x).toBe(0);
    expect(f.marqueurs[0].proche).toBe(true);
    // Sa carte garde sa vraie date de début.
    expect(f.marqueurs[0].sousTitre).toContain("MARS");
    // Hors du cadrage d'ouverture, elle est nommée pour être cherchée.
    expect(f.horsCadrage).toEqual([{ libelle: "Événement op", cle: "op", x: 0 }]);
    // En grappe avec un événement du début de fenêtre, la plage porte les
    // deux années : « 11 MARS 2026 → 3 MAI 2026 », jamais une plage courte.
    const g = frise([{ ...ev("op", -150), dateFin: fin(10) }, ev("mai", -97)]);
    expect(g.marqueurs).toHaveLength(1);
    expect(g.marqueurs[0].sousTitre).toMatch(/MARS 2026 → .* 2026$/);
    // Finie avant la fenêtre, elle n'y entre pas.
    expect(frise([{ ...ev("op", -150), dateFin: fin(-120) }]).marqueurs).toHaveLength(0);
  });

  it("nomme toute opération non close dont le point est hors de l'écran à l'ouverture", () => {
    // Relecture du 2026-09-15. La règle : une opération (elle porte une fin),
    // hors de l'écran — en cours, en retard sur son début ou échue, quel que
    // soit son terme. Une vérification n'en est pas une.
    const fin = (n: number) => {
      const d = new Date(LE_8_AOUT);
      d.setDate(d.getDate() + n);
      return d;
    };
    const jours = frise([
      { ...ev("echue", -150, "alerte"), dateFin: fin(-20) },
      { ...ev("debut-manque", -30, "alerte"), dateFin: fin(10) },
      { ...ev("fin-lointaine", -25), dateFin: fin(60) },
      { ...ev("en-cours", -19), dateFin: fin(10) },
      { ...ev("au-bord", -17), dateFin: fin(10) },
      { ...ev("visible-au-bord", -15), dateFin: fin(10) },
      { ...ev("visible", -7), dateFin: fin(10) },
      ev("verification", -30, "alerte"),
    ]);
    expect(jours.xCadrage).toBe(jours.xAujourdhui - CADRAGE_INITIAL);
    expect(jours.horsCadrage.map((h) => h.libelle)).toEqual([
      "Événement echue",
      "Événement debut-manque",
      "Événement fin-lointaine",
      "Événement en-cours",
      "Événement au-bord",
    ]);
    // La marge de la piste compte : à 15 jours, le point est 10 px à
    // l'intérieur de l'écran ; à 17 jours, 10 px dehors.
    expect(
      frise([{ ...ev("a", -15), dateFin: fin(10) }]).horsCadrage,
    ).toEqual([]);

    // En vue « 12 mois », le même cadrage couvre ~60 jours de passé.
    const mois = frise(
      [
        { ...ev("hors", -70), dateFin: fin(10) },
        { ...ev("visible", -19), dateFin: fin(10) },
      ],
      "mois",
    );
    expect(mois.horsCadrage.map((h) => h.libelle)).toEqual(["Événement hors"]);
  });

  it("une seule échéance proche suffit à la grappe", () => {
    const f = frise([ev("a", 28), ev("b", 33)]);
    expect(f.marqueurs).toHaveLength(1);
    expect(f.marqueurs[0].proche).toBe(true);
  });
});

describe("construireFrise — graduations", () => {
  it("gradue chaque mois de la fenêtre, du premier au dernier", () => {
    const mois = frise([]).mois;
    expect(mois[0].cle).toBe("2026-05");
    expect(mois[mois.length - 1].cle).toBe("2028-08");
    expect(mois).toHaveLength(28);
  });

  it("rappelle l'année au premier bloc et à chaque janvier", () => {
    const mois = frise([]).mois;
    expect(mois[0].label).toBe("Mai 26");
    expect(mois[1].label).toBe("Juin");
    expect(mois.find((m) => m.cle === "2027-01")?.label).toBe("Janvier 27");
  });

  it("marque le mois courant", () => {
    const courants = frise([]).mois.filter((m) => m.estMoisCourant);
    expect(courants.map((m) => m.cle)).toEqual(["2026-08"]);
  });

  it("dimensionne chaque bloc sur le nombre de jours du mois", () => {
    const mai = frise([]).mois[0];
    expect(mai.x).toBe(0);
    expect(mai.largeur).toBe(px(31));
    expect(frise([]).mois[1].x).toBe(px(31));
  });
});
