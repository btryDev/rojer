import { describe, expect, it } from "vitest";
import { empreinteReferentiel, obligationsConformite } from "./index";
import { estPorteeParSalarie, type Obligation } from "./types";

/**
 * Les garanties du champ `exclut` (lot A du plan de bataille du 2026-09-01).
 *
 * Le défaut réparé : le référentiel écrivait en prose que deux titres
 * s'excluent — « se substitue à », « n'est pas requise », « l'interface ne doit
 * pas proposer les deux ensemble » — et rien ne lisait ces phrases. Un
 * employeur pouvait déclarer les deux titres et le générateur inscrivait au
 * calendrier une échéance que le texte écarte.
 *
 * Chaque garantie ci-dessous est éprouvée en RÉINJECTANT le défaut qu'elle
 * prétend interdire, sur le prédicat que la garantie elle-même emploie — la
 * leçon de `transmission.test.ts`, qui a vu une contre-épreuve rester verte
 * pour avoir recopié la logique au lieu de l'appeler.
 */

/**
 * Les exclusions qui ne tiennent pas : identifiant inconnu, obligation qui
 * n'est pas un titre salarié, ou titre qui s'exclut lui-même.
 *
 * Extraite pour que la garantie et sa contre-épreuve appellent la **même**
 * fonction. Recopiée dans le test, neutraliser la garantie l'aurait laissée
 * verte.
 */
function exclusionsInvalides(obligations: readonly Obligation[]): string[] {
  const titres = new Set(
    obligations.filter(estPorteeParSalarie).map((o) => o.id),
  );
  const invalides: string[] = [];
  for (const o of obligations) {
    if (!estPorteeParSalarie(o)) continue;
    for (const x of o.exclut) {
      if (x.titre === o.id) invalides.push(`${o.id} → soi-même`);
      else if (!titres.has(x.titre)) invalides.push(`${o.id} → ${x.titre}`);
    }
  }
  return invalides;
}

/** Le témoin : un titre salarié minimal, dont on fait varier `exclut`. */
function titreTemoin(
  id: string,
  exclut: { titre: string; motif: string }[],
): Obligation {
  return {
    id,
    domaine: "sante_travail",
    libelle: `Titre témoin ${id}`,
    referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 0000-0" }],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
    realisateurs: ["medecin_travail"],
    criticite: 3,
    typologies: { travail: true },
    porteur: "salarie",
    pieceMedicale: true,
    transmet: [],
    exclut,
  };
}

const MOTIF_TEMOIN =
  "Motif de test, assez long pour tenir le contrôle de substance du motif.";

describe("exclusions mutuelles entre titres salarié", () => {
  it("toutes les obligations salarié déclarent leur champ `exclut`", () => {
    // Le type l'impose déjà. Ce test dit ce que le type garantit, pour que
    // quelqu'un qui rendrait le champ optionnel — la faute exacte de
    // `pieceMedicale` avant l'ADR-023 — voie rouge et pas seulement vert.
    for (const o of obligationsConformite) {
      if (!estPorteeParSalarie(o)) continue;
      expect(Array.isArray(o.exclut), o.id).toBe(true);
    }
  });

  it("une exclusion désigne un titre salarié réel, et jamais elle-même", () => {
    expect(exclusionsInvalides(obligationsConformite)).toEqual([]);
  });

  it("l'exclusion qui ne tient pas est attrapée, sur le prédicat de la garantie", () => {
    // Contre-épreuve. Sans les cas fabriqués, la garantie ne traverserait que
    // des exclusions valides et ne mordrait qu'au jour d'une faute de frappe.
    const reel = obligationsConformite.filter(estPorteeParSalarie)[0];
    expect(reel, "le référentiel doit porter au moins un titre").toBeDefined();

    // Un titre réel du catalogue : accepté.
    expect(
      exclusionsInvalides([
        ...obligationsConformite,
        titreTemoin("temoin-a", [{ titre: reel.id, motif: MOTIF_TEMOIN }]),
      ]),
    ).toEqual([]);

    // Un identifiant inventé : attrapé, et nommé.
    expect(
      exclusionsInvalides([
        ...obligationsConformite,
        titreTemoin("temoin-a", [{ titre: "titre-inexistant", motif: MOTIF_TEMOIN }]),
      ]),
    ).toEqual(["temoin-a → titre-inexistant"]);

    // Un titre qui s'exclut lui-même : une saisie deviendrait impossible pour
    // tout le monde, en silence.
    expect(
      exclusionsInvalides([
        ...obligationsConformite,
        titreTemoin("temoin-a", [{ titre: "temoin-a", motif: MOTIF_TEMOIN }]),
      ]),
    ).toEqual(["temoin-a → soi-même"]);

    // Et le cas qui exerce la FINESSE du prédicat : une obligation portée par
    // l'ÉTABLISSEMENT n'est pas un titre déclarable, et la nommer ne peut rien
    // exclure. Sans ce cas, élargir le prédicat en « n'est pas un équipement »
    // laisserait tout vert.
    expect(
      exclusionsInvalides([
        ...obligationsConformite,
        titreTemoin("temoin-a", [
          {
            titre: "sante-travail-etablissement-liste-postes-risques",
            motif: MOTIF_TEMOIN,
          },
        ]),
      ]),
    ).toEqual(["temoin-a → sante-travail-etablissement-liste-postes-risques"]);
  });

  it("chaque exclusion porte un motif substantiel", () => {
    // Le motif n'est pas une note interne : il est MONTRÉ au dirigeant quand
    // le produit refuse sa saisie. Un refus sans motif est un mur.
    for (const o of obligationsConformite) {
      if (!estPorteeParSalarie(o)) continue;
      for (const x of o.exclut) {
        expect(x.motif.trim().length, `${o.id} → ${x.titre}`).toBeGreaterThan(40);
      }
    }
  });

  it("une exclusion ne fait pas bouger l'empreinte du référentiel", () => {
    // Décision explicite, même que pour `transmet` : une exclusion ne produit
    // aucune échéance, elle en empêche une. L'y faire entrer réconcilierait
    // tous les calendriers de tous les dossiers pour un résultat identique.
    const avant = empreinteReferentiel([titreTemoin("temoin-empreinte", [])]);
    const apres = empreinteReferentiel([
      titreTemoin("temoin-empreinte", [
        { titre: "temoin-autre", motif: MOTIF_TEMOIN },
      ]),
    ]);
    expect(apres).toBe(avant);
  });

  it("l'empreinte réagit toujours à ce qui, lui, change les échéances", () => {
    // Contre-épreuve du test précédent : sans elle, une empreinte cassée qui
    // ne réagirait plus à rien le passerait aussi.
    const temoin = titreTemoin("temoin-empreinte", []);
    expect(
      empreinteReferentiel([{ ...temoin, periodicite: "biennale" }]),
    ).not.toBe(empreinteReferentiel([temoin]));
  });
});
