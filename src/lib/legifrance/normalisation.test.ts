// La normalisation efface la typographie, jamais un mot. Chaque équivalence
// admise a son épreuve inverse : le même texte avec UN mot changé reste un
// écart, et le diff nomme ce mot.

import { describe, expect, it } from "vitest";
import { comparerCitation, diffLisible, fragmentsDeCitation, normaliser, texteDepuisHtml } from "./normalisation";

// R. 4227-26, tel qu'on le lirait sur Légifrance (typographie de l'API simulée).
const OFFICIEL =
  "Les établissements dans lesquels sont manipulées des matières inflammables\u00a0: » — ceci est un texte d\u2019essai. " +
  "I.\u00a0\u2013\u00a0L\u2019employeur fait procéder, au moins une fois par an, à la vérification des installations\u202f; " +
  "1\u00a0° les extincteurs\u00a0; 2° les consignes. Le 1\u1d49\u02b3 alinéa s\u2019applique au § 3.";

describe("normaliser : ce qui est effacé", () => {
  it.each([
    ["apostrophe typographique", "texte d'essai"],
    ["tiret et insécables autour", "I.-L'employeur fait procéder"],
    ["tiret espacé", "I. - L'employeur fait procéder"],
    ["espace avant point-virgule", "vérification des installations;"],
    ["numérotation « 1 ° »", "1° les extincteurs; 2° les consignes"],
    ["exposant « 1ᵉʳ »", "Le 1er alinéa s'applique"],
    ["« §3 »", "au §3."],
  ])("%s : extrait exact", (_, citation) => {
    expect(comparerCitation(citation, OFFICIEL)).toMatchObject({ exacte: true });
  });

  it("guillemets englobants du corpus : retirés", () => {
    expect(comparerCitation("« L'employeur fait procéder, au moins une fois par an »", OFFICIEL).exacte).toBe(true);
  });

  it("élisions : fragments trouvés dans l'ordre", () => {
    expect(comparerCitation("L'employeur fait procéder […] à la vérification des installations", OFFICIEL).exacte).toBe(true);
    expect(fragmentsDeCitation("a […] b (...) c … d")).toEqual(["a", "b", "c", "d"]);
  });

  it("HTML de l'API : balises et entités rendues en texte", () => {
    expect(normaliser(texteDepuisHtml("<p>L&#8217;employeur</p><p>fait&nbsp;procéder</p>"))).toBe("L'employeur fait procéder");
  });
});

describe("normaliser : ce qui reste un écart (épreuves)", () => {
  it.each([
    ["un mot changé", "au moins une fois par mois", "an", "mois"],
    ["un chiffre changé", "3° les consignes", "2°", "3°"],
    ["un mot ajouté", "L'employeur fait toujours procéder", undefined, "toujours"],
    ["un mot retiré", "L'employeur procéder, au moins", "fait", undefined],
    ["un accent", "à la verification des installations", "vérification", "verification"],
    ["la casse", "l'employeur fait procéder", "L'employeur", "l'employeur"],
  ])("%s", (_, citation, officiel, corpus) => {
    const r = comparerCitation(citation, OFFICIEL);
    expect(r.exacte).toBe(false);
    if (r.exacte) return;
    const diff = r.ecarts[0].diff;
    if (corpus) expect(diff).toContainEqual({ op: "retire", mot: expect.stringContaining(corpus) });
    if (officiel) expect(diff).toContainEqual({ op: "ajoute", mot: expect.stringContaining(officiel) });
  });

  it("fragments intervertis : écart", () => {
    expect(comparerCitation("à la vérification des installations […] L'employeur fait procéder", OFFICIEL).exacte).toBe(false);
  });

  it("le diff lisible nomme le mot, avec son contexte", () => {
    const r = comparerCitation("au moins une fois par mois, à la vérification", OFFICIEL);
    expect(r.exacte).toBe(false);
    if (r.exacte) return;
    expect(diffLisible(r.ecarts[0].diff)).toBe("une fois par [-mois,-] {+an,+} à la vérification");
    expect(r.ecarts[0].distance).toBe(1);
    expect(r.ecarts[0].passageOfficiel).toBe("au moins une fois par an, à la vérification");
  });

  it("une citation sans rapport : distance au moins égale à sa longueur", () => {
    const r = comparerCitation("Tout autre chose entièrement différent", OFFICIEL);
    expect(r.exacte).toBe(false);
    if (r.exacte) return;
    expect(r.ecarts[0].distance).toBeGreaterThanOrEqual(5);
  });
});
