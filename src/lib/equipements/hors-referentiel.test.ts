import { describe, expect, it } from "vitest";
import { reperterSansEcheance } from "./hors-referentiel";
import type { ObligationPorteeParEquipement } from "@/lib/referentiels/conformite/types";
import type {
  EquipementMatching,
  EtablissementMatching,
} from "@/lib/matching";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

const etablissement = (
  o: Partial<EtablissementMatching> = {},
): EtablissementMatching => ({
  id: "etab",
  effectifSurSite: 10,
  effectifEntreprise: 10,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic: null,
  ...o,
});

const equipement = (
  id: string,
  categorie: CategorieEquipement,
  caracteristiques: Record<string, unknown> | null = null,
): EquipementMatching => ({
  id,
  libelle: `Appareil ${id}`,
  categorie,
  caracteristiques,
});

const obligation = (
  o: Partial<ObligationPorteeParEquipement> = {},
): ObligationPorteeParEquipement => ({
  id: "test-1",
  domaine: "electricite",
  libelle: "Vérification de test",
  referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 4226-16" }],
  periodicite: "annuelle",
  nature: "echeance_recurrente",
  pieceAttendue: null,
  realisateurs: ["organisme_agree"],
  criticite: 3,
  transmet: [],
  typologies: { travail: true },
  categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
  ...o,
});

describe("reperterSansEcheance — le référentiel réel", () => {
  it("signale un équipement rangé en « Autre » : aucune obligation ne cite cette catégorie", () => {
    const m = reperterSansEcheance(etablissement({ estERP: true }), [
      equipement("eq1", "AUTRE"),
    ]);

    expect(m.get("eq1")).toBe("categorie_hors_referentiel");
  });

  it("ne signale pas un équipement d'une catégorie couverte qui déclenche des obligations", () => {
    const m = reperterSansEcheance(etablissement(), [
      equipement("eq1", "INSTALLATION_ELECTRIQUE"),
    ]);

    expect(m.has("eq1")).toBe(false);
  });

  it("signale un extincteur en lieu de travail non-ERP, faute d'échéance légale", () => {
    // CHANGEMENT DE COMPORTEMENT, 2026-08-27. L'extincteur figurait ici comme
    // exemple d'équipement produisant une échéance. Il n'en produit plus chez
    // un employeur non-ERP : la section R. 4227-28 à R. 4227-41 du code du
    // travail, relue à la source, ne fixe AUCUNE périodicité annuelle. La
    // vérification annuelle des extincteurs vient de la norme NF S 61-919 et
    // des contrats de maintenance, pas du droit opposable.
    //
    // Les ERP ne sont pas concernés : `incendie-erp-extincteurs-annuelle`
    // porte l'annuelle pour eux, fondée sur MS 73.
    //
    // Le motif rendu est `aucune_echeance_datable`, et non
    // `aucune_obligation_applicable` : le modèle distingue bien « rien ne
    // s'applique » de « quelque chose s'applique, sans date ». C'est le bon
    // motif ici — des obligations pèsent sur cet extincteur (en être doté, le
    // maintenir en état, le rendre accessible), elles n'ont simplement pas
    // d'échéance légale.
    const m = reperterSansEcheance(etablissement({ estERP: false }), [
      equipement("eq1", "EXTINCTEUR"),
    ]);

    expect(m.get("eq1")).toBe("aucune_echeance_datable");
  });

  it("distingue « l'outil ne connaît pas cet appareil » de « il le connaît, mais pas chez vous »", () => {
    // Le désenfumage n'est porté que par des obligations ERP : chez un
    // employeur non-ERP, la catégorie est couverte mais rien ne s'applique.
    const m = reperterSansEcheance(etablissement({ estERP: false }), [
      equipement("eq1", "DESENFUMAGE"),
      equipement("eq2", "AUTRE"),
    ]);

    expect(m.get("eq1")).toBe("aucune_obligation_applicable");
    expect(m.get("eq2")).toBe("categorie_hors_referentiel");
  });

  it("ne signale plus le même désenfumage dès que l'établissement est un ERP", () => {
    const m = reperterSansEcheance(
      etablissement({ estERP: true, categorieErp: "N3" }),
      [equipement("eq1", "DESENFUMAGE")],
    );

    expect(m.has("eq1")).toBe(false);
  });
});

describe("reperterSansEcheance — référentiel injecté", () => {
  it("signale un équipement dont les conditions ne sont pas remplies", () => {
    // Condition « opt-in » numérique : propriété absente ⇒ non satisfaite,
    // donc l'appareil ne déclenche rien alors que sa catégorie est citée.
    const obligations = [
      obligation({
        categoriesEquipement: ["STOCKAGE_MATIERE_DANGEREUSE"],
        conditions: [
          {
            type: "equipement_propriete_numerique",
            categorie: "STOCKAGE_MATIERE_DANGEREUSE",
            propriete: "volumeLitres",
            operateur: ">",
            valeur: 100,
          },
        ],
      }),
    ];

    const m = reperterSansEcheance(
      etablissement(),
      [
        equipement("petit", "STOCKAGE_MATIERE_DANGEREUSE"),
        equipement("gros", "STOCKAGE_MATIERE_DANGEREUSE", {
          volumeLitres: 500,
        }),
      ],
      obligations,
    );

    expect(m.get("petit")).toBe("aucune_obligation_applicable");
    expect(m.has("gros")).toBe(false);
  });

  it("distingue une obligation permanente d'une absence d'obligation", () => {
    // Périodicité `autre` : le générateur n'ouvre aucune occurrence pour
    // ces règles. Dire « hors référentiel » serait faux — une obligation
    // s'applique bel et bien, elle n'a simplement pas de date.
    const obligations = [
      obligation({ periodicite: "autre" }),
      obligation({ id: "test-2", categoriesEquipement: ["EXTINCTEUR"] }),
    ];

    const m = reperterSansEcheance(
      etablissement(),
      [
        equipement("elec", "INSTALLATION_ELECTRIQUE"),
        equipement("ext", "EXTINCTEUR"),
      ],
      obligations,
    );

    expect(m.get("elec")).toBe("aucune_echeance_datable");
    expect(m.has("ext")).toBe(false);
  });

  it("ne rend une entrée que pour les équipements muets", () => {
    const m = reperterSansEcheance(
      etablissement(),
      [
        equipement("elec", "INSTALLATION_ELECTRIQUE"),
        equipement("autre", "AUTRE"),
      ],
      [obligation()],
    );

    expect([...m.keys()]).toEqual(["autre"]);
  });
});
