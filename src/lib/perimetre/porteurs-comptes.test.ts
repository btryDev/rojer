import { describe, expect, it } from "vitest";

import {
  phraseHorsCompte,
  porteursComptesPar,
  porteursDuReferentiel,
  sondes,
  type LigneSondee,
} from "./porteurs-comptes";
import {
  enumererFamilles,
  FAMILLES_NOMMEES,
  LABEL_FAMILLE_PROSE,
} from "@/lib/calendrier/labels";
import { FAMILLES_FILTRABLES } from "@/lib/calendrier/echeances";

/**
 * ÉPROUVER LA GARDE EN LA CASSANT.
 *
 * Une garde qui ne peut rien attraper rassure sans protéger. Celle-ci est donc
 * mise à l'épreuve dans les deux sens : on lui donne une agrégation qui compte
 * TOUT et on vérifie que la phrase perd sa réserve, puis une qui ne compte
 * RIEN, puis la vraie. Si l'un des trois rendait la même phrase, la dérivation
 * serait décorative.
 */

/** Une agrégation qui garde tout ce qu'on lui donne. */
const compteTout = (lignes: LigneSondee[]) => lignes.length;
/** Une agrégation qui ne garde rien. */
const compteRien = () => 0;
/** Une agrégation qui ne garde que ce qui porte un `equipementId`. */
const compteLesEquipements = (lignes: LigneSondee[]) =>
  lignes.filter((l) => l.equipementId !== null).length;

describe("porteursDuReferentiel", () => {
  it("mesure les porteurs sur le référentiel, sans les énumérer", () => {
    const porteurs = porteursDuReferentiel();
    // Le point de tout le module : il existe des obligations qu'aucun
    // équipement ne porte. Si un jour ce n'est plus vrai, les écrans
    // d'équipement pourront dire « tout » — et ce test sera le seul endroit
    // qui aura besoin d'être rouvert.
    expect(porteurs.has("etablissement")).toBe(true);
    expect(porteurs.has("salarie")).toBe(true);
    expect(porteurs.has("equipement")).toBe(true);
  });
});

describe("porteursComptesPar — la sonde", () => {
  it("rend les trois porteurs quand l'agrégation garde tout", () => {
    expect([...porteursComptesPar(compteTout)].sort()).toEqual([
      "equipement",
      "etablissement",
      "salarie",
    ]);
  });

  it("n'en rend aucun quand l'agrégation ne garde rien", () => {
    expect([...porteursComptesPar(compteRien)]).toEqual([]);
  });

  it("distingue le porteur équipement des deux autres", () => {
    expect([...porteursComptesPar(compteLesEquipements)]).toEqual([
      "equipement",
    ]);
  });

  it("fabrique une sonde par porteur, chacune en retard et non réalisée", () => {
    const now = new Date("2026-09-03T10:00:00Z");
    const s = sondes(now);
    expect(s.map((x) => x.porteur).sort()).toEqual([
      "equipement",
      "etablissement",
      "salarie",
    ]);
    for (const { ligne } of s) {
      expect(ligne.datePrevue.getTime()).toBeLessThan(now.getTime());
    }
  });
});

describe("phraseHorsCompte", () => {
  it("rend null quand rien n'est laissé dehors", () => {
    expect(phraseHorsCompte([])).toBeNull();
  });

  it("énumère au singulier comme au pluriel, préposition répétée", () => {
    expect(phraseHorsCompte(["salarie"])).toBe(
      "Ce qui est dû au titre de vos salariés n'y figure pas.",
    );
    expect(phraseHorsCompte(["equipement", "etablissement", "salarie"])).toBe(
      "Ce qui est dû au titre de vos équipements, de l'établissement lui-même ou de vos salariés n'y figure pas.",
    );
  });
});

/**
 * L'AUTRE MOITIÉ DE LA MÊME IDÉE : une énumération de familles se dérive du
 * type fermé, elle ne se recopie pas.
 *
 * Le défaut réparé : la page Calendrier nommait quatre familles sur cinq, et
 * son aide trois sur cinq sous le mot « toutes ». `personnel` était née avec
 * l'ADR-023 sans que les phrases bougent.
 */
describe("enumererFamilles", () => {
  /**
   * LE RAPPROCHEMENT QUE `labels.ts` NE PEUT PAS FAIRE LUI-MÊME.
   *
   * Il ne peut pas importer `FAMILLES_FILTRABLES` : c'est une valeur d'un
   * module qui ouvre la base, et `labels.ts` est chargé par un composant
   * client — le build refuse. Les deux listes vivent donc séparées, et c'est
   * ici qu'elles se confrontent. Sans ce test, une famille pourrait être
   * filtrable sans jamais être nommée, ou l'inverse.
   */
  it("nomme exactement les familles que l'écran propose de filtrer", () => {
    expect([...FAMILLES_NOMMEES].sort()).toEqual([...FAMILLES_FILTRABLES].sort());
  });

  it("nomme toutes les familles filtrables, et rien d'autre", () => {
    const phrase = enumererFamilles();
    for (const f of FAMILLES_FILTRABLES) {
      expect(phrase).toContain(LABEL_FAMILLE_PROSE[f]);
    }
    // Une famille de plus au type ⇒ un mot de plus dans la phrase. Le compte
    // se dérive du même tableau, il n'est écrit nulle part.
    expect(phrase.split(/, | et /).length).toBe(FAMILLES_FILTRABLES.length);
  });

  /** LA CASSE : sur une liste amputée, la phrase est plus courte. */
  it("rétrécit quand on lui retire une famille", () => {
    const complet = enumererFamilles();
    const ampute = enumererFamilles(FAMILLES_NOMMEES.slice(0, -1));
    expect(ampute).not.toBe(complet);
    expect(ampute).not.toContain(
      LABEL_FAMILLE_PROSE[FAMILLES_NOMMEES[FAMILLES_NOMMEES.length - 1]],
    );
  });

  it("ne laisse aucune famille sans mot lisible", () => {
    for (const f of FAMILLES_FILTRABLES) {
      expect(LABEL_FAMILLE_PROSE[f]).toMatch(/^[a-zà-ÿ]/);
    }
  });
});
