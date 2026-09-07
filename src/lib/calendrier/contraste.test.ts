import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CHAMP_ETAT, ENCRE_ETAT, type RegistreLigne } from "./etats";

/**
 * Le contraste des couples champ/encre, mesuré plutôt qu'affirmé.
 *
 * Ce fichier existe parce qu'un correctif justifié PAR l'accessibilité ne
 * l'atteignait pas : le cerne d'une puce d'état avait été posé en
 * `--board-slate` sur une tuile `--board-slate-pale`, soit **1,41:1** là où
 * WCAG 1.4.11 demande 3:1 pour un élément graphique porteur d'information. Rien
 * ne l'a signalé — un contraste ne se voit pas dans une suite de tests, et il
 * se voit mal à l'œil quand on connaît déjà la réponse.
 */
const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Les jetons de la charte, lus dans `globals.css` — jamais recopiés ici. */
function jetons(): Record<string, string> {
  const css = readFileSync(join(RACINE, "src", "app", "globals.css"), "utf8");
  const table: Record<string, string> = {};
  for (const m of css.matchAll(/(--board-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    table[m[1]] = m[2];
  }
  return table;
}

function luminance(hexa: string): number {
  const h = hexa.replace("#", "");
  const canaux = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * canaux[0] + 0.7152 * canaux[1] + 0.0722 * canaux[2];
}

export function contraste(a: string, b: string): number {
  const [haut, bas] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (haut + 0.05) / (bas + 0.05);
}

/** Résout `var(--board-x)` en `#rrggbb`. */
function resoudre(valeur: string, table: Record<string, string>): string {
  const m = valeur.match(/var\((--board-[\w-]+)\)/);
  const hexa = m ? table[m[1]] : valeur;
  if (!hexa) throw new Error(`jeton introuvable : ${valeur}`);
  return hexa;
}

describe("contraste des couples champ/encre", () => {
  const table = jetons();
  const etats = Object.keys(CHAMP_ETAT) as RegistreLigne[];

  it("le calcul est juste sur deux repères connus", () => {
    // Un test de mesure qui ne se vérifie pas lui-même ne mesure rien.
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contraste("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  /**
   * Le seuil du texte courant est 4,5:1. Trois couples sur cinq l'atteignent
   * largement — `proche` 6,65:1, `faite` 6,40:1, `aPlanifier` 6,02:1. **Deux
   * restent en dessous, mesurés : `enRetard` à 4,34:1 et `lointain` à
   * 3,82:1.**
   *
   * Ce n'est pas une régression : c'est la palette telle qu'elle a toujours
   * été. Les corriger demande de retoucher `--board-signal` / `--board-blue-soft`
   * ou leurs encres — des jetons employés partout. C'est une décision de
   * charte, pas un correctif à glisser dans un test.
   *
   * Note utile pour trancher : ces encres sont **toutes conformes sur la
   * surface creuse** (5,38:1 au pire). L'écart ne concerne donc que le texte
   * posé DANS une pastille colorée, où il est court et souvent semi-gras.
   *
   * Le plancher est donc posé à la valeur réellement atteinte : le couple ne
   * peut plus EMPIRER sans qu'un test tombe, et l'écart est écrit noir sur
   * blanc au lieu de dormir dans une palette que personne ne mesure.
   */
  // Les planchers serrent au millième la valeur mesurée pour les deux couples
  // sous le seuil, et non à la décimale : « 4,3 » laissait environ 1 % de marge
  // sous 4,338, si bien qu'« ils ne peuvent plus empirer » était vrai à peu
  // près et pas exactement. Les trois autres gardent le seuil de 4,5 — ils en
  // sont loin au-dessus, et c'est lui qui compte pour eux.
  const PLANCHER: Record<RegistreLigne, number> = {
    enRetard: 4.338, // mesuré 4,3383. Sous 4,5 — à trancher au niveau de la charte.
    proche: 4.5, // mesuré 6,65
    lointain: 3.82, // mesuré 3,8201. Le plus bas des cinq.
    faite: 4.5, // mesuré 6,40
    aPlanifier: 4.5, // mesuré 6,02
  };

  it("chaque encre est lisible sur son propre champ", () => {
    for (const etat of etats) {
      const c = contraste(
        resoudre(ENCRE_ETAT[etat], table),
        resoudre(CHAMP_ETAT[etat], table),
      );
      expect(c, `${etat} : encre sur champ`).toBeGreaterThanOrEqual(
        PLANCHER[etat],
      );
    }
  });

  it("deux couples restent sous le seuil du texte courant, et c'est écrit", () => {
    // La liste est figée : un troisième couple qui passerait sous le seuil fait
    // tomber ce test. Et si l'un des deux est corrigé un jour, il tombe aussi —
    // ce sera le moment de relever son plancher et de retirer l'exception.
    const sousLeSeuil = etats.filter(
      (e) =>
        contraste(resoudre(ENCRE_ETAT[e], table), resoudre(CHAMP_ETAT[e], table)) <
        4.5,
    );
    expect(sousLeSeuil.sort()).toEqual(["enRetard", "lointain"]);
  });

  it("chaque encre reste lisible sur la surface creuse", () => {
    // La tuile des pastilles de vigilance, et tout bloc creux du produit.
    const creux = table["--board-slate-pale"];
    for (const etat of etats) {
      const c = contraste(resoudre(ENCRE_ETAT[etat], table), creux);
      expect(c, `${etat} : encre sur surface creuse`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("le cerne d'une puce d'état atteint le seuil graphique", () => {
    // Le défaut exact : `CHAMP_ETAT.aPlanifier` VAUT la surface creuse, donc
    // la puce n'existe que par son cerne. C'est lui qui porte l'information.
    const creux = table["--board-slate-pale"];
    expect(resoudre(CHAMP_ETAT.aPlanifier, table)).toBe(creux);
    const c = contraste(resoudre(ENCRE_ETAT.aPlanifier, table), creux);
    expect(c, "cerne de la puce « à planifier »").toBeGreaterThanOrEqual(3);
  });

  it("la puce de la vitrine d'un appareil existe pour les cinq états", () => {
    // LE DÉFAUT, RETROUVÉ AILLEURS (2026-09-04). Ce fichier savait déjà que
    // `CHAMP_ETAT.aPlanifier` VAUT la surface creuse, et le calendrier en avait
    // tiré un cerne. `VitrineEquipement` posait la même puce sur la même
    // surface SANS cerne : la puce de « à planifier » y était peinte de la
    // couleur exacte de son fond — 1,00:1 —, et sur une carte à cinq signaux le
    // dirigeant lisait quatre points et une étiquette nue. Sur l'état qui dit
    // précisément qu'aucune date n'est convenue.
    //
    // Le fond de la pastille se RELÈVE dans le composant, il n'est pas recopié
    // ici : recopié, il cesserait de mesurer l'écran le jour où l'écran change.
    const source = readFileSync(
      join(RACINE, "src", "components", "equipements", "VitrineEquipement.tsx"),
      "utf8",
    );
    const fond = source.match(/bg-\[color:var\((--board-[\w-]+)\)\]/);
    if (!fond) throw new Error("fond de la pastille introuvable dans la vitrine");
    const hexaFond = table[fond[1]];
    expect(hexaFond, `jeton ${fond[1]}`).toBeDefined();

    // Ce qui rend le cerne indispensable, mesuré et non supposé : au moins un
    // état a une puce indiscernable de ce fond.
    const invisibles = etats.filter(
      (e) => contraste(resoudre(CHAMP_ETAT[e], table), hexaFond) < 3,
    );
    expect(invisibles.length, "aucun état n'aurait besoin du cerne").toBeGreaterThan(0);

    // Donc la puce en porte un, pris à l'encre de l'état.
    expect(
      /boxShadow:\s*`inset 0 0 0 1px \$\{ENCRE_ETAT\[etat\]\}`/.test(source),
      "la puce de la vitrine n'a plus de cerne : l'état « à planifier » y " +
        "redevient invisible sur son propre fond.",
    ).toBe(true);

    // Et ce cerne tient pour les cinq, pas seulement pour celui qui a saigné.
    for (const e of etats) {
      expect(
        contraste(resoudre(ENCRE_ETAT[e], table), hexaFond),
        `${e} : cerne de la puce sur le fond de la pastille`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("`--board-slate` ne conviendrait PAS comme cerne — la faute d'origine", () => {
    const c = contraste(table["--board-slate"], table["--board-slate-pale"]);
    expect(c).toBeLessThan(3);
  });
});
