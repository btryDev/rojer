import { describe, expect, it } from "vitest";
import { TITRE, reconcilier, type CreneauConnu, type EvenementRecu } from "./reconciliation";

const H = 60 * 60 * 1000;
const T0 = Date.parse("2026-12-01T08:00:00Z");
const fenetre = { depuis: new Date(T0 - 24 * H), jusqua: new Date(T0 + 30 * 24 * H) };
const a = (heure: number) => new Date(T0 + heure * H);

const ev = (id: string, heure: number, duree = 1): EvenementRecu => ({ id, debut: a(heure), fin: a(heure + duree) });
const creneau = (id: string, heure: number, o: Partial<CreneauConnu> = {}): CreneauConnu => ({
  id,
  debut: a(heure),
  fin: a(heure + 1),
  evenementId: null,
  reserve: false,
  titreReserve: null,
  ...o,
});
const reserve = (id: string, heure: number, evenementId: string | null) =>
  creneau(id, heure, { evenementId, reserve: true, titreReserve: "Réservé — Boulangerie — visio" });

const titres = (p: ReturnType<typeof reconcilier>) => Object.fromEntries(p.consignes.map((c) => [c.id, c.titre]));
const rien = (p: ReturnType<typeof reconcilier>) =>
  Object.values(p.operations).every((l) => l.length === 0) && p.aCreer.length === 0 && p.conflits.length === 0;

describe("reconcilier — créneaux libres : l'agenda fait foi", () => {
  it("un événement nouveau d'une heure ouvre un créneau, titré « Dispo »", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", 2)], creneaux: [] });
    expect(p.operations.ouvrir).toEqual([{ evenementId: "e1", debut: a(2), fin: a(3) }]);
    expect(titres(p)).toEqual({ e1: TITRE.dispo });
  });

  it("le même état renvoyé ne change rien (idempotent)", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", 2)], creneaux: [creneau("c1", 2, { evenementId: "e1" })] });
    expect(rien(p)).toBe(true);
    expect(titres(p)).toEqual({ e1: TITRE.dispo });
  });

  it("un événement déplacé déplace son créneau libre", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", 5)], creneaux: [creneau("c1", 2, { evenementId: "e1" })] });
    expect(p.operations.deplacer).toEqual([{ creneauId: "c1", evenementId: "e1", debut: a(5), fin: a(6) }]);
  });

  it("un événement supprimé ferme son créneau libre", () => {
    const p = reconcilier({ fenetre, evenements: [], creneaux: [creneau("c1", 2, { evenementId: "e1" })] });
    expect(p.operations.fermer).toEqual([{ creneauId: "c1", evenementId: "e1" }]);
  });

  it("un événement qui ne dure pas une heure n'ouvre rien et est signalé", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", 2, 3)], creneaux: [] });
    expect(p.operations.ouvrir).toEqual([]);
    expect(titres(p)).toEqual({ e1: TITRE.duree });
  });

  it("un créneau libre dont l'événement passe à deux heures est fermé et signalé", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", 2, 2)], creneaux: [creneau("c1", 2, { evenementId: "e1" })] });
    expect(p.operations.fermer).toEqual([{ creneauId: "c1", evenementId: "e1" }]);
    expect(titres(p)).toEqual({ e1: TITRE.duree });
  });

  it("deux événements à la même heure : un seul créneau, l'autre signalé", () => {
    const p = reconcilier({ fenetre, evenements: [ev("b", 2), ev("a", 2)], creneaux: [] });
    expect(p.operations.ouvrir.map((o) => o.evenementId)).toEqual(["a"]);
    expect(titres(p)).toEqual({ a: TITRE.dispo, b: TITRE.doublon });
  });

  it("un déplacement sur l'heure d'un autre créneau ferme le déplacé, sans toucher l'autre", () => {
    const p = reconcilier({
      fenetre,
      evenements: [ev("e1", 4), ev("e2", 4)],
      creneaux: [creneau("c1", 2, { evenementId: "e1" }), creneau("c2", 4, { evenementId: "e2" })],
    });
    expect(p.operations.deplacer).toEqual([]);
    expect(p.operations.fermer).toEqual([{ creneauId: "c1", evenementId: "e1" }]);
    expect(titres(p)).toEqual({ e1: TITRE.doublon, e2: TITRE.dispo });
  });

  it("deux libres qui échangent leurs heures se déplacent tous les deux", () => {
    const p = reconcilier({
      fenetre,
      evenements: [ev("e1", 3), ev("e2", 2)],
      creneaux: [creneau("c1", 2, { evenementId: "e1" }), creneau("c2", 3, { evenementId: "e2" })],
    });
    expect(p.operations.deplacer.map((d) => [d.creneauId, d.debut])).toEqual([
      ["c2", a(2)],
      ["c1", a(3)],
    ]);
    expect(p.operations.fermer).toEqual([]);
  });

  it("un libre emporté avant la fenêtre se ferme, sans consigne", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", -48)], creneaux: [creneau("c1", 2, { evenementId: "e1" })] });
    expect(p.operations.fermer).toEqual([{ creneauId: "c1", evenementId: "e1" }]);
    expect(p.consignes).toEqual([]);
    expect(p.evenementsDansLaFenetre).toBe(0);
  });

  it("un événement qui commence avant la fenêtre est ignoré, sans consigne", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", -48)], creneaux: [] });
    expect(rien(p)).toBe(true);
    expect(p.consignes).toEqual([]);
  });

  it("un créneau lié hors de la fenêtre n'est pas fermé faute d'être reçu", () => {
    const p = reconcilier({ fenetre, evenements: [], creneaux: [creneau("c1", 31 * 24, { evenementId: "e1" })] });
    expect(rien(p)).toBe(true);
  });
});

