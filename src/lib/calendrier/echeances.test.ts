import { describe, expect, it } from "vitest";
import { cleJourCivil } from "@/lib/dates";
import type { FamilleEcheance } from "./echeances";
import {
  MOIS_ANALYSE_LEGIONELLES,
  MOIS_MAJ_DUERP,
  echeanceDuerp,
  filtrerParBatiment,
  echeanceLegionelles,
  echeancePermisFeu,
  echeancePlanPrevention,
  echeancesPrestataire,
  FAMILLE_DE_TYPE,
  FAMILLES_FILTRABLES,
  famillesAvecEcheances,
  origineAction,
  typeDeVerification,
  tonPourDate,
} from "./echeances";

/**
 * Toutes les dates sont écrites comme Prisma les rend : **minuit UTC**
 * pour une date civile saisie en « AAAA-MM-JJ » (ADR-011). Les horloges,
 * elles, sont des instants réels — heure ouvrée ou fin de soirée à Paris.
 * Écrire `new Date(2026, 7, 10)` ferait dépendre le résultat du fuseau du
 * processus, et masquerait précisément les décalages qu'on teste ici.
 */
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** 10 août 2026, 9 h à Paris. */
const AUJOURDHUI = new Date("2026-08-10T07:00:00Z");
/** Même jour civil, 23 h 30 à Paris. */
const CE_SOIR = new Date("2026-08-10T21:30:00Z");

describe("tonPourDate", () => {
  it("classe en alerte une date passée", () => {
    expect(tonPourDate(jour("2026-08-09"), AUJOURDHUI)).toBe("alerte");
  });

  it("classe en ok le jour même et le futur", () => {
    expect(tonPourDate(jour("2026-08-10"), AUJOURDHUI)).toBe("ok");
    expect(tonPourDate(jour("2026-12-01"), AUJOURDHUI)).toBe("ok");
  });

  it("laisse toute sa journée à une échéance du jour, du matin au soir", () => {
    // La date est stockée à 00:00 UTC, soit 02:00 à Paris en été : une
    // comparaison à l'horodatage brut l'aurait déclarée dépassée dès 2 h
    // du matin.
    expect(tonPourDate(jour("2026-08-10"), AUJOURDHUI)).toBe("ok");
    expect(tonPourDate(jour("2026-08-10"), CE_SOIR)).toBe("ok");
    expect(tonPourDate(jour("2026-08-09"), CE_SOIR)).toBe("alerte");
  });
});

describe("origineAction", () => {
  it("type l'action par la vérification dont l'écart provient", () => {
    expect(
      origineAction({
        verificationLibelle: "Vérification annuelle des extincteurs",
      }),
    ).toEqual({
      type: "action-verification",
      // Le complément ne répète pas le mot porté par le type, et n'emploie
      // pas « contrôle », réservé à la visite d'un tiers (ADR-015).
      origine: "suite à « Vérification annuelle des extincteurs »",
    });
  });

  // Le XOR de l'ADR-002 ne laisse que deux cas : `libelleObligation` étant
  // non nul en base, son absence dit « pas de vérification », donc
  // « rattachée à un risque ». Il n'y a pas de troisième branche à couvrir —
  // une action sans origine ne peut pas être écrite (cf. `origine.test.ts`).
  it("type l'action par le DUERP en l'absence de vérification", () => {
    expect(origineAction({ verificationLibelle: null })).toEqual({
      type: "action-duerp",
      origine: "prévue au DUERP",
    });
  });
});

