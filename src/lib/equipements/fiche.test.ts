import { describe, expect, it } from "vitest";
import {
  lignesAFaire,
  lignesHistoire,
  obligationsDeclencheesParUnFait,
  obligationsDeLEquipement,
  type FicheEquipement,
} from "./fiche";

/** Dates civiles à minuit UTC, horloge à un instant réel (ADR-011). */
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
/** 20 août 2026, 9 h à Paris. */
const AUJOURDHUI = new Date("2026-08-20T07:00:00Z");

/**
 * Une fiche réduite à ce que `lignesAFaire` regarde. Le type complet vient
 * de Prisma et porte trente colonnes dont aucune ne compte ici.
 */
function fiche(
  verifs: Array<{
    id: string;
    datePrevue: string;
    dateRealisee?: string;
    statut?: string;
    periodicite?: string;
  }>,
): FicheEquipement {
  return {
    verifications: verifs.map((v) => ({
      id: v.id,
      libelleObligation: "Vérification annuelle des extincteurs",
      statut: v.statut ?? "planifiee",
      datePrevue: jour(v.datePrevue),
      dateRealisee: v.dateRealisee ? jour(v.dateRealisee) : null,
      // `null` = ligne ouverte (ADR-034), et l'omettre ne se voit PAS : la
      // fiche est fabriquée par un `as unknown as`, qui rend le champ
      // manquant invisible au compilateur. À l'exécution, `archiveLe` vaut
      // alors `undefined`, les prédicats testent `!== null` — et toute ligne
      // de ce fichier se lisait archivée, donc `lecturesCalendrier` ne rendait
      // plus rien et la fiche affichait un appareil sans aucune échéance.
      archiveLe: null,
      periodicite: v.periodicite ?? "annuelle",
      rapports: [],
      actions: [],
    })),
  } as unknown as FicheEquipement;
}

describe("lignesAFaire", () => {
  it("garde l'échéance ouverte d'une ligne déjà contrôlée", () => {
    // Le cœur du bug, et ce qu'il devient au N4. En écartant les lignes
    // « faites », la fiche d'un appareil parfaitement suivi affichait « aucune
    // échéance ouverte » pendant que le calendrier montrait le rendez-vous de
    // l'an prochain. La rangée qui portait les deux vies n'existe plus
    // (ADR-034) : le dépôt la fait rouler et elle repart « planifiée ». Mais
    // elle traîne encore la COLONNE GELÉE `dateRealisee`, tant que le N5 ne
    // l'a pas retirée — et cette colonne ne classe plus rien : l'échéance
    // ouverte reste à faire, quoi qu'elle porte.
    const lignes = lignesAFaire(
      fiche([
        {
          id: "v1",
          datePrevue: "2027-01-22",
          dateRealisee: "2026-01-22",
        },
      ]),
      "/etablissements/e1",
      AUJOURDHUI,
    );

    expect(lignes).toHaveLength(1);
    expect(lignes[0].date).toEqual(jour("2027-01-22"));
    expect(lignes[0].etat).toBe("lointain");
    expect(lignes[0].href).toBe("/etablissements/e1/verifications/v1");
  });

  it("ne fabrique pas de rendez-vous là où le cycle n'en a pas", () => {
    // Sans périodicité, `datePrevue` est l'ancienne échéance, pas un
    // engagement : rien ne reste à faire.
    const lignes = lignesAFaire(
      fiche([
        {
          id: "v1",
          datePrevue: "2026-01-22",
          dateRealisee: "2026-01-22",
          statut: "realisee_conforme",
          periodicite: "mise_en_service_uniquement",
        },
      ]),
      "/etablissements/e1",
      AUJOURDHUI,
    );

    expect(lignes).toEqual([]);
  });

  it("range les datées avant les sans-date, et le retard en tête", () => {
    const lignes = lignesAFaire(
      fiche([
        { id: "v1", datePrevue: "2027-03-01" },
        { id: "v2", datePrevue: "2026-06-01" },
        { id: "v3", datePrevue: "2028-01-01", statut: "a_planifier" },
      ]),
      "/etablissements/e1",
      AUJOURDHUI,
    );

    expect(lignes.map((l) => l.etat)).toEqual([
      "enRetard",
      "lointain",
      "aPlanifier",
    ]);
    // Une occurrence à planifier ne porte pas de date : la sienne est une
    // date de génération, pas un rendez-vous.
    expect(lignes[2].date).toBeNull();
  });
});


/**
 * Une fiche plus complète : rapports, actions et mise en service. Les deux
 * fonctions ci-dessous n'avaient aucune couverture — c'est pourtant là que
 * se décide ce que la fiche affirme d'un appareil.
 */
