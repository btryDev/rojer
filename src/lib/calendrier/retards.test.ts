import { describe, expect, it } from "vitest";
import type { EcheanceCalendrier, FamilleEcheance } from "./echeances";
import { repartirRetards, repartirSous30j, type VerifsParType } from "./retards";

/**
 * Seules les deux fonctions pures sont testées : ce sont elles qui portent
 * la promesse de l'ADR-015 — sidebar, bandeau du calendrier et tableau de
 * bord lisent le même nombre. `compterEtatEcheances` ne fait qu'y verser
 * deux requêtes déjà couvertes ailleurs.
 */
const LE_10_AOUT = new Date("2026-08-10T00:00:00.000Z");
/** Midi : l'horloge n'est jamais à minuit dans la vraie vie. */
const CE_MIDI = new Date("2026-08-10T12:00:00.000Z");

const echeance = (
  famille: FamilleEcheance,
  tone: "alerte" | "ok",
  date: Date = LE_10_AOUT,
): EcheanceCalendrier => ({
  id: `${famille}-${tone}-${date.getTime()}`,
  // La famille est ce que le test pilote ; le type n'a qu'à être cohérent.
  type: famille === "controle" ? "verification" : "action-duerp",
  famille,
  libelle: "Peu importe",
  origine: "Peu importe",
  date,
  tone,
  href: "#",
  batiment: null,
});

/**
 * Le flux des vérifications, ventilé par nature (ADR-016).
 *
 * `verifs(3)` = trois lignes d'équipement ; `verifs(3, 2)` y ajoute deux
 * titres de salariés, qui ne relèvent PAS de la même famille.
 */
const verifs = (verification: number, titreSalarie = 0): VerifsParType => ({
  verification,
  "titre-salarie": titreSalarie,
});

describe("repartirRetards", () => {
  it("ventile les échéances dépassées par famille", () => {
    const r = repartirRetards(
      [
        echeance("travaux", "alerte"),
        echeance("travaux", "alerte"),
        echeance("papiers", "alerte"),
      ],
      verifs(0),
    );

    expect(r.parFamille.travaux).toBe(2);
    expect(r.parFamille.papiers).toBe(1);
  });

  it("ignore ce qui n'est pas dépassé", () => {
    const r = repartirRetards(
      [echeance("travaux", "ok"), echeance("papiers", "ok")],
      verifs(0),
    );

    expect(r.total).toBe(0);
    expect(r.parFamille.travaux).toBe(0);
  });

  it("compte le total sur toutes les familles, vérifications incluses", () => {
    const r = repartirRetards(
      [
        echeance("controle", "alerte"),
        echeance("travaux", "alerte"),
        echeance("papiers", "alerte"),
      ],
      verifs(3),
    );

    expect(r.total).toBe(6);
  });

  it("distingue les vérifications du reste de la famille « controle »", () => {
    // Une analyse légionelle est rangée en famille `controle` par le
    // registre : elle pèse dans `parFamille.controle`, jamais dans le
    // sous-compte `verifications`.
    const r = repartirRetards([echeance("controle", "alerte")], verifs(3));

    expect(r.verifications).toBe(3);
    expect(r.parFamille.controle).toBe(4);
  });

  it("présente toutes les familles, même celles sans ligne", () => {
    const r = repartirRetards([], verifs(0));

    expect(r.parFamille).toEqual({
      controle: 0,
      travaux: 0,
      operations: 0,
      papiers: 0,
      personnel: 0,
    });
    expect(r.total).toBe(0);
  });

  it("compte les vérifications même sans aucune autre échéance", () => {
    const r = repartirRetards([], verifs(5));

    expect(r.total).toBe(5);
    expect(r.parFamille.controle).toBe(5);
  });

  it("range le retard d'un titre de salarié en « personnel », pas en « controle »", () => {
    // Le défaut d'origine : `parFamille.controle = verifsEnRetard` versait le
    // flux entier dans une seule famille. Une attestation médicale dépassée
    // se comptait donc parmi les contrôles d'équipement.
    const r = repartirRetards([], verifs(0, 2));

    expect(r.parFamille.personnel).toBe(2);
    expect(r.parFamille.controle).toBe(0);
  });

  it("ne change pas le total quand une ligne change de famille", () => {
    // La promesse tenue à l'écran : le compteur du rail garde sa valeur,
    // seule sa ventilation bouge. Deux ventilations de même somme.
    const avant = repartirRetards([], verifs(5, 0));
    const apres = repartirRetards([], verifs(3, 2));

    expect(apres.total).toBe(avant.total);
    expect(apres.parFamille.controle).toBe(3);
    expect(apres.parFamille.personnel).toBe(2);
  });

  it("laisse les titres de salariés hors du sous-compte `verifications`", () => {
    // `verifications` nomme « ce qui a un calendrier réglementaire
    // d'équipement » : une attestation médicale n'en est pas un.
    //
    // Le champ **n'a aucun lecteur aujourd'hui** — le badge « Contrôles
    // matériel » qu'il servait a été retiré du rail par l'ADR-015. Ce test
    // ne garde donc rien à l'écran, et son nom ne doit pas le laisser croire ;
    // il garde la justesse du champ pour le jour où quelqu'un le relira.
    const r = repartirRetards([], verifs(3, 4));

    expect(r.verifications).toBe(3);
    expect(r.total).toBe(7);
  });
});

