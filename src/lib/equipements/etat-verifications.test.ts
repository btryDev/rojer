import { describe, expect, it } from "vitest";
import { repartirParEquipement, resumerEquipement } from "./etat-verifications";
import { compteEtat } from "@/lib/calendrier/etats";
import type { Periodicite } from "@/lib/referentiels/types-communs";

/**
 * Dates civiles à minuit UTC, horloge à un instant réel (ADR-011).
 */
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
/** 10 août 2026, 9 h à Paris. */
const AUJOURDHUI = new Date("2026-08-10T07:00:00Z");

const verif = (
  equipementId: string,
  datePrevue: string,
  o: {
    statut?: string;
    dateRealisee?: string;
    libelle?: string;
    periodicite?: Periodicite;
  } = {},
) => ({
  equipementId,
  libelleObligation: o.libelle ?? "Vérification annuelle",
  statut: o.statut ?? "planifiee",
  datePrevue: jour(datePrevue),
  dateRealisee: o.dateRealisee ? jour(o.dateRealisee) : null,
  periodicite: o.periodicite ?? ("annuelle" as const),
});

describe("repartirParEquipement", () => {
  it("compte les dépassées par appareil", () => {
    const m = repartirParEquipement(
      [
        verif("eq1", "2026-06-01"),
        verif("eq1", "2026-07-01"),
        verif("eq2", "2026-09-01"),
      ],
      AUJOURDHUI,
    );

    expect(m.get("eq1")?.enRetard).toBe(2);
    expect(m.get("eq2")?.enRetard).toBe(0);
  });

  it("retient la prochaine échéance à venir, pas la plus lointaine", () => {
    const m = repartirParEquipement(
      [
        verif("eq1", "2026-09-01", { libelle: "Extincteurs" }),
        verif("eq1", "2027-01-01", { libelle: "Électricité" }),
      ],
      AUJOURDHUI,
    );

    expect(m.get("eq1")?.prochaine?.libelle).toBe("Extincteurs");
    expect(m.get("eq1")?.prochaine?.date).toEqual(jour("2026-09-01"));
  });

  it("prend une occurrence dépassée comme prochaine si rien d'autre n'attend", () => {
    // Le retard EST le prochain rendez-vous : le taire donnerait un appareil
    // qui n'annonce rien alors qu'il est le plus urgent du parc.
    const m = repartirParEquipement([verif("eq1", "2026-06-01")], AUJOURDHUI);

    expect(m.get("eq1")?.prochaine?.etat).toBe("enRetard");
  });

  it("n'annonce jamais une occurrence « à planifier » comme rendez-vous", () => {
    // Sa `datePrevue` est une date de génération, pas une date choisie
    // (ADR-010) : la poser comme prochaine échéance mentirait.
    const m = repartirParEquipement(
      [verif("eq1", "2026-12-01", { statut: "a_planifier" })],
      AUJOURDHUI,
    );

    expect(m.get("eq1")?.prochaine).toBeNull();
    expect(m.get("eq1")?.aPlanifier).toBe(1);
  });

  it("garde la vérification réalisée la plus récente", () => {
    const m = repartirParEquipement(
      [
        verif("eq1", "2025-02-01", {
          statut: "realisee_conforme",
          dateRealisee: "2025-02-03",
        }),
        verif("eq1", "2026-02-01", {
          statut: "realisee_conforme",
          dateRealisee: "2026-02-04",
        }),
      ],
      AUJOURDHUI,
    );

    expect(m.get("eq1")?.derniere).toEqual(jour("2026-02-04"));
    expect(m.get("eq1")?.enRetard).toBe(0);
  });

  it("retombe sur la date prévue quand une occurrence faite n'a pas de date de réalisation", () => {
    const m = repartirParEquipement(
      [verif("eq1", "2026-02-01", { statut: "realisee_conforme" })],
      AUJOURDHUI,
    );

    expect(m.get("eq1")?.derniere).toEqual(jour("2026-02-01"));
  });

  it("distingue « aucune vérification connue » de « à jour »", () => {
    // Un appareil sans occurrence n'a pas d'entrée : l'écran dit alors
    // qu'il n'a aucune vérification rattachée, et surtout pas qu'il va bien.
    const m = repartirParEquipement([verif("eq1", "2026-09-01")], AUJOURDHUI);

    expect(m.has("eq2")).toBe(false);
    expect(m.get("eq1")?.derniere).toBeNull();
  });
});