describe("FAMILLE_DE_TYPE", () => {
  it("rattache chaque type à une famille, sans exception", () => {
    // Le Record est exhaustif par le type ; ce test garde le contenu :
    // un type ajouté sans famille ne compile pas, mais un type rattaché à
    // la mauvaise famille compilerait très bien.
    expect(FAMILLE_DE_TYPE.verification).toBe("controle");
    expect(FAMILLE_DE_TYPE.legionelles).toBe("controle");
    expect(FAMILLE_DE_TYPE["action-duerp"]).toBe("travaux");
    expect(FAMILLE_DE_TYPE["action-verification"]).toBe("travaux");
    // ADR-017 : ni l'un ni l'autre n'est une correction — ils encadrent
    // une opération datée, ils ne reprennent aucun écart.
    expect(FAMILLE_DE_TYPE["permis-feu"]).toBe("operations");
    expect(FAMILLE_DE_TYPE["plan-prevention"]).toBe("operations");
    expect(FAMILLE_DE_TYPE["duerp-maj"]).toBe("papiers");
    expect(FAMILLE_DE_TYPE.attestation).toBe("papiers");
    // ADR-023 § 7 : une attestation médicale n'est pas un contrôle
    // d'appareil, et c'est pourtant sous ce badge qu'elle s'affichait.
    expect(FAMILLE_DE_TYPE["titre-salarie"]).toBe("personnel");
  });

  it("déduit la nature d'une ligne de vérification de son porteur", () => {
    expect(typeDeVerification({ salarieId: null })).toBe("verification");
    expect(typeDeVerification({ salarieId: "sal-1" })).toBe("titre-salarie");
  });

  it("ne prend pas un porteur absent pour un porteur salarié", () => {
    // Le cast est délibéré : il rejoue une lecture dont le `select` a oublié
    // `salarieId`. Le test écrit d'abord en négation (`=== null`) faisait
    // basculer TOUTES ces lignes en « Personnel » — l'erreur inverse, muette,
    // et rencontrée pour de vrai sur un objet de test.
    const sansPorteur = {} as { salarieId: string | null };
    expect(typeDeVerification(sansPorteur)).toBe("verification");
  });

  it("ne produit aucune famille que le calendrier ne sait pas filtrer", () => {
    // La garantie qui manquait. Une famille rattachée à un type mais absente
    // de la rangée de pilules donne des lignes visibles sous « Tout » et
    // introuvables sous toute pilule — la régression que ce lot évite.
    const produites = new Set(Object.values(FAMILLE_DE_TYPE));
    expect([...produites].filter((f) => !FAMILLES_FILTRABLES.includes(f))).toEqual(
      [],
    );
  });

  it("déduit la bonne famille pour les échéances qu'il produit", () => {
    const e = echeanceDuerp({
      etablissementId: "etab1",
      dateDerniereVersion: jour("2026-02-10"),
      aujourdhui: AUJOURDHUI,
    });
    expect(e?.type).toBe("duerp-maj");
    expect(e?.famille).toBe(FAMILLE_DE_TYPE["duerp-maj"]);
  });
});

describe("famillesAvecEcheances", () => {
  const aucune = { verification: 0, "titre-salarie": 0 } as const;
  const fam = (famille: FamilleEcheance) => ({ famille });

  it("ne propose que les familles qui portent quelque chose", () => {
    expect(
      famillesAvecEcheances({ verification: 4, "titre-salarie": 0 }, [
        fam("papiers"),
      ]),
    ).toEqual(["controle", "papiers"]);
  });

  it("propose « Personnel » dès qu'un titre existe", () => {
    expect(
      famillesAvecEcheances({ verification: 0, "titre-salarie": 2 }, []),
    ).toEqual(["personnel"]);
  });

  it("ne propose plus « Vérifications » quand il n'y a aucun contrôle", () => {
    // Le cas du cul-de-sac : un établissement sans équipement, non-ERP, avec
    // un titre déclaré. La clause `f === "controle"` en tête proposait la
    // pilule, qui menait à « Rien ne correspond à ces filtres ».
    const out = famillesAvecEcheances(
      { verification: 0, "titre-salarie": 1 },
      [],
    );
    expect(out).not.toContain("controle");
  });

  it("garde « Vérifications » pour une analyse légionelles seule", () => {
    // Elle vient du registre, pas du flux des vérifications : sans cette
    // seconde source, retirer la clause aurait fait disparaître la pilule
    // d'un établissement qui n'a qu'un carnet sanitaire.
    expect(famillesAvecEcheances(aucune, [fam("controle")])).toEqual([
      "controle",
    ]);
  });

  it("rend les familles dans l'ordre du filtre, jamais celui des données", () => {
    expect(
      famillesAvecEcheances({ verification: 1, "titre-salarie": 1 }, [
        fam("papiers"),
        fam("travaux"),
      ]),
    ).toEqual(["controle", "travaux", "papiers", "personnel"]);
  });

  it("ne propose rien sur un dossier vide", () => {
    expect(famillesAvecEcheances(aucune, [])).toEqual([]);
  });
});

