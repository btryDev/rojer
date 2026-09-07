// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Cotation } from "./CarteFiche";
import { CRITICITE_ACTION_MAX } from "@/lib/actions/schema";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * UNE VALEUR HORS ÉCHELLE NE SE DESSINE PAS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * LE DÉFAUT, ET POURQUOI LE PREMIER CORRECTIF NE L'A PAS ATTEINT. Le
 * 2026-09-04, la fiche d'une action affichait « 6 sur 5 », cinq points tous
 * pleins : une criticité de RISQUE — échelle 1–16, produit de la gravité par la
 * probabilité divisé par la maîtrise — avait atterri dans un champ d'ACTION,
 * borné à 5. Deux grandeurs, un seul nom de colonne.
 *
 * Le lot du matin a fermé la porte d'entrée : le schéma des deux écrivains, et
 * le seed qui recopiait l'une dans l'autre. **Nommer l'échelle ne borne pas la
 * valeur** — les lignes déjà en base ont continué d'afficher « 6 sur 5 », et le
 * contrôle visuel de l'après-midi les a retrouvées, ce que ce dépôt n'aurait pas
 * su voir seul : aucun test ne montait ce composant.
 *
 * CE QUE CETTE GARDE TIENT. Une rangée pleine se lit « au maximum », c'est-à-dire
 * une valeur DANS l'échelle — exactement le contraire de ce qui se passe. Écrêter
 * à 5 aurait été pire encore : le texte aurait dit « 5 sur 5 » et plus personne
 * n'aurait vu l'anomalie, à commencer par celle qui la subit.
 *
 * Le texte est exact ; ce sont les points qui mentaient. Ils s'effacent, et le
 * chiffre porte seul — un manque se nomme, il ne se comble pas.
 */

afterEach(cleanup);

/** Les pastilles sont `aria-hidden` : on les compte dans le DOM, pas au rôle. */
function points(conteneur: HTMLElement): number {
  return conteneur.querySelectorAll("span[aria-hidden] > span").length;
}

describe("Cotation", () => {
  it("dessine autant de points que l'échelle en compte, tant qu'on y est", () => {
    const { container } = render(<Cotation valeur={3} sur={5} />);
    expect(points(container)).toBe(5);
    expect(container.textContent).toContain("3 sur 5");
  });

  it("dessine encore aux deux bornes de l'échelle", () => {
    // Les bornes, pas une liste de valeurs : c'est là que le prédicat glisse.
    const bas = render(<Cotation valeur={0} sur={5} />);
    expect(points(bas.container)).toBe(5);
    cleanup();
    const haut = render(<Cotation valeur={5} sur={5} />);
    expect(points(haut.container)).toBe(5);
  });

  it("ne dessine RIEN au-delà de l'échelle, et dit le chiffre vrai", () => {
    // La valeur exacte relevée à l'écran, sur l'échelle exacte du plan
    // d'actions — reprise de la constante, jamais du souvenir qu'elle vaut 5.
    const { container } = render(
      <Cotation valeur={CRITICITE_ACTION_MAX + 1} sur={CRITICITE_ACTION_MAX} />,
    );
    expect(
      points(container),
      "une rangée de points sous une valeur hors échelle se lit « au maximum » : " +
        "c'est le contraire de ce qu'elle vaut.",
    ).toBe(0);
    expect(container.textContent).toContain(
      `${CRITICITE_ACTION_MAX + 1} sur ${CRITICITE_ACTION_MAX}`,
    );
    expect(
      container.textContent,
      "écrêter à l'échelle effacerait l'anomalie au lieu de la montrer",
    ).not.toContain(`${CRITICITE_ACTION_MAX} sur ${CRITICITE_ACTION_MAX}`);
  });

  it("ne dessine rien non plus sous zéro", () => {
    const { container } = render(<Cotation valeur={-1} sur={5} />);
    expect(points(container)).toBe(0);
    expect(container.textContent).toContain("-1 sur 5");
  });
});