describe("repartirParEquipement — l'horizon proche", () => {
  // `proches` alimente le compteur « sous 30 j » du bandeau du parc, et
  // c'est la seule branche de la répartition qui dépende de l'horizon. Elle
  // n'était pas testée : la frontière J+30 / J+31 non plus.
  it("compte comme proche une échéance dans l'horizon, pas au-delà", () => {
    const m = repartirParEquipement(
      [
        // J+20 : dans les trente jours.
        verif("eq1", "2026-08-30"),
        // J+60 : à venir, mais pas proche.
        verif("eq1", "2026-10-09"),
      ],
      AUJOURDHUI,
    );
    expect(m.get("eq1")?.aVenir).toBe(2);
    expect(m.get("eq1")?.proches).toBe(1);
  });

  it("la frontière se joue au trentième jour, pas au trente-et-unième", () => {
    // AUJOURDHUI = 10 août 2026. J+30 = 9 septembre, J+31 = 10 septembre.
    const dans30 = repartirParEquipement(
      [verif("eq1", "2026-09-09")],
      AUJOURDHUI,
    );
    const dans31 = repartirParEquipement(
      [verif("eq1", "2026-09-10")],
      AUJOURDHUI,
    );
    expect(dans30.get("eq1")?.proches).toBe(1);
    expect(dans31.get("eq1")?.proches).toBe(0);
    expect(dans31.get("eq1")?.aVenir).toBe(1);
  });

  it("ne compte jamais un retard ni une occurrence sans date comme proche", () => {
    const m = repartirParEquipement(
      [
        verif("eq1", "2026-06-01"),
        verif("eq1", "2026-08-20", { statut: "a_planifier" }),
      ],
      AUJOURDHUI,
    );
    expect(m.get("eq1")?.proches).toBe(0);
  });

  it("le rendez-vous suivant d'un cycle soldé compte dans l'horizon", () => {
    const m = repartirParEquipement(
      [
        verif("eq1", "2026-08-25", {
          statut: "realisee_conforme",
          dateRealisee: "2025-08-25",
        }),
      ],
      AUJOURDHUI,
    );
    expect(m.get("eq1")?.faites).toBe(1);
    expect(m.get("eq1")?.proches).toBe(1);
  });

  it("une ligne archivée ne compte dans aucun horizon", () => {
    // ADR-012 : son obligation ne s'applique plus, son statut reste gelé.
    const m = repartirParEquipement(
      [
        verif("eq1", "2026-08-30", {
          libelle: "Ne s'applique plus — Vérification annuelle",
        }),
      ],
      AUJOURDHUI,
    );
    expect(m.get("eq1")?.proches).toBe(0);
    expect(m.get("eq1")?.aVenir).toBe(0);
    expect(m.get("eq1")?.enRetard).toBe(0);
  });
});