describe("echeanceDuerp", () => {
  it("pose l'échéance un an après la dernière version, au même jour civil", () => {
    const e = echeanceDuerp({
      etablissementId: "etab1",
      dateDerniereVersion: jour("2026-02-10"),
      aujourdhui: AUJOURDHUI,
    });
    expect(e).not.toBeNull();
    // Arithmétique calendaire : le 10 février reste le 10 février. Le
    // `+ 365 × 86 400 000` d'avant tombait au 9 dès qu'une bissextile ou
    // un changement d'heure s'intercalait.
    expect(cleJourCivil(e!.date)).toBe("2027-02-10");
    expect(e!.tone).toBe("ok");
    expect(e!.famille).toBe("papiers");
    expect(e!.href).toBe("/etablissements/etab1/duerp");
  });

  it("ne dérive pas d'un jour sur une année bissextile", () => {
    const e = echeanceDuerp({
      etablissementId: "etab1",
      dateDerniereVersion: jour("2027-03-01"),
      aujourdhui: AUJOURDHUI,
    });
    // 2028 est bissextile : + 365 jours aurait donné le 29 février.
    expect(cleJourCivil(e!.date)).toBe("2028-03-01");
  });

  it("écrête le 29 février sur une année commune", () => {
    const e = echeanceDuerp({
      etablissementId: "etab1",
      dateDerniereVersion: jour("2028-02-29"),
      aujourdhui: AUJOURDHUI,
    });
    expect(cleJourCivil(e!.date)).toBe("2029-02-28");
  });

  it("passe en alerte quand la version a plus d'un an", () => {
    const e = echeanceDuerp({
      etablissementId: "etab1",
      dateDerniereVersion: jour("2025-04-01"),
      aujourdhui: AUJOURDHUI,
    });
    expect(e!.tone).toBe("alerte");
  });

  it("n'est pas encore en alerte le jour anniversaire", () => {
    const e = echeanceDuerp({
      etablissementId: "etab1",
      dateDerniereVersion: jour("2025-08-10"),
      aujourdhui: AUJOURDHUI,
    });
    expect(cleJourCivil(e!.date)).toBe("2026-08-10");
    expect(e!.tone).toBe("ok");
  });

  it("ne produit rien sans version validée", () => {
    expect(
      echeanceDuerp({
        etablissementId: "etab1",
        dateDerniereVersion: null,
        aujourdhui: AUJOURDHUI,
      }),
    ).toBeNull();
  });

  it("exprime la périodicité en mois calendaires", () => {
    expect(MOIS_MAJ_DUERP).toBe(12);
    expect(MOIS_ANALYSE_LEGIONELLES).toBe(12);
  });
});

describe("echeancesPrestataire", () => {
  const base = {
    id: "p1",
    raisonSociale: "Vérif Élec SARL",
  };

  it("produit une échéance par pièce datée, avec le bon ton", () => {
    const out = echeancesPrestataire(
      {
        ...base,
        attestationUrssafValableJusquA: jour("2026-07-01"), // passée
        assuranceRcProValableJusquA: jour("2026-12-31"), // à venir
      },
      AUJOURDHUI,
      "etab1",
    );
    expect(out).toHaveLength(2);
    const urssaf = out.find((e) => e.id.endsWith("urssaf"))!;
    const rcpro = out.find((e) => e.id.endsWith("rcpro"))!;
    expect(urssaf.tone).toBe("alerte");
    expect(rcpro.tone).toBe("ok");
    expect(urssaf.famille).toBe("papiers");
    expect(urssaf.libelle).toContain("Vérif Élec SARL");
    expect(urssaf.href).toBe("/etablissements/etab1/prestataires/p1");
  });

  it("ignore les pièces sans date — le calendrier ne montre que du daté", () => {
    const out = echeancesPrestataire(
      {
        ...base,
        attestationUrssafValableJusquA: null,
        assuranceRcProValableJusquA: null,
      },
      AUJOURDHUI,
      "etab1",
    );
    expect(out).toHaveLength(0);
  });
});

describe("echeancePermisFeu", () => {
  const base = {
    id: "pf1",
    numero: 3,
    lieu: "Toiture",
    dateDebut: jour("2026-08-20"),
    dateFin: jour("2026-08-21"),
  };

  it("reste ok tant que la date de début n'est pas passée", () => {
    const e = echeancePermisFeu(
      { ...base, statut: "attente_signatures" },
      AUJOURDHUI,
      "etab1",
    );
    expect(e.tone).toBe("ok");
    expect(e.famille).toBe("operations");
    expect(e.href).toBe("/etablissements/etab1/permis-feu/pf1");
  });

  it("alerte si le début est passé sans que les travaux soient en cours", () => {
    const e = echeancePermisFeu(
      {
        ...base,
        dateDebut: jour("2026-08-01"),
        dateFin: jour("2026-08-30"),
        statut: "brouillon",
      },
      AUJOURDHUI,
      "etab1",
    );
    expect(e.tone).toBe("alerte");
  });

  it("pas d'alerte si les travaux sont en cours et pas encore finis", () => {
    const e = echeancePermisFeu(
      {
        ...base,
        dateDebut: jour("2026-08-01"),
        dateFin: jour("2026-08-30"),
        statut: "en_cours",
      },
      AUJOURDHUI,
      "etab1",
    );
    expect(e.tone).toBe("ok");
  });

  it("alerte sur un permis échu non soldé — la pastille du board doit mener quelque part", () => {
    const e = echeancePermisFeu(
      {
        ...base,
        dateDebut: jour("2026-07-01"),
        dateFin: jour("2026-07-02"),
        statut: "en_cours",
      },
      AUJOURDHUI,
      "etab1",
    );
    expect(e.tone).toBe("alerte");
  });

  it("se tait sur un permis terminé ou annulé, quelles que soient ses dates", () => {
    for (const statut of ["termine", "annule"]) {
      const e = echeancePermisFeu(
        {
          ...base,
          dateDebut: jour("2026-07-01"),
          dateFin: jour("2026-07-02"),
          statut,
        },
        AUJOURDHUI,
        "etab1",
      );
      expect(e.tone).toBe("ok");
    }
  });
});