describe("reconcilier — créneaux réservés : Rojer fait foi", () => {
  it("le titre « Réservé — … » est posé sur l'événement", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", 2)], creneaux: [reserve("c1", 2, "e1")] });
    expect(rien(p)).toBe(true);
    expect(titres(p)).toEqual({ e1: "Réservé — Boulangerie — visio" });
  });

  it("un réservé déplacé dans l'agenda ne bouge pas : l'événement est remis, l'équipe prévenue", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", 5)], creneaux: [reserve("c1", 2, "e1")] });
    expect(p.operations).toEqual({ ouvrir: [], deplacer: [], fermer: [], rattacher: [] });
    expect(p.consignes).toEqual([{ id: "e1", titre: "Réservé — Boulangerie — visio", remettre: { debut: a(2), fin: a(3) } }]);
    expect(p.conflits.map((c) => c.nature)).toEqual(["deplace"]);
  });

  it("un réservé emporté hors de la fenêtre est remis, pas recréé (revue du 2026-11-25)", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", -48)], creneaux: [reserve("c1", 2, "e1")] });
    expect(p.aCreer).toEqual([]);
    expect(p.consignes).toEqual([{ id: "e1", titre: "Réservé — Boulangerie — visio", remettre: { debut: a(2), fin: a(3) } }]);
    expect(p.conflits.map((c) => c.nature)).toEqual(["deplace"]);
  });

  it("un réservé supprimé de l'agenda n'est pas fermé : l'événement est à recréer", () => {
    const p = reconcilier({ fenetre, evenements: [], creneaux: [reserve("c1", 2, "e1")] });
    expect(p.operations.fermer).toEqual([]);
    expect(p.aCreer).toEqual([{ debut: a(2), fin: a(3), titre: "Réservé — Boulangerie — visio" }]);
    expect(p.conflits.map((c) => c.nature)).toEqual(["supprime"]);
  });

  it("l'événement recréé se rattache au réservé par son heure", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e2", 2)], creneaux: [reserve("c1", 2, "e1")] });
    expect(p.operations.rattacher).toEqual([{ creneauId: "c1", evenementId: "e2", ancien: "e1" }]);
    expect(p.aCreer).toEqual([]);
    expect(titres(p)).toEqual({ e2: "Réservé — Boulangerie — visio" });
  });

  it("un libre ne se déplace pas sur l'heure d'un réservé", () => {
    const p = reconcilier({
      fenetre,
      evenements: [ev("e1", 2), ev("e2", 2)],
      creneaux: [reserve("c1", 2, "e1"), creneau("c2", 5, { evenementId: "e2" })],
    });
    expect(p.operations.deplacer).toEqual([]);
    expect(p.operations.fermer).toEqual([{ creneauId: "c2", evenementId: "e2" }]);
  });

  it("un réservé sans titre connu garde « Réservé »", () => {
    const p = reconcilier({
      fenetre,
      evenements: [ev("e1", 2)],
      creneaux: [creneau("c1", 2, { evenementId: "e1", reserve: true, titreReserve: null })],
    });
    expect(titres(p)).toEqual({ e1: TITRE.reserve });
  });
});

describe("reconcilier — créneaux ouverts par script", () => {
  it("un créneau sans événement n'est jamais fermé", () => {
    const p = reconcilier({ fenetre, evenements: [], creneaux: [creneau("c1", 2)] });
    expect(rien(p)).toBe(true);
  });

  it("un événement posé à son heure le rattache à l'agenda", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", 2)], creneaux: [creneau("c1", 2)] });
    expect(p.operations.rattacher).toEqual([{ creneauId: "c1", evenementId: "e1", ancien: null }]);
    expect(p.operations.ouvrir).toEqual([]);
  });

  it("un événement à son heure mais d'une autre fin est un doublon", () => {
    const p = reconcilier({ fenetre, evenements: [ev("e1", 2)], creneaux: [creneau("c1", 2, { fin: a(4) })] });
    expect(p.operations.rattacher).toEqual([]);
    expect(titres(p)).toEqual({ e1: TITRE.doublon });
  });
});