function ficheRiche(o: {
  dateMiseEnService?: string;
  verifs: Array<{
    id: string;
    obligationId?: string;
    datePrevue: string;
    dateRealisee?: string;
    statut?: string;
    rapports?: Array<{ id: string; date: string; resultat?: string; organisme?: string }>;
    actions?: number;
  }>;
}): FicheEquipement {
  return {
    dateMiseEnService: o.dateMiseEnService ? jour(o.dateMiseEnService) : null,
    verifications: o.verifs.map((v) => ({
      id: v.id,
      obligationId: v.obligationId ?? "incendie-travail-moyens-lutte",
      libelleObligation: "Vérification annuelle des extincteurs",
      statut: v.statut ?? "planifiee",
      datePrevue: jour(v.datePrevue),
      dateRealisee: v.dateRealisee ? jour(v.dateRealisee) : null,
      // Cf. `fiche()` ci-dessus : le cast masque l'omission au compilateur.
      archiveLe: null,
      periodicite: "annuelle",
      rapports: (v.rapports ?? []).map((r) => ({
        id: r.id,
        dateRapport: jour(r.date),
        resultat: r.resultat ?? "conforme",
        organismeVerif: r.organisme ?? "APAVE",
      })),
      actions: Array.from({ length: v.actions ?? 0 }, (_, i) => ({
        id: `${v.id}-a${i}`,
        libelle: "Remplacer la goupille",
        statut: "ouverte",
        echeance: null,
        responsable: null,
      })),
    })),
  } as unknown as FicheEquipement;
}

describe("lignesHistoire", () => {
  it("range du plus récent au plus ancien, mise en service comprise", () => {
    const h = lignesHistoire(
      ficheRiche({
        dateMiseEnService: "2019-04-01",
        verifs: [
          {
            id: "v1",
            datePrevue: "2026-03-01",
            rapports: [{ id: "r1", date: "2025-03-02" }],
          },
          {
            id: "v2",
            datePrevue: "2027-01-01",
            rapports: [{ id: "r2", date: "2026-01-05" }],
          },
        ],
      }),
      "/base",
    );
    expect(h.map((l) => l.cle)).toEqual(["r-r2", "r-r1", "mise-en-service"]);
  });

  it("le rapport fait foi : une ligne marquée réalisée ne s'ajoute pas en double", () => {
    const h = lignesHistoire(
      ficheRiche({
        verifs: [
          {
            id: "v1",
            datePrevue: "2027-03-01",
            dateRealisee: "2026-03-01",
            statut: "realisee_conforme",
            rapports: [{ id: "r1", date: "2026-03-02" }],
          },
        ],
      }),
      "/base",
    );
    expect(h.map((l) => l.cle)).toEqual(["r-r1"]);
    // C'est la date du rapport qui date la ligne, pas la date de réalisation.
    expect(h[0].date).toEqual(jour("2026-03-02"));
  });

  it("annonce une vérification réalisée sans rapport, et le dit", () => {
    const h = lignesHistoire(
      ficheRiche({
        verifs: [
          {
            id: "v1",
            datePrevue: "2027-03-01",
            dateRealisee: "2026-03-01",
            statut: "realisee_conforme",
          },
        ],
      }),
      "/base",
    );
    expect(h.map((l) => l.cle)).toEqual(["v-v1"]);
    expect(h[0].detail).toContain("aucun rapport");
  });

  it("rattache les actions au seul rapport le plus récent", () => {
    // Les actions sont portées par la ligne de suivi, pas par un dépôt : les
    // répéter sur chaque rapport ferait lire plusieurs fois les mêmes écarts.
    const h = lignesHistoire(
      ficheRiche({
        verifs: [
          {
            id: "v1",
            datePrevue: "2027-03-01",
            actions: 2,
            rapports: [
              { id: "recent", date: "2026-03-02" },
              { id: "ancien", date: "2025-03-02" },
            ],
          },
        ],
      }),
      "/base",
    );
    expect(h.find((l) => l.cle === "r-recent")?.detail).toContain(
      "2 actions correctives",
    );
    expect(h.find((l) => l.cle === "r-ancien")?.detail).not.toContain("action");
  });

  it("reporte le résultat consigné, qui décide de la couleur du jalon", () => {
    const h = lignesHistoire(
      ficheRiche({
        verifs: [
          {
            id: "v1",
            datePrevue: "2027-03-01",
            rapports: [{ id: "r1", date: "2026-03-02", resultat: "ecart_majeur" }],
          },
        ],
      }),
      "/base",
    );
    expect(h[0].resultat).toBe("ecart_majeur");
  });
});

