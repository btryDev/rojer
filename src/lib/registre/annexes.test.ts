import { describe, expect, it } from "vitest";
import {
  obligationParId,
} from "@/lib/referentiels/conformite";
import type { EtablissementMatching } from "@/lib/matching";
import {
  ANNEXES_DU_REGISTRE,
  annexeDeLaLigne,
  annexesDuRegistre,
  ID_FICHE_ANNEXES,
  piecesDesAnnexes,
} from "./annexes";
import { SECTIONS_REGISTRE } from "./sections";
import { alimentationDeLaPartie } from "./alimentation";

const magasinN4 = {
  estEtablissementTravail: true,
  estERP: true,
  estIGH: false,
  estHabitation: false,
  typeErp: "M",
  typesErpAutres: [],
  categorieErp: "N4",
  effectifSurSite: 8,
} as unknown as EtablissementMatching;

const bureauTravail = {
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  typesErpAutres: [],
  categorieErp: null,
  effectifSurSite: 8,
} as unknown as EtablissementMatching;

describe("la table des annexes du registre", () => {
  it("vise la fiche « Annexes » du catalogue, rangée en partie 5", () => {
    const fiche = SECTIONS_REGISTRE.find((s) => s.id === ID_FICHE_ANNEXES);
    expect(fiche?.partie).toBe("5");
    expect(alimentationDeLaPartie("5", "/etablissements/e")?.href).toBe(
      "/etablissements/e/etats-permanents",
    );
  });

  it("ne nomme que des états permanents du référentiel, dont le texte parle d'annexer au registre", () => {
    for (const a of ANNEXES_DU_REGISTRE) {
      const o = obligationParId(a.obligationId);
      expect(o, a.obligationId).toBeDefined();
      expect(o!.nature, a.obligationId).toBe("etat_permanent");
      expect(o!.pieceAttendue, a.obligationId).not.toBeNull();
      const texte = JSON.stringify([o!.description, o!.referencesLegales]);
      expect(texte, a.obligationId).toMatch(/annex/i);
      expect(texte, a.obligationId).toContain(a.article.split(" §")[0]);
    }
  });

  it("n'a pas de doublon", () => {
    const ids = ANNEXES_DU_REGISTRE.map((a) => a.obligationId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("annexesDuRegistre", () => {
  const declare = new Date("2026-10-12T10:00:00Z");

  it("liste l'écrit d'une ligne applicable, avec la déclaration et la note du dirigeant", () => {
    const contenu = annexesDuRegistre(
      "e1",
      [
        {
          obligationId: "incendie-erp-schema-organisation-securite",
          declareLe: declare,
          note: "  classeur sécurité, bureau du directeur ",
        },
      ],
      magasinN4,
    );
    expect(contenu.lignes).toHaveLength(1);
    const [ligne] = contenu.lignes;
    expect(ligne.titre).toBe("Schéma d'organisation globale de la sécurité");
    expect(ligne.meta).toMatch(
      /^M 31 · Déclaré en place le .+ · aucun fichier déposé · « classeur sécurité, bureau du directeur »$/,
    );
    expect(ligne.fichier).toBeUndefined();
    expect(ligne.href).toBe(
      "/etablissements/e1/etats-permanents#etat-incendie-erp-schema-organisation-securite",
    );
    expect(contenu.source.href).toBe("/etablissements/e1/etats-permanents");
  });

  it("dit d'un écrit non déclaré qu'il ne l'est pas, sans rien affirmer d'autre", () => {
    const contenu = annexesDuRegistre(
      "e1",
      [{ obligationId: "incendie-erp-eclairage-securite-notice-registre", declareLe: null, note: null }],
      magasinN4,
    );
    expect(contenu.lignes[0].meta).toBe("EC 13 · Pas encore déclaré en place · aucun fichier déposé");
    expect(contenu.lignes[0].meta).not.toMatch(/vérifi|conforme/i);
  });

  it("ne fait naître aucune annexe d'une ligne que le moteur ne rend pas", () => {
    const contenu = annexesDuRegistre(
      "e1",
      [{ obligationId: "incendie-registre-securite", declareLe: declare, note: null }],
      magasinN4,
    );
    expect(contenu.lignes).toEqual([]);
    expect(contenu.vide).not.toBe("");
  });

  it("n'annexe le carnet d'ascenseur qu'en ERP des catégories 1 à 4 (AS 11)", () => {
    const etats = [{ obligationId: "ascenseur-carnet-entretien", declareLe: null, note: null }];
    expect(annexesDuRegistre("e1", etats, magasinN4).lignes).toHaveLength(1);
    expect(annexesDuRegistre("e1", etats, bureauTravail).lignes).toEqual([]);
  });

  it("suit l'ordre de la table, pas celui des lignes reçues", () => {
    const contenu = annexesDuRegistre(
      "e1",
      [
        { obligationId: "incendie-erp-eclairage-securite-notice-registre", declareLe: null, note: null },
        { obligationId: "incendie-erp-schema-organisation-securite", declareLe: null, note: null },
      ],
      magasinN4,
    );
    expect(contenu.lignes.map((l) => l.id)).toEqual([
      "incendie-erp-schema-organisation-securite",
      "incendie-erp-eclairage-securite-notice-registre",
    ]);
  });
});

describe("le fichier déposé sur la ligne (ADR-056)", () => {
  it("la fiche le reprend : sa date dans la ligne, et un lien qui le sert", () => {
    const contenu = annexesDuRegistre(
      "e1",
      [
        {
          obligationId: "incendie-erp-schema-organisation-securite",
          declareLe: new Date("2026-11-05T10:00:00Z"),
          note: null,
          piece: {
            id: "p1",
            nom: "schema-2026.pdf",
            deposeLe: new Date("2026-11-05T10:00:00Z"),
            href: "/api/etablissements/e1/pieces/p1",
          },
        },
      ],
      magasinN4,
    );
    const [ligne] = contenu.lignes;
    expect(ligne.meta).toMatch(/fichier déposé le /);
    expect(ligne.fichier).toEqual({
      pieceId: "p1",
      href: "/api/etablissements/e1/pieces/p1",
      nom: "schema-2026.pdf",
    });
    expect(piecesDesAnnexes(contenu)).toEqual([
      { pieceId: "p1", titre: "Schéma d'organisation globale de la sécurité" },
    ]);
  });

  it("annexeDeLaLigne : la table, et la condition propre à l'annexion", () => {
    expect(annexeDeLaLigne("incendie-erp-schema-organisation-securite", magasinN4)?.article).toBe("M 31");
    expect(annexeDeLaLigne("information-etablissement-affichages-obligatoires", magasinN4)).toBeNull();
    expect(annexeDeLaLigne("ascenseur-carnet-entretien", bureauTravail)).toBeNull();
    expect(annexeDeLaLigne("ascenseur-carnet-entretien", magasinN4)?.article).toBe("AS 11");
  });

  it("piecesDesAnnexes ne rend rien sans contenu", () => {
    expect(piecesDesAnnexes(null)).toEqual([]);
  });
});
