// Le rangement de l'écran « Ce qui doit être en place » par familles d'usage.
//
// Le champ `usageEcran` est requis par le type, mais le type admet `null` :
// il ne sait pas dire qu'une ligne de l'écran DOIT être rangée, ni qu'une
// sous-catégorie appartient à sa famille. C'est ici. Une ligne de l'écran sans
// rangement n'aurait aucune famille où s'afficher — il n'y a plus de groupe
// « autres » pour la recueillir.
//
// Aucune liste recopiée : la propriété se vérifie sur ce que `regle.ts` dit de
// chaque obligation, et un ajout au référentiel entre dans le relevé de
// lui-même.

import { describe, expect, it } from "vitest";
import {
  obligationParId,
  obligationsConformite,
} from "@/lib/referentiels/conformite";
import { figureSurLEcranEnPlace } from "./regle";
import { ORDRE_GROUPES, ORDRE_SOUS_CATEGORIES, rangementDe } from "./familles";

const SUR_L_ECRAN = obligationsConformite.filter(figureSurLEcranEnPlace);
const HORS_ECRAN = obligationsConformite.filter(
  (o) => !figureSurLEcranEnPlace(o),
);

describe("le rangement de l'écran « Ce qui doit être en place »", () => {
  it("le relevé voit les lignes de l'écran — sinon ce test ne contrôle rien", () => {
    // Borne basse, pas un compte : 58 obligations au 2026-10-17.
    expect(SUR_L_ECRAN.length).toBeGreaterThanOrEqual(45);
  });

  it("le relevé voit des lignes hors de l'écran, dont des titres salarié", () => {
    expect(HORS_ECRAN.some((o) => o.porteur === "salarie")).toBe(true);
  });

  it.each(SUR_L_ECRAN.map((o) => [o.id, o] as const))(
    "%s : figure à l'écran, donc porte un rangement",
    (_id, o) => {
      expect(rangementDe(o), "ligne de l'écran sans famille").not.toBeNull();
    },
  );

  it.each(HORS_ECRAN.map((o) => [o.id, o] as const))(
    "%s : hors de l'écran, donc sans rangement",
    (_id, o) => {
      expect(rangementDe(o)).toBeNull();
    },
  );

  it.each(
    obligationsConformite
      .filter((o) => rangementDe(o) !== null)
      .map((o) => [o.id, o] as const),
  )("%s : la sous-catégorie appartient à sa famille", (_id, o) => {
    const { groupe, sous } = rangementDe(o)!;
    expect(ORDRE_GROUPES).toContain(groupe);
    const permises = ORDRE_SOUS_CATEGORIES[groupe];
    if (permises.length === 0) expect(sous).toBeNull();
    else expect(permises).toContain(sous);
  });

  it.each([
    ["information-etablissement-avis-acces-duerp", "quotidien", "informer"],
    [
      "incendie-travail-chiffons-impregnes-recipients-clos",
      "incendie_secours",
      "prevenir",
    ],
    ["incendie-registre-securite", "installations", null],
  ] as const)("borne nommée : %s → %s / %s", (id, groupe, sous) => {
    const o = obligationParId(id);
    expect(o, `${id} a quitté le référentiel`).toBeDefined();
    expect(rangementDe(o!)).toEqual({ groupe, sous });
  });
});
