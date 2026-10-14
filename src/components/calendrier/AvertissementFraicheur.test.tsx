// @vitest-environment jsdom
/**
 * L'avertissement de fraîcheur, tel qu'un écran le pose.
 *
 * Le composant ne décide rien : il pose la phrase de `phraseFraicheur`, et rien
 * quand le calendrier est à jour. Ce test le prend par les quatre états réels,
 * pas par des chaînes inventées — une phrase qui changerait dans `fraicheur.ts`
 * changerait ici sans qu'on ait à la recopier.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AvertissementFraicheur } from "./AvertissementFraicheur";
import {
  phraseFraicheur,
  SUJET_UNE_ECHEANCE,
  type FraicheurCalendrier,
} from "@/lib/calendrier/fraicheur";

afterEach(cleanup);

const CAL = "/etablissements/e1/calendrier";

const NON_SAINS: FraicheurCalendrier[] = [
  { etat: "perime", sceauPose: "ancien", sceauAttendu: "courant" },
  { etat: "echec_regeneration" },
  { etat: "jamais_genere" },
];

describe("AvertissementFraicheur", () => {
  it.each(NON_SAINS)("dit la phrase d'un calendrier « $etat »", (f) => {
    const phrase = phraseFraicheur(f, SUJET_UNE_ECHEANCE);
    expect(phrase).not.toBeNull();
    render(<AvertissementFraicheur phrase={phrase} hrefCalendrier={CAL} />);
    expect(screen.getByRole("status").textContent).toContain(phrase);
  });

  it("mène au calendrier, qui répare à l'ouverture", () => {
    render(
      <AvertissementFraicheur
        phrase={phraseFraicheur({ etat: "jamais_genere" })}
        hrefCalendrier={CAL}
      />,
    );
    expect(
      screen.getByRole("link", { name: /calendrier/i }).getAttribute("href"),
    ).toBe(CAL);
  });

  it("ne pose rien quand le calendrier est à jour", () => {
    const { container } = render(
      <AvertissementFraicheur
        phrase={phraseFraicheur({ etat: "a_jour" })}
        hrefCalendrier={CAL}
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});