describe("echeancePlanPrevention", () => {
  const base = {
    id: "pp1",
    numero: 2,
    entrepriseExterieureRaison: "BTP Ouest",
    dateDebut: jour("2026-08-01"),
    dateFin: jour("2026-08-31"),
    statut: "valide",
  };

  it("alerte si l'opération a commencé sans inspection commune", () => {
    const e = echeancePlanPrevention(
      { ...base, inspectionDate: null },
      AUJOURDHUI,
      "etab1",
    );
    expect(e.tone).toBe("alerte");
  });

  it("ok si l'inspection commune a eu lieu", () => {
    const e = echeancePlanPrevention(
      { ...base, inspectionDate: jour("2026-07-28") },
      AUJOURDHUI,
      "etab1",
    );
    expect(e.tone).toBe("ok");
    expect(e.famille).toBe("operations");
    // Démarrée, sans alerte : sa fin est ce qui reste à tenir, et elle voyage
    // avec l'échéance (`dateEnJeuAutre`, relecture du 2026-09-14).
    expect(e.dateFin).toEqual(jour("2026-08-31"));
  });

  it("alerte sur une opération échue non close, inspection faite ou non", () => {
    const e = echeancePlanPrevention(
      {
        ...base,
        dateDebut: jour("2026-06-01"),
        dateFin: jour("2026-06-30"),
        inspectionDate: jour("2026-05-28"),
      },
      AUJOURDHUI,
      "etab1",
    );
    expect(e.tone).toBe("alerte");
  });

  it("se tait sur une opération close ou annulée", () => {
    for (const statut of ["clos", "annule"]) {
      const e = echeancePlanPrevention(
        {
          ...base,
          statut,
          dateDebut: jour("2026-06-01"),
          dateFin: jour("2026-06-30"),
          inspectionDate: null,
        },
        AUJOURDHUI,
        "etab1",
      );
      expect(e.tone).toBe("ok");
    }
  });

  it("n'alerte pas le dernier jour de l'opération", () => {
    const e = echeancePlanPrevention(
      {
        ...base,
        dateDebut: jour("2026-08-05"),
        dateFin: jour("2026-08-10"),
        inspectionDate: jour("2026-08-04"),
      },
      AUJOURDHUI,
      "etab1",
    );
    expect(e.tone).toBe("ok");
  });
});

describe("echeanceLegionelles", () => {
  it("pose la prochaine analyse un an après la dernière, en famille contrôles", () => {
    const e = echeanceLegionelles({
      etablissementId: "etab1",
      dateDerniereAnalyse: jour("2026-02-10"),
      aujourdhui: AUJOURDHUI,
    });
    expect(e).not.toBeNull();
    expect(e!.famille).toBe("controle");
    expect(cleJourCivil(e!.date)).toBe("2027-02-10");
    expect(e!.tone).toBe("ok");
  });

  it("ne produit rien sans première analyse", () => {
    expect(
      echeanceLegionelles({
        etablissementId: "etab1",
        dateDerniereAnalyse: null,
        aujourdhui: AUJOURDHUI,
      }),
    ).toBeNull();
  });
});


describe("filtrerParBatiment", () => {
  // La règle de l'ADR-019 sur laquelle reposent le calendrier, le tableau de
  // bord et les compteurs de retard : ce qui n'a pas de lieu concerne tout
  // l'établissement, donc aussi le bâtiment filtré. La masquer ferait mentir
  // le calendrier par omission — une mise à jour de DUERP en retard
  // disparaîtrait dès qu'on regarde la Réserve.
  const reserve = { id: "b-reserve", nom: "Réserve" };
  const principal = { id: "b-principal", nom: "Bâtiment principal" };
  const lignes = [
    { cle: "duerp", batiment: null },
    { cle: "extincteur", batiment: principal },
    { cle: "hotte", batiment: reserve },
  ];

  it("sans filtre, rend la liste telle quelle", () => {
    expect(filtrerParBatiment(lignes, undefined)).toBe(lignes);
  });

  it("garde le bâtiment demandé et ce qui n'a pas de lieu", () => {
    expect(filtrerParBatiment(lignes, "b-reserve").map((l) => l.cle)).toEqual([
      "duerp",
      "hotte",
    ]);
  });

  it("un bâtiment sans ligne propre garde quand même l'établissement", () => {
    expect(filtrerParBatiment(lignes, "b-inconnu").map((l) => l.cle)).toEqual([
      "duerp",
    ]);
  });
});
