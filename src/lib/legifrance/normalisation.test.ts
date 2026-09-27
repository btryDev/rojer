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

// C51 — artefacts relevés au premier passage réel (2026-09-27). Chaque
// équivalence a son épreuve inverse : le même passage avec un mot ou un
// chiffre changé reste un écart.
describe("C51 : typographie des réponses réelles", () => {
  const exact = (citation: string, officiel: string) => comparerCitation(citation, officiel).exacte;

  it("puces de liste « ― » et « - » (EL 19, DF 10) : effacées des deux côtés", () => {
    const off = "Elles ont pour objet de s'assurer :<br/> ― de l'absence de modifications ;<br/> ― de l'état d'entretien.";
    expect(exact("Elles ont pour objet de s'assurer : de l'absence de modifications ; de l'état d'entretien.", texteDepuisHtml(off))).toBe(true);
    expect(exact("Elles ont pour objet de s'assurer : - de l'absence de modifications", texteDepuisHtml(off))).toBe(true);
    // épreuve : un mot changé derrière la puce
    expect(exact("Elles ont pour objet de s'assurer : de l'absence de réparations", texteDepuisHtml(off))).toBe(false);
    // un trait d'union entre deux mots n'est pas une puce
    expect(exact("coupe feu", "coupe-feu")).toBe(false);
  });

  it("numéro d'élément « 1. » = « 1° » (CCH R. 134-2) ; le chiffre reste comparé", () => {
    const off = "La sécurité consiste à assurer : 1. La fermeture des portes ; 2. L'accès sans danger.";
    expect(exact("consiste à assurer : 1° La fermeture des portes ; 2° L'accès sans danger", off)).toBe(true);
    expect(exact("consiste à assurer : 1° La fermeture des portes ; 3° L'accès sans danger", off)).toBe(false);
  });

  it("espaces parasites : « an , », « montagne . », « m/ s », « § 1.A », « 5 e »", () => {
    expect(exact("au moins une fois par an, les vérifications", "au moins une fois par an , les vérifications")).toBe(true);
    expect(exact("Refuges de montagne.", "REF Refuges de montagne .")).toBe(true);
    expect(exact("n'excède pas 0,15 m/s.", "n'excède pas 0,15 m/ s.")).toBe(true);
    expect(exact("§ 1. A l'exception des dispositions", "§ 1.A l'exception des dispositions")).toBe(true);
    expect(exact("classés dans la 5e catégorie", "classés dans la 5 e catégorie")).toBe(true);
    // épreuves : le chiffre et la lettre restent comparés
    expect(exact("classés dans la 4e catégorie", "classés dans la 5 e catégorie")).toBe(false);
    expect(exact("n'excède pas 0,15 m/h.", "n'excède pas 0,15 m/ s.")).toBe(false);
    expect(exact("§ 2. A l'exception", "§ 1.A l'exception")).toBe(false);
  });

  it("guillemets droits espacés de l'API (arrêté 2004-03-01 art. 5)", () => {
    const off = 'On entend par " examen d\'adéquation d\'un appareil de levage " l\'examen qui consiste';
    expect(exact('On entend par "examen d\'adéquation d\'un appareil de levage" l\'examen qui consiste', off)).toBe(true);
    expect(exact('On entend par "examen d\'adéquation d\'un engin de levage" l\'examen', off)).toBe(false);
  });

  it("bords d'un fragment : la ponctuation qui ferme la citation n'est pas comparée ; à l'intérieur, si", () => {
    const off = "une signalisation suffise à cet effet, sans préjudice des dispositions";
    expect(exact("une signalisation suffise à cet effet.", off)).toBe(true);
    expect(exact("[…]. suffise à cet effet", off)).toBe(true);
    expect(exact("suffise à cet effet. Sans préjudice", off)).toBe(false);
    expect(exact("une signalisation suffise à cet égard.", off)).toBe(false);
  });

  it("balise « (art. 26) » du corpus : coupe comme une élision", () => {
    expect(fragmentsDeCitation("(art. 26) Au cours de son exploitation (art. 1er) Le propriétaire")).toEqual([
      "Au cours de son exploitation",
      "Le propriétaire",
    ]);
  });
});

describe("C51 : alinéas de la citation", () => {
  const off = "§ 5. Les occupants font établir un rapport tous les cinq ans. § 6. Par dérogation, dans les halls. § 7. Les locataires doivent pouvoir justifier.";
  it("deux lignes citées, non contiguës dans le texte (GH 61 : § 5 puis § 7) : fragments ordonnés", () => {
    expect(comparerCitation("§ 5. Les occupants font établir un rapport tous les cinq ans.\n§ 7. Les locataires doivent pouvoir justifier.", off).exacte).toBe(true);
  });
  it("épreuves : lignes interverties, ou un mot changé dans une ligne", () => {
    expect(comparerCitation("§ 7. Les locataires doivent pouvoir justifier.\n§ 5. Les occupants font établir", off).exacte).toBe(false);
    expect(comparerCitation("§ 5. Les occupants font établir un rapport tous les trois ans.\n§ 7. Les locataires", off).exacte).toBe(false);
  });
});

describe("C51 : guillemet droit isolé", () => {
  it("un « \" » ouvert et jamais fermé par l'API (arrêté 2011-12-26, annexe II)", () => {
    const off = 'elle donnera lieu à un rapport, dit " quadriennal , rédigé comme un rapport. Voir le "registre" ici.';
    expect(comparerCitation('elle donnera lieu à un rapport, dit " quadriennal , rédigé comme un rapport', off).exacte).toBe(true);
    expect(comparerCitation('elle donnera lieu à un rapport, dit " triennal , rédigé', off).exacte).toBe(false);
  });
});