describe("obligationsDeLEquipement", () => {
  it("dédoublonne les obligations portées par plusieurs lignes", () => {
    const obligations = obligationsDeLEquipement(
      ficheRiche({
        verifs: [
          { id: "v1", obligationId: "incendie-travail-moyens-lutte", datePrevue: "2026-09-01" },
          { id: "v2", obligationId: "incendie-travail-moyens-lutte", datePrevue: "2027-09-01" },
        ],
      }),
    );
    expect(obligations).toHaveLength(1);
  });

  it("écarte une obligation que le référentiel ne connaît plus", () => {
    // Une référence réglementaire ne s'invente pas : sans fiche au
    // référentiel, on n'affiche rien plutôt qu'un libellé orphelin.
    const obligations = obligationsDeLEquipement(
      ficheRiche({
        verifs: [
          { id: "v1", obligationId: "obligation-retiree-du-referentiel", datePrevue: "2026-09-01" },
        ],
      }),
    );
    expect(obligations).toEqual([]);
  });
});

/**
 * Un appareil tel que le moteur le lit : sa catégorie, ses caractéristiques,
 * et la typologie de l'établissement qui le porte. **Aucune `Verification`** —
 * c'est tout le point : ces obligations-là n'en ont jamais.
 */
function ficheAuMoteur(opts: {
  categorie: string;
  caracteristiques?: Record<string, unknown> | null;
}): FicheEquipement {
  return {
    id: "eq-1",
    libelle: "Chambre froide positive",
    categorie: opts.categorie,
    caracteristiques: opts.caracteristiques ?? null,
    verifications: [],
    etablissement: {
      id: "etab-1",
      effectifSurSite: 6,
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
    },
  } as unknown as FicheEquipement;
}

describe("obligationsDeclencheesParUnFait", () => {
  it("voit ce qu'aucune ligne de suivi ne porte", () => {
    // LE DÉFAUT QUE CE LOT CORRIGE. Le générateur saute la périodicité
    // `autre`, donc le contrôle d'étanchéité après modification du circuit n'a
    // jamais de `Verification` — et la fiche, qui ne lisait que celles-là, ne
    // pouvait pas en dire un mot. La fiche passée ici n'en a AUCUNE, et la
    // ligne sort quand même.
    const eq = ficheAuMoteur({ categorie: "INSTALLATION_FRIGORIFIQUE" });
    expect(obligationsDeLEquipement(eq)).toEqual([]);

    const declenchees = obligationsDeclencheesParUnFait(eq);
    expect(declenchees.length).toBeGreaterThan(0);
    for (const { obligation } of declenchees) {
      expect(obligation.nature, obligation.id).toBe("evenementielle");
      expect(obligation.periodicite, obligation.id).toBe("autre");
    }
  });

  it("rend le mode explain, pour que l'écran n'ait pas à réécrire la raison", () => {
    const declenchees = obligationsDeclencheesParUnFait(
      ficheAuMoteur({ categorie: "INSTALLATION_FRIGORIFIQUE" }),
    );
    for (const d of declenchees) {
      expect(d.raisons.length, d.obligation.id).toBeGreaterThan(0);
    }
    // Et l'appareil est nommé dans l'explication : c'est ce qui distingue
    // « cet appareil-ci » de « cette catégorie d'appareils ».
    expect(declenchees.some((d) => d.raisons.join(" ").includes("Chambre froide"))).toBe(
      true,
    );
  });

  it("se tait sur un appareil qu'aucune règle événementielle ne vise", () => {
    // La borne haute. Un extincteur porte des obligations, toutes datées : la
    // carte ne doit pas se poser sur sa fiche.
    expect(
      obligationsDeclencheesParUnFait(ficheAuMoteur({ categorie: "EXTINCTEUR" })),
    ).toEqual([]);
  });

  it("respecte les conditions déclarées sur l'appareil", () => {
    // La preuve que la lecture passe bien par le MOTEUR et non par un filtre
    // de catégorie : `froid-controle-etancheite-apres-modification` porte la
    // condition « hors dispense », et un équipement hermétiquement scellé sous
    // le seuil sort du champ des deux textes. La ligne doit disparaître, sans
    // quoi la fiche annoncerait une obligation que l'appareil ne doit pas.
    const scelle = ficheAuMoteur({
      categorie: "INSTALLATION_FRIGORIFIQUE",
      caracteristiques: { estHermetiquementScelleSousSeuil: true },
    });
    expect(
      obligationsDeclencheesParUnFait(scelle).map((d) => d.obligation.id),
    ).not.toContain("froid-controle-etancheite-apres-modification");
  });
});
