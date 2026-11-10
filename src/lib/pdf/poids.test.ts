import { describe, expect, it } from "vitest";
import type { DemandePdf } from "./documents";
import { poidsDuDocument } from "./poids";

/** Une liste de `n` éléments quelconques. */
const n = (k: number) => Array.from({ length: k }, (_, i) => ({ id: String(i) }));
/** Une demande construite sur des données partielles : seules les listes comptent. */
const demande = (d: unknown) => d as DemandePdf;

describe("poidsDuDocument — registre", () => {
  const rapport = (annee: number, points = 0) => ({
    id: `${annee}-${Math.random()}`,
    dateRapport: new Date(Date.UTC(annee, 5, 1, 12)),
    points: n(points),
  });
  const registre = (data: Record<string, unknown>) =>
    demande({
      type: "registre",
      props: {
        data: {
          parties: [],
          rapports: [],
          verifsEnAttente: [],
          ...data,
        },
      },
    });

  it("compte les fiches, les rapports avec leurs points et les attentes", () => {
    const poids = poidsDuDocument(
      registre({
        parties: [
          { fiches: [{ champs: n(3) }, { lignes: n(5), tenues: n(2) }] },
          { fiches: [{}] },
        ],
        rapports: [rapport(2026, 2), rapport(2026), rapport(2025, 1)],
        verifsEnAttente: n(4),
      }),
    );
    // fiches 3 + 5 + 2 = 10 ; rapports 3 + 3 points = 6 ; attente 4.
    expect(poids).toEqual({ total: 20, plusGrosBloc: 10 });
  });

  it("le corps des fiches est un seul bloc ; les rapports comptent par paquet", () => {
    const rapports = Array.from({ length: 250 }, () => rapport(2026));
    const poids = poidsDuDocument(
      registre({ parties: [{ fiches: [{ lignes: n(30) }] }], rapports }),
    );
    // 250 rapports en paquets de 100 : le plus gros paquet pèse 100.
    expect(poids).toEqual({ total: 280, plusGrosBloc: 100 });
  });

  it("un journal de fiche plus long qu'un paquet devient le plus gros bloc", () => {
    const poids = poidsDuDocument(registre({ parties: [{ fiches: [{ lignes: n(600) }] }] }));
    expect(poids.plusGrosBloc).toBe(600);
  });
});

describe("poidsDuDocument — autres documents", () => {
  it("dossier de conformité : un bloc par page à tableau", () => {
    const poids = poidsDuDocument(
      demande({
        type: "dossier-conformite",
        props: {
          data: {
            etatsPermanents: { etats: n(3), faits: n(2) },
            verifsEnRetard: n(40),
            verifsAConfirmer: n(5),
            verifsPourInformation: n(1),
            actionsEnCours: n(10),
            pointsEnCours: n(7),
            rapportsRecents: n(10),
          },
        },
      }),
    );
    expect(poids).toEqual({ total: 78, plusGrosBloc: 46 });
  });

  it("plan d'actions, points à corriger", () => {
    expect(
      poidsDuDocument(demande({ type: "plan-actions", props: { data: { actions: n(12) } } })),
    ).toEqual({ total: 12, plusGrosBloc: 12 });
    expect(
      poidsDuDocument(
        demande({ type: "points-a-corriger", props: { data: { ouverts: n(2), corriges: n(3) } } }),
      ),
    ).toEqual({ total: 5, plusGrosBloc: 5 });
  });

  it("DUERP : risques et mesures de toutes les unités, un seul bloc", () => {
    const poids = poidsDuDocument(
      demande({
        type: "duerp",
        props: {
          snapshot: {
            unites: [
              { risques: [{ mesures: n(2) }, { mesures: n(0) }] },
              { risques: [{ mesures: n(3) }] },
            ],
          },
          historique: [],
        },
      }),
    );
    // 3 risques + 5 mesures.
    expect(poids).toEqual({ total: 8, plusGrosBloc: 8 });
  });
});