describe("resumerEquipement", () => {
  const etatDe = (verifs: Parameters<typeof repartirParEquipement>[0]) =>
    repartirParEquipement(verifs, AUJOURDHUI).get("eq1");

  it("dit l'absence de suivi plutôt que de la taire", () => {
    // Aucun signal : c'est l'écran qui dit « aucune vérification
    // rattachée ». Un compteur à zéro laisserait croire à un suivi vide,
    // alors qu'il n'y a pas de suivi du tout.
    const r = resumerEquipement(undefined);
    expect(r.etat).toBe("aPlanifier");
    expect(r.signaux).toEqual([]);
  });

  it("le retard prime sur tout le reste", () => {
    const r = resumerEquipement(
      etatDe([verif("eq1", "2026-06-01"), verif("eq1", "2026-12-01")]),
    );
    expect(r.etat).toBe("enRetard");
    expect(r.signaux[0]).toMatchObject({ cle: "enRetard", nb: 1 });
  });

  it("ne porte plus aucune date : le parc n'est pas un agenda", () => {
    const r = resumerEquipement(etatDe([verif("eq1", "2026-08-25")]));
    expect(r.etat).toBe("proche");
    expect(JSON.stringify(r)).not.toMatch(/2026/);
  });

  it("compte les signaux du plus urgent au plus calme", () => {
    const r = resumerEquipement(
      etatDe([
        verif("eq1", "2026-02-10", {
          statut: "realisee_conforme",
          dateRealisee: "2026-02-10",
        }),
        verif("eq1", "2026-06-01"),
        verif("eq1", "2027-01-01", { statut: "a_planifier" }),
      ]),
    );
    expect(r.signaux.map((s) => s.cle)).toEqual([
      "enRetard",
      "aPlanifier",
      "faite",
    ]);
    expect(r.signaux.map((s) => s.libelle)).toEqual([
      "1 dépassée",
      "1 à planifier",
      "1 faite",
    ]);
  });

  it("compte le rendez-vous suivant d'un cycle soldé", () => {
    // Une ligne soldée dit deux choses : « fait le 10 févr. 2026 » et
    // « prochaine le 10 févr. 2027 » (ADR-010). Sans elle, un appareil
    // parfaitement suivi n'affichait aucun signal et la carte du parc
    // annonçait « aucune vérification rattachée » — pendant que le
    // calendrier, lui, montrait bien l'échéance.
    const e = etatDe([
      verif("eq1", "2027-02-10", {
        statut: "realisee_conforme",
        dateRealisee: "2026-02-10",
      }),
    ])!;
    expect(e.faites).toBe(1);
    expect(e.aVenir).toBe(1);
    expect(e.prochaine?.date).toEqual(jour("2027-02-10"));

    const r = resumerEquipement(e);
    expect(r.etat).toBe("lointain");
    // Les mots viennent de la table, jamais recopiés ici : ce test vérifie
    // l'ACCORD et l'ORDRE des signaux, pas le vocabulaire — qui a son propre
    // gardien (`calendrier/vocabulaire-etats`). Recopiés, ils auraient à être
    // réparés à chaque reformulation, et cesseraient de mesurer quoi que ce
    // soit d'autre qu'une opération de copier-coller.
    expect(r.signaux.map((s) => s.libelle)).toEqual([
      compteEtat(1, "lointain"),
      compteEtat(1, "faite"),
    ]);
  });

  it("annonce les échéances simplement planifiées", () => {
    // L'état normal juste après génération : rien de dépassé, rien à
    // planifier, rien de fait. La carte doit quand même parler.
    const r = resumerEquipement(etatDe([verif("eq1", "2027-03-01")]));
    expect(r.signaux.map((s) => s.cle)).toEqual(["lointain"]);
  });

  it("sépare ce qui tombe sous 30 jours de ce qui tombe plus tard", () => {
    // Le signal valait `aVenir` et réunissait les deux : la carte écrivait
    // « 2 à venir » et peignait le tout en bleu « lointain », pendant que le
    // bandeau du parc comptait la moitié proche sous le nom « sous 30 j ».
    // Deux mots voisins pour deux ensembles différents — c'est ce qui faisait
    // douter des deux nombres. Séparer les comptes n'a d'ailleurs pas suffi :
    // « à venir » englobait encore « sous 30 jours » dans la langue, et les
    // deux états nomment désormais la borne qu'ils se partagent.
    const e = etatDe([
      verif("eq1", "2026-08-20"),
      verif("eq1", "2027-03-01"),
    ])!;
    expect(e.proches).toBe(1);
    expect(e.aVenir).toBe(2);

    const r = resumerEquipement(e);
    expect(r.signaux.map((s) => s.cle)).toEqual(["proche", "lointain"]);
    expect(r.signaux.map((s) => s.libelle)).toEqual([
      compteEtat(1, "proche"),
      compteEtat(1, "lointain"),
    ]);
    // La somme des deux signaux est le compte d'avant, jamais un de plus :
    // `proches` est un sous-ensemble de `aVenir`, pas un second comptage.
    expect(r.signaux.reduce((n, s) => n + s.nb, 0)).toBe(e.aVenir);
  });

  it("retombe sur la dernière preuve quand plus rien n'est attendu", () => {
    const r = resumerEquipement(
      etatDe([
        verif("eq1", "2026-02-10", {
          statut: "realisee_conforme",
          dateRealisee: "2026-02-10",
        }),
      ]),
    );
    expect(r.etat).toBe("faite");
    expect(r.signaux).toEqual([{ cle: "faite", nb: 1, libelle: "1 faite" }]);
  });
});
