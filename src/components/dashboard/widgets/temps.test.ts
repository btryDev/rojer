import { describe, expect, it } from "vitest";
import { cleJourCivil } from "@/lib/dates";
import {
  badgeEcart,
  colonnesJours,
  compteARebours,
  libelleAnciennete,
  libelleAnteriorite,
  libelleEcart,
} from "./temps";

// Toutes les dates civiles du produit sont stockées à minuit UTC (Prisma
// `DateTime` sur une saisie « AAAA-MM-JJ »). Les instants de référence,
// eux, sont des `new Date()` réels — c'est le croisement des deux qui
// faisait dériver les widgets.
const echeance = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("colonnesJours", () => {
  it("indexe chaque colonne sur le jour civil qu'elle affiche", () => {
    // 23:30 à Paris en été : minuit local vaut 22:00 Z la veille, et
    // c'est là que l'ancienne clé UTC désignait J−1.
    const cols = colonnesJours(new Date("2026-08-10T21:30:00.000Z"), 7);
    expect(cols.map((c) => c.cle)).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
    ]);
  });

  it("une échéance du jour tombe dans la colonne « aujourd'hui »", () => {
    const cols = colonnesJours(new Date("2026-08-10T21:30:00.000Z"), 7);
    expect(cols[0].cle).toBe(cleJourCivil(echeance("2026-08-10")));
    expect(cols[0].estAujourdhui).toBe(true);
  });

  it("étiquette les colonnes en heure de Paris", () => {
    const cols = colonnesJours(new Date("2026-08-10T09:00:00.000Z"), 2);
    expect(cols[0].libelleJour).toBe("Lun");
    expect(cols[0].numero).toBe("10");
    expect(cols[0].libelleLong).toBe("10 août");
    expect(cols[1].libelleJour).toBe("Mar");
  });

  it("franchit un changement d'heure sans sauter ni répéter un jour", () => {
    // Passage à l'heure d'hiver 2026 : nuit du 24 au 25 octobre.
    const cols = colonnesJours(new Date("2026-10-23T12:00:00.000Z"), 4);
    expect(cols.map((c) => c.cle)).toEqual([
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
    ]);
  });

  it("couvre trente jours pour le widget « 30 prochains jours »", () => {
    const cols = colonnesJours(new Date("2026-08-10T09:00:00.000Z"), 30);
    expect(cols).toHaveLength(30);
    expect(cols[29].cle).toBe("2026-09-08");
  });
});

describe("libelleEcart", () => {
  const jour = echeance("2026-08-10");

  it("dit « Aujourd'hui » toute la journée du jour dit", () => {
    // 00:30, 14:00 et 23:30 à Paris : l'ancienne division par 86 400 000
    // basculait en « J−1 » vers 14 h.
    expect(libelleEcart(jour, new Date("2026-08-09T22:30:00.000Z"))).toBe(
      "Aujourd'hui",
    );
    expect(libelleEcart(jour, new Date("2026-08-10T12:00:00.000Z"))).toBe(
      "Aujourd'hui",
    );
    expect(libelleEcart(jour, new Date("2026-08-10T13:00:00.000Z"))).toBe(
      "Aujourd'hui",
    );
    expect(libelleEcart(jour, new Date("2026-08-10T21:30:00.000Z"))).toBe(
      "Aujourd'hui",
    );
  });

  it("bascule à minuit, heure de Paris", () => {
    // 23:59 le 10 août à Paris, puis 00:01 le 11.
    expect(libelleEcart(jour, new Date("2026-08-10T21:59:00.000Z"))).toBe(
      "Aujourd'hui",
    );
    // Le libellé du retard a changé le 2026-09-03 (« J−1 » se lisait « demain
    // ») ; ce que ce test surveille reste la BASCULE, pas les mots.
    expect(libelleEcart(jour, new Date("2026-08-10T22:01:00.000Z"))).toBe(
      "1 j de retard",
    );
  });

  it("compte les jours à venir", () => {
    expect(
      libelleEcart(echeance("2026-08-13"), new Date("2026-08-10T16:00:00.000Z")),
    ).toBe("J+3");
  });
});

