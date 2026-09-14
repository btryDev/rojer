import { describe, expect, it } from "vitest";
import { domainesPresents, estDomaineConnu } from "./domaines-presents";
import { libelleMoisPrecedents, libelleTotalAnnee } from "./labels";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { DOMAINES_OBLIGATION } from "@/lib/referentiels/conformite/types";

/**
 * Deux défauts d'écran que seul un contrôle visuel voyait, et ce qui les garde.
 *
 * Aucun test ne les attrapait, et pour une raison commune : la règle vivait
 * dans le JSX d'une page serveur, où rien ne pouvait l'appeler. Les deux
 * fonctions ont donc été extraites — c'est l'extraction qui crée la garantie,
 * le test ne fait que la nommer.
 */

const idsDeDomaine = (domaine: string) =>
  obligationsConformite.filter((o) => o.domaine === domaine).map((o) => o.id);

describe("les domaines proposés au filtre du calendrier", () => {
  it("ne propose que les domaines réellement présents", () => {
    const elec = idsDeDomaine("electricite")[0];
    expect(domainesPresents([{ obligationId: elec }])).toEqual(["electricite"]);
  });

  it("propose un domaine que la liste en dur ignorait", () => {
    // LE défaut. Le filtre portait trois valeurs écrites à la main —
    // électricité, incendie, aération. Une ligne « Santé au travail »
    // s'affichait avec son domaine visible et ne pouvait pas être filtrée.
    const sante = idsDeDomaine("sante_travail")[0];
    expect(sante, "le référentiel ne porte plus de domaine santé au travail").toBeDefined();
    expect(domainesPresents([{ obligationId: sante }])).toEqual([
      "sante_travail",
    ]);
  });

  it("suit l'ordre du référentiel, pas celui de la saisie", () => {
    // Un ordre d'apparition rendrait le filtre instable : deux dossiers
    // comparables présenteraient leurs choix dans un ordre différent, et le
    // même dossier changerait d'ordre au fil des saisies.
    const elec = idsDeDomaine("electricite")[0];
    const sante = idsDeDomaine("sante_travail")[0];
    const attendu = DOMAINES_OBLIGATION.filter(
      (d) => d === "electricite" || d === "sante_travail",
    );
    expect(
      domainesPresents([{ obligationId: sante }, { obligationId: elec }]),
    ).toEqual(attendu);
  });

  it("ignore un identifiant d'obligation inconnu plutôt que d'inventer un domaine", () => {
    // Une `Verification` en base peut porter l'id d'une obligation retirée du
    // référentiel : `obligationId` n'a pas de clé étrangère (ADR-003).
    expect(domainesPresents([{ obligationId: "obligation-retiree" }])).toEqual(
      [],
    );
  });

  it("un domaine du référentiel est accepté en filtre, un autre mot ne l'est pas", () => {
    expect(estDomaineConnu("sante_travail")).toBe(true);
    expect(estDomaineConnu("electricite")).toBe(true);
    expect(estDomaineConnu("pas-un-domaine")).toBe(false);
    expect(estDomaineConnu(undefined)).toBe(false);
  });
});

describe("ce que la pastille d'année annonce", () => {
  it("ne dit pas « aucune échéance » quand des lignes attendent d'être planifiées", () => {
    // LE défaut, tel qu'il s'affichait sur un dossier neuf : « 2026 · AUCUNE
    // ÉCHÉANCE » au-dessus d'un chip « 2 à planifier » et d'une carte de mois
    // qui les listait.
    expect(libelleTotalAnnee(0, 2)).toBe("aucune datée · 2 sans date");
    expect(libelleTotalAnnee(0, 2)).not.toContain("aucune échéance");
  });

  it("ne masque pas les non datées derrière un total qui les ignore", () => {
    // La forme aggravée, constatée après l'ajout d'un titre daté : « 1
    // échéance » au-dessus de trois lignes.
    expect(libelleTotalAnnee(1, 2)).toBe("1 datée · 2 sans date");
  });

  it("reste sobre quand il n'y a rien à nuancer", () => {
    // Contre-épreuve : sans elle, une implémentation qui écrirait toujours
    // « · 0 à planifier » passerait les deux tests précédents.
    expect(libelleTotalAnnee(0, 0)).toBe("aucune échéance");
    expect(libelleTotalAnnee(3, 0)).toBe("3 échéances");
    expect(libelleTotalAnnee(1, 0)).toBe("1 échéance");
  });

  it("accorde le pluriel des deux côtés", () => {
    expect(libelleTotalAnnee(2, 1)).toBe("2 datées · 1 sans date");
  });
});

describe("l'accord des libellés où un nombre s'insère", () => {
  /**
   * Le défaut, et ce qu'il apprend sur les revues.
   *
   * « Voir les 1 mois précédents », affiché sur tous les dossiers le
   * 1er septembre 2026. **Aucun commit ne l'a introduit** : au 31 août, aucun
   * mois n'était passé dans l'année, la branche ne se rendait jamais et le
   * contrôle visuel de la veille ne pouvait pas la voir. Il est apparu par le
   * seul passage du temps.
   *
   * Une revue de diff est aveugle à cette famille — il n'y a pas de diff. Seul
   * un balayage de l'espace des entrées la couvre, et il suppose que la phrase
   * soit APPELABLE : c'est pourquoi elle a quitté le JSX pour `labels.ts`.
   */
  it("le mot suit le nombre, sur tout l'espace des entrées", () => {
    const fautes: string[] = [];
    for (let n = 1; n <= 24; n++) {
      const libelle = libelleMoisPrecedents(n);
      const pluriel = /\bmois précédents\b/.test(libelle);
      // « mois » est invariable ; c'est l'adjectif qui porte l'accord, et
      // l'article avec lui.
      if (n === 1 && (pluriel || libelle.includes("les "))) {
        fautes.push(`n=${n} → « ${libelle} »`);
      }
      if (n > 1 && !pluriel) fautes.push(`n=${n} → « ${libelle} »`);
    }
    expect(fautes, "Le libellé ne s'accorde pas avec le nombre.").toEqual([]);
  });

  it("les deux formes existent : la règle porte sur quelque chose", () => {
    // Contre-épreuve : un libellé qui cesserait d'interpoler rendrait le test
    // précédent vert et vide.
    expect(libelleMoisPrecedents(1)).not.toContain("1");
    expect(libelleMoisPrecedents(3)).toContain("3");
  });
});
