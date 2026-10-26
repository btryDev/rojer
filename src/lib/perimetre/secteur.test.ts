import { describe, expect, it } from "vitest";
import { correspondanceSecteur } from "./secteur";

describe("correspondanceSecteur", () => {
  it("confirme quand le secteur retenu est celui du code NAF", () => {
    expect(correspondanceSecteur("56.10A", "restauration")).toEqual({
      statut: "correspond",
    });
    expect(correspondanceSecteur("47.25Z", "commerce")).toEqual({
      statut: "correspond",
    });
    expect(correspondanceSecteur("70.22Z", "bureau")).toEqual({
      statut: "correspond",
    });
  });


  it("nomme le référentiel du NAF quand un autre secteur a été retenu", () => {
    // La boulangerie-salon de thé : `47.24Z` désigne bien le commerce, qui est
    // instruit et recommandé — la page offre quand même « Changer de secteur ».
    // Sans ce nom, l'écran affirmait « aucun référentiel n'est instruit pour
    // votre activité », ce qui est faux.
    expect(correspondanceSecteur("47.24Z", "restauration")).toEqual({
      statut: "diverge",
      referentielDuNaf: { id: "commerce", nom: "Commerce de détail" },
    });
  });

  it("rend `referentielDuNaf: null` quand le code n'en désigne aucun", () => {
    // Le cas central que l'ouverture de la porte d'onboarding rend courant :
    // la page de choix propose « le secteur le plus proche », il en retient
    // un, et son document sort pré-rempli pour un autre métier.
    for (const code of ["55.10Z", "45.20A", "96.02A", "43.22A"]) {
      expect(correspondanceSecteur(code, "restauration")).toEqual({
        statut: "diverge",
        referentielDuNaf: null,
      });
    }
  });

  it("sans secteur retenu, rend quand même ce que le NAF désigne", () => {
    // La donnée que la première version perdait. Le DUERP naît SANS secteur
    // (`duerps/actions.ts` crée puis redirige vers l'écran de choix) : rendre
    // « indéterminable » faisait affirmer à l'écran « aucun référentiel ne
    // correspond à l'activité de cet établissement » pendant que l'écran
    // suivant en recommandait un.
    for (const secteur of [null, undefined, ""]) {
      expect(correspondanceSecteur("47.24Z", secteur)).toEqual({
        statut: "sans_secteur_retenu",
        referentielDuNaf: { id: "commerce", nom: "Commerce de détail" },
      });
    }
  });

  it("sans secteur retenu et sans référentiel pour le NAF, le dit sans le déduire", () => {
    expect(correspondanceSecteur("43.22A", null)).toEqual({
      statut: "sans_secteur_retenu",
      referentielDuNaf: null,
    });
  });

  it("distingue « pas de code NAF » de « ce code n'a pas de référentiel »", () => {
    // Deux faits différents que la première version rangeait tous deux sous
    // un `null`. Un `null` qui recouvre deux faits finit par en faire
    // affirmer un pour l'autre — c'est la faute que ce module corrige.
    expect(correspondanceSecteur("", "restauration")).toEqual({
      statut: "sans_naf",
    });
    expect(correspondanceSecteur("", null)).toEqual({
      statut: "sans_naf",
    });
    expect(correspondanceSecteur("43.22A", null)).not.toEqual({
      statut: "sans_naf",
    });
  });

  it("tolère la casse", () => {
    expect(correspondanceSecteur("56.10a", "restauration").statut).toBe(
      "correspond",
    );
  });

  it("tolère le point absent — « 5610A » est un code NAF normal", () => {
    // Corrigé le 2026-08-28 dans `trouverReferentielParNaf` : le format
    // acceptait le point comme facultatif, la résolution le supposait présent.
    expect(correspondanceSecteur("5610A", "restauration").statut).toBe(
      "correspond",
    );
    expect(correspondanceSecteur("4711B", "commerce").statut).toBe(
      "correspond",
    );
  });

  it("n'invente pas de point dans un code trop court pour en porter un", () => {
    // Les référentiels écrivent aussi des divisions nues (« 62 »).
    expect(correspondanceSecteur("62", "bureau").statut).toBe("correspond");
  });

  it("ne tronque pas un code trop long pour en fabriquer un valide", () => {
    // Le motif de normalisation est ancré aux deux bouts. Non ancré,
    // « 561011 » et « 5610AB » se feraient rogner en « 56.10 » et « 56.10A » :
    // deux codes malformés promus en restauration, et un document unique
    // pré-rempli pour un métier que personne n'a déclaré.
    expect(correspondanceSecteur("561011", "restauration").statut).toBe(
      "diverge",
    );
    expect(correspondanceSecteur("5610AB", "restauration").statut).toBe(
      "diverge",
    );
  });
});
