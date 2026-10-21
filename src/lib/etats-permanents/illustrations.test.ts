// Les illustrations de « Ce qui doit être en place » (2026-10-20).
//
// Deux promesses à tenir, parce qu'aucun build ne les vérifie : chaque ligne de
// l'écran a un sujet choisi, et l'écran ne pointe jamais vers un fichier absent.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { obligationParId, obligationsConformite } from "@/lib/referentiels/conformite";
import { figureSurLEcranEnPlace } from "./regle";
import { ORDRE_GROUPES, ORDRE_SOUS_CATEGORIES, GROUPE_REPLI } from "./familles";
import {
  SUJETS_DESSINES,
  SUJET_PAR_OBLIGATION,
  illustrationDe,
  teinteDe,
} from "./illustrations";

const SUR_L_ECRAN = obligationsConformite.filter(figureSurLEcranEnPlace);
const fichier = (chemin: string) => join(process.cwd(), "public", chemin);

describe("les illustrations de l'écran « Ce qui doit être en place »", () => {
  it("le relevé voit les lignes de l'écran — sinon ce test ne contrôle rien", () => {
    expect(SUR_L_ECRAN.length).toBeGreaterThanOrEqual(45);
  });

  it("chaque ligne de l'écran a un sujet choisi — une obligation neuve ne passe pas sans dessin décidé", () => {
    const sansSujet = SUR_L_ECRAN.filter((o) => !SUJET_PAR_OBLIGATION[o.id]).map((o) => o.id);
    expect(sansSujet).toEqual([]);
  });

  it("aucun sujet n'est attaché à une obligation qui n'existe plus", () => {
    const orphelins = Object.keys(SUJET_PAR_OBLIGATION).filter((id) => !obligationParId(id));
    expect(orphelins).toEqual([]);
  });

  it("chaque dessin annoncé a son fichier", () => {
    for (const s of SUJETS_DESSINES) {
      expect(existsSync(fichier(`/illustrations/en-place/${s}.png`)), s).toBe(true);
    }
  });

  it("chaque ligne de l'écran pointe vers un fichier déposé, repli compris", () => {
    for (const o of SUR_L_ECRAN) {
      const u = o.usageEcran;
      const chemin = illustrationDe(o.id, u?.groupe ?? GROUPE_REPLI, u?.sous ?? null);
      expect(existsSync(fichier(chemin)), `${o.id} → ${chemin}`).toBe(true);
    }
  });

  it("une ligne sans sujet connu retombe sur le dessin de sa sous-catégorie", () => {
    expect(illustrationDe("ligne-inconnue", "incendie_secours", "alerter")).toBe(
      "/illustrations/en-place/alarme.png",
    );
  });

  it("les replis de chaque famille et sous-catégorie sont des fichiers déposés", () => {
    for (const g of [...ORDRE_GROUPES, GROUPE_REPLI] as const) {
      expect(existsSync(fichier(illustrationDe("inconnue", g, null))), g).toBe(true);
    }
    for (const g of ORDRE_GROUPES) {
      for (const s of ORDRE_SOUS_CATEGORIES[g]) {
        expect(existsSync(fichier(illustrationDe("inconnue", g, s))), `${g}/${s}`).toBe(true);
      }
    }
  });

  it("la teinte suit la famille : feu, puis secours pour évacuer et secourir", () => {
    expect(teinteDe("incendie_secours", "alerter")).toBe("feu");
    expect(teinteDe("incendie_secours", "evacuer")).toBe("secours");
    expect(teinteDe("incendie_secours", "secourir")).toBe("secours");
    expect(teinteDe("quotidien", "informer")).toBe("quotidien");
    expect(teinteDe("organisation", null)).toBe("organisation");
    expect(teinteDe("installations", null)).toBe("organisation");
  });
});
