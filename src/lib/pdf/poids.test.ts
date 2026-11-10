import { describe, expect, it } from "vitest";
import type { DemandePdf } from "./documents";
import { poidsDuDocument } from "./poids";
import { SEUILS_PDF } from "./rendre";

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
        rapports: [rapport(2026, 2), rapport(2026), { ...rapport(2025, 1), domaine: "electricite" }],
        verifsEnAttente: n(4),
      }),
    );
    // fiches 3 + 5 + 2 = 10 ; rapports 3 + 3 points + 1 mention R. 4226-19
    // (le rapport d'électricité à points) = 7 ; attente 4.
    expect(poids).toEqual({ total: 21, plusGrosBloc: 10 });
  });

  it("le corps des fiches est un seul bloc ; les rapports comptent par paquet", () => {
    const rapports = Array.from({ length: 250 }, () => rapport(2026));
    const poids = poidsDuDocument(
      registre({ parties: [{ fiches: [{ lignes: n(30) }] }], rapports }),
    );
    // 250 rapports en paquets de 100 : le plus gros paquet pèse 100.
    expect(poids).toEqual({ total: 280, plusGrosBloc: 100 });
  });

  it("une année riche en points ne fait plus dépasser le bloc (sondes de la revue finale)", () => {
    // 100 rapports d'une même année à 4 points : avant, une seule <Page> de
    // 500 lignes, et le registre entier refusé.
    const quatre = poidsDuDocument(registre({ rapports: Array.from({ length: 100 }, () => rapport(2026, 4)) }));
    expect(quatre).toEqual({ total: 500, plusGrosBloc: 100 });
    // 60 rapports d'électricité à 6 points : 8 lignes chacun, 12 par <Page>.
    const elec = poidsDuDocument(
      registre({
        rapports: Array.from({ length: 60 }, () => ({ ...rapport(2026, 6), domaine: "electricite" })),
      }),
    );
    expect(elec).toEqual({ total: 480, plusGrosBloc: 96 });
    expect(Math.max(quatre.plusGrosBloc, elec.plusGrosBloc)).toBeLessThanOrEqual(SEUILS_PDF.registre.bloc);
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

  it("DUERP : unités, inventaire, plan de prévention, annexe, historique", () => {
    const mesure = (statut: string) => ({ statut });
    const duerp = (historique: number) =>
      demande({
        type: "duerp",
        props: {
          snapshot: {
            unites: [
              {
                risques: [
                  { mesures: [mesure("prevue"), mesure("existante")], exposeCMR: true },
                  { mesures: [] },
                ],
              },
              { risques: [{ mesures: [mesure("prevue"), mesure("prevue"), mesure("existante")] }] },
            ],
          },
          historique: n(historique),
        },
      });
    // Unités 2 × 2 = 4 ; inventaire 3 risques + 5 mesures + 1 CMR = 9 ;
    // plan 3 + 3 prévues = 6 ; annexe 3 ; historique.
    expect(poidsDuDocument(duerp(2))).toEqual({ total: 24, plusGrosBloc: 9 });
    // L'historique grossit d'une version par mise à jour : il finit par peser
    // plus que tout le reste.
    expect(poidsDuDocument(duerp(40))).toEqual({ total: 62, plusGrosBloc: 40 });
  });
});