describe("badgeEcart", () => {
  it("abrège le jour dit", () => {
    expect(
      badgeEcart(echeance("2026-08-10"), new Date("2026-08-10T15:00:00.000Z")),
    ).toBe("Auj.");
  });

  it("garde le « J+ » pour le futur", () => {
    const now = new Date("2026-08-10T15:00:00.000Z");
    expect(badgeEcart(echeance("2026-08-12"), now)).toBe("J+2");
  });

  it("dit le retard en toutes lettres, jamais en « J− »", () => {
    // « J−2 » se lit « dans deux jours » : c'est un compte à rebours, et il
    // s'affichait à côté de « en retard ». Voir la note de `libelleEcart`.
    const now = new Date("2026-08-10T15:00:00.000Z");
    expect(badgeEcart(echeance("2026-08-08"), now)).toBe("2 j de retard");
    expect(libelleEcart(echeance("2026-08-08"), now)).toBe("2 j de retard");
  });

  it("n'écrit « J− » nulle part, sur tout l'intervalle utile", () => {
    // La garantie, balayée plutôt qu'exemplifiée : de 400 jours de retard à
    // 400 jours à venir, aucune des deux fonctions ne rend la notation qui
    // dit l'inverse de ce qu'elle compte.
    const now = new Date("2026-08-10T15:00:00.000Z");
    for (let d = -400; d <= 400; d++) {
      const jour = new Date(Date.UTC(2026, 7, 10 + d, 12, 0, 0));
      expect(badgeEcart(jour, now)).not.toContain("J−");
      expect(libelleEcart(jour, now)).not.toContain("J−");
    }
  });
});

describe("compteARebours", () => {
  const now = new Date("2026-08-10T15:00:00.000Z");

  it("ne déclare pas de retard le jour de l'échéance", () => {
    expect(compteARebours(echeance("2026-08-10"), now)).toEqual({
      nombre: 0,
      legende: "aujourd'hui",
    });
  });

  it("accorde le singulier du lendemain", () => {
    expect(compteARebours(echeance("2026-08-11"), now)).toEqual({
      nombre: 1,
      legende: "jour",
    });
    expect(compteARebours(echeance("2026-08-14"), now)).toEqual({
      nombre: 4,
      legende: "jours",
    });
  });

  it("compte le retard en jours civils", () => {
    expect(compteARebours(echeance("2026-08-07"), now)).toEqual({
      nombre: 3,
      legende: "j. de retard",
    });
  });
});

describe("libelleAnciennete", () => {
  const now = new Date("2026-08-10T15:00:00.000Z");

  it("ne dit rien le jour de l'échéance", () => {
    // L'ancien `Math.max(1, …)` annonçait « depuis 1 j » dès le jour J.
    expect(libelleAnciennete(echeance("2026-08-10"), now)).toBeNull();
  });

  it("dit « depuis hier » puis compte les jours", () => {
    expect(libelleAnciennete(echeance("2026-08-09"), now)).toBe("depuis hier");
    expect(libelleAnciennete(echeance("2026-08-04"), now)).toBe("depuis 6 j");
  });
});

describe("libelleAnteriorite", () => {
  const now = new Date("2026-08-10T15:00:00.000Z");

  it("nomme aujourd'hui et hier, puis date", () => {
    expect(libelleAnteriorite(echeance("2026-08-10"), now)).toBe("Aujourd'hui");
    expect(libelleAnteriorite(echeance("2026-08-09"), now)).toBe("Hier");
    expect(libelleAnteriorite(echeance("2026-08-02"), now)).toBe("2 août");
  });

  it("compte un rapport déposé ce matin comme d'aujourd'hui", () => {
    // Horodatage réel (10:00 à Paris), pas une date civile : l'écart en
    // jours civils vaut 0, même si moins de 24 h se sont écoulées.
    expect(
      libelleAnteriorite(
        new Date("2026-08-10T08:00:00.000Z"),
        new Date("2026-08-10T15:00:00.000Z"),
      ),
    ).toBe("Aujourd'hui");
  });
});