describe("repartirSous30j", () => {
  /** `jours` jours après le 10 août, à minuit — comme une date stockée. */
  const dans = (jours: number) =>
    new Date(LE_10_AOUT.getTime() + jours * 86_400_000);

  it("retient ce qui tombe dans la fenêtre, aujourd'hui compris", () => {
    const v = repartirSous30j(
      [
        echeance("papiers", "ok", dans(0)),
        echeance("operations", "ok", dans(30)),
      ],
      verifs(0),
      CE_MIDI,
    );

    expect(v.parFamille.papiers).toBe(1);
    expect(v.parFamille.operations).toBe(1);
    expect(v.total).toBe(2);
  });

  it("lit la FIN d'une opération en cours, pas son début passé", () => {
    // Relecture du 2026-09-14 : la règle du calendrier classe une opération
    // démarrée sur sa fin ; le « sous 30 j » du tableau de bord doit compter
    // la même chose.
    const enCours = (fin: number): EcheanceCalendrier => ({
      ...echeance("operations", "ok", dans(-20)),
      id: `op-${fin}`,
      type: "plan-prevention",
      dateFin: dans(fin),
    });
    const v = repartirSous30j([enCours(10), enCours(90)], verifs(0), CE_MIDI);

    expect(v.parFamille.operations).toBe(1);
  });

  it("écarte le trente-et-unième jour", () => {
    const v = repartirSous30j(
      [echeance("papiers", "ok", dans(31))],
      verifs(0),
      CE_MIDI,
    );

    expect(v.total).toBe(0);
  });

  it("n'y range jamais ce qui est déjà dépassé", () => {
    // Le ton `alerte` est le marqueur du dépassement : une échéance
    // d'hier ne peut pas être annoncée deux fois, en retard *et* à venir.
    const v = repartirSous30j(
      [echeance("travaux", "alerte", dans(-1))],
      verifs(0),
      CE_MIDI,
    );

    expect(v.total).toBe(0);
  });

  it("verse les vérifications à venir dans la famille des contrôles", () => {
    const v = repartirSous30j([], verifs(4), CE_MIDI);

    expect(v.parFamille.controle).toBe(4);
    expect(v.total).toBe(4);
  });

  it("verse les titres de salariés à venir dans « personnel »", () => {
    const v = repartirSous30j([], verifs(4, 3), CE_MIDI);

    expect(v.parFamille.controle).toBe(4);
    expect(v.parFamille.personnel).toBe(3);
    expect(v.total).toBe(7);
  });

  it("présente toutes les familles, même celles sans ligne", () => {
    const v = repartirSous30j([], verifs(0), CE_MIDI);

    expect(v.parFamille).toEqual({
      controle: 0,
      travaux: 0,
      operations: 0,
      papiers: 0,
      personnel: 0,
    });
  });
});
