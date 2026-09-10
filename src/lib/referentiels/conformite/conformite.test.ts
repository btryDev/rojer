import { describe, expect, it } from "vitest";
import type { CategorieEquipement } from "../types-communs";
import {
  CATEGORIES_EQUIPEMENT,
  CATEGORIES_ERP,
  CLASSES_IGH,
  PERIODICITE_EN_JOURS,
  PERIODICITES,
  REALISATEURS,
  TYPES_ERP,
} from "../types-communs";
import {
  estPorteeParEquipement,
  porteurDe,
  type Obligation,
  type ObligationPorteeParEquipement,
  type ReferenceLegale,
} from "./types";
import { determineObligationsApplicables, matchTypologie } from "@/lib/matching";
import type { EtablissementMatching } from "@/lib/matching";
import { CORPUS } from "../corpus";
import {
  PALIER_PAR_OBLIGATION,
  PERIODICITES_ARTICLE_5,
} from "./froid";
import {
  DOMAINES_OBLIGATION,
  OBLIGATIONS_RETIREES,
  REFERENTIEL_VERSION,
  SOURCES_LEGALES,
  empreinteReferentiel,
  obligationParId,
  obligationsAeration,
  obligationsAscenseurs,
  obligationsConformite,
  obligationsCuissonHotte,
  obligationsElectricite,
  obligationsEquipementSousPression,
  obligationsFroid,
  obligationsIncendie,
  obligationsLevage,
  obligationsParDomaine,
  obligationsPortesPortails,
  obligationsStockageDangereux,
} from "./index";

/**
 * Toutes les catégories qu'une obligation nomme, quel que soit leur rôle :
 * celles qui la déclenchent (porteur équipement) et celles qu'elle affiche à
 * titre indicatif (porteur établissement, `equipementsEnContexte`). Les deux
 * doivent être des valeurs de l'enum Prisma ; seule la première déclenche.
 */
function categoriesCitees(o: Obligation): readonly CategorieEquipement[] {
  return estPorteeParEquipement(o)
    ? o.categoriesEquipement
    : (o.equipementsEnContexte ?? []);
}

describe("référentiel conformité — invariants structurels", () => {
  it("couvre au moins 25 obligations P1 (critère de done étape 3)", () => {
    expect(obligationsConformite.length).toBeGreaterThanOrEqual(25);
  });

  it("couvre au moins 60 obligations après extension P2/P3 (critère de done étape 11)", () => {
    expect(obligationsConformite.length).toBeGreaterThanOrEqual(60);
  });

  it("les identifiants sont uniques", () => {
    const ids = obligationsConformite.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque obligation a un domaine valide", () => {
    for (const o of obligationsConformite) {
      expect(DOMAINES_OBLIGATION).toContain(o.domaine);
    }
  });

  it("chaque périodicité est dans l'enum Prisma", () => {
    for (const o of obligationsConformite) {
      expect(PERIODICITES).toContain(o.periodicite);
    }
  });

  it("chaque réalisateur est dans l'enum Prisma", () => {
    for (const o of obligationsConformite) {
      expect(o.realisateurs.length).toBeGreaterThan(0);
      for (const r of o.realisateurs) expect(REALISATEURS).toContain(r);
    }
  });

  it("chaque catégorie d'équipement est dans l'enum Prisma", () => {
    for (const o of obligationsConformite) {
      for (const c of categoriesCitees(o)) {
        expect(CATEGORIES_EQUIPEMENT).toContain(c);
      }
    }
  });

  // Cet invariant était jusqu'ici incident, logé dans le test ci-dessus dont le
  // titre parlait d'autre chose. Il est ici pour lui-même, et il dit désormais
  // une règle par branche : une obligation d'équipement en cite au moins une,
  // une obligation d'établissement n'en cite aucune (ADR-022).
  it("le déclencheur correspond au porteur", () => {
    for (const o of obligationsConformite) {
      if (estPorteeParEquipement(o)) {
        expect(
          o.categoriesEquipement.length,
          `${o.id} est portée par un équipement et ne déclenche sur rien`,
        ).toBeGreaterThan(0);
      } else {
        expect(
          o.categoriesEquipement,
          `${o.id} est portée par l'établissement et ne doit déclencher sur ` +
            "aucune catégorie — les équipements affichés vont dans " +
            "`equipementsEnContexte`, qui n'est pas un déclencheur",
        ).toBeUndefined();
        expect(o.conditions, `${o.id} : conditions sans équipement`).toBeUndefined();
      }
    }
  });

  it("le porteur est une valeur connue", () => {
    for (const o of obligationsConformite) {
      expect(["equipement", "etablissement", "salarie"]).toContain(
        porteurDe(o),
      );
    }
  });

  it("criticité toujours dans [1, 5]", () => {
    for (const o of obligationsConformite) {
      expect(o.criticite).toBeGreaterThanOrEqual(1);
      expect(o.criticite).toBeLessThanOrEqual(5);
    }
  });

  it("chaque obligation cite au moins une référence primaire valide", () => {
    for (const o of obligationsConformite) {
      expect(o.referencesLegales.length).toBeGreaterThan(0);
      for (const ref of o.referencesLegales) {
        expect(SOURCES_LEGALES).toContain(ref.source);
        expect(ref.reference.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("chaque URL de référence pointe vers une source officielle", () => {
    // Légifrance et l'INRS pour le droit national, EUR-Lex pour les règlements
    // européens d'application directe — le contrôle d'étanchéité des fluides
    // frigorigènes ne tient ses seuils et ses périodicités que du règlement
    // (UE) 2024/573, le code de l'environnement renvoyant encore au texte que
    // celui-ci abroge. Aucune autre origine n'est admise : pas de norme privée,
    // pas de site commercial, pas de blog technique.
    for (const o of obligationsConformite) {
      for (const ref of o.referencesLegales) {
        if (ref.url) {
          expect(ref.url).toMatch(
            /^https:\/\/(www\.)?(legifrance\.gouv\.fr|inrs\.fr|eur-lex\.europa\.eu)\//,
          );
        }
      }
    }
  });

  it("typologies : au moins un régime déclaré par obligation", () => {
    for (const o of obligationsConformite) {
      const t = o.typologies;
      const auMoinsUn =
        t.travail !== undefined ||
        t.erp !== undefined ||
        t.igh !== undefined ||
        t.habitation !== undefined;
      expect(auMoinsUn).toBe(true);
    }
  });

  it("les catégories ERP déclarées existent dans l'enum", () => {
    for (const o of obligationsConformite) {
      if (typeof o.typologies.erp === "object" && o.typologies.erp) {
        for (const c of o.typologies.erp.categories ?? []) {
          expect(CATEGORIES_ERP).toContain(c);
        }
      }
    }
  });

  it("les types d'exploitation ERP déclarés existent dans l'enum", () => {
    for (const o of obligationsConformite) {
      if (typeof o.typologies.erp === "object" && o.typologies.erp) {
        for (const t of o.typologies.erp.types ?? []) {
          expect(TYPES_ERP, o.id).toContain(t);
        }
      }
    }
  });

  it("les classes IGH déclarées existent dans l'enum", () => {
    for (const o of obligationsConformite) {
      if (typeof o.typologies.igh === "object" && o.typologies.igh) {
        for (const c of o.typologies.igh.classes) {
          expect(CLASSES_IGH).toContain(c);
        }
      }
    }
  });
});

describe("référentiel conformité — couverture P1", () => {
  it("couvre les trois domaines P1 avec au moins 7 obligations chacun", () => {
    expect(obligationsElectricite.length).toBeGreaterThanOrEqual(7);
    expect(obligationsIncendie.length).toBeGreaterThanOrEqual(7);
    expect(obligationsAeration.length).toBeGreaterThanOrEqual(7);
  });

  it("couvre les 6 nouveaux domaines P2/P3 (étape 11)", () => {
    expect(obligationsCuissonHotte.length).toBeGreaterThanOrEqual(4);
    expect(obligationsAscenseurs.length).toBeGreaterThanOrEqual(5);
    expect(obligationsPortesPortails.length).toBeGreaterThanOrEqual(4);
    expect(obligationsEquipementSousPression.length).toBeGreaterThanOrEqual(5);
    expect(obligationsStockageDangereux.length).toBeGreaterThanOrEqual(5);
    expect(obligationsLevage.length).toBeGreaterThanOrEqual(7);
  });

  it("couvre le domaine froid sur ses six paliers de périodicité", () => {
    // Trois paliers de charge multipliés par la présence ou non d'un système
    // de détection des fuites, plus la mise en service et la modification du
    // circuit frigorifique.
    expect(obligationsFroid.length).toBe(8);
    expect(obligationsFroid.every((o) => o.domaine === "froid")).toBe(true);
  });

  it("les six périodicités du froid sortent toutes de la table de l'article 5", () => {
    // Les douze valeurs de l'article 5, paragraphe 6, vivent dans une table
    // unique (voir l'en-tête de `froid.ts`, qui cite le paragraphe), dont
    // chaque obligation tire la sienne. Ce test empêche qu'une périodicité se
    // remette à vivre en dur dans une obligation : le jour où le règlement sera
    // modifié, la correction porterait alors sur cinq paliers et pas sur le
    // sixième — exactement le genre d'écart qu'on ne voit pas.
    for (const [id, palier] of Object.entries(PALIER_PAR_OBLIGATION)) {
      const o = obligationsFroid.find((x) => x.id === id);
      expect(o, `obligation ${id} introuvable`).toBeDefined();
      expect(o!.periodicite, id).toBe(PERIODICITES_ARTICLE_5[palier]);
    }
  });

  it("obligationsParDomaine renvoie cohérent avec le filtrage", () => {
    const elec = obligationsParDomaine("electricite");
    expect(elec.length).toBe(obligationsElectricite.length);
    expect(elec.every((o) => o.domaine === "electricite")).toBe(true);
  });

  it("obligationParId retrouve une obligation connue", () => {
    const o = obligationParId("elec-travail-periodique-annuelle");
    expect(o).toBeDefined();
    expect(o?.periodicite).toBe("annuelle");
  });

  it("obligationParId renvoie undefined pour un id inconnu", () => {
    expect(obligationParId("id-inexistant")).toBeUndefined();
  });
});

describe("référentiel conformité — cohérence sémantique", () => {
  it("une obligation ERP-only ne déclare pas travail=true strict", () => {
    // Règle interne : si on veut flag ERP ET travail, les deux doivent être
    // explicitement true. On vérifie surtout qu'il n'y a pas de typologie vide.
    for (const o of obligationsConformite) {
      const t = o.typologies;
      const aucunFlag =
        t.travail === undefined &&
        t.erp === undefined &&
        t.igh === undefined &&
        t.habitation === undefined;
      expect(aucunFlag).toBe(false);
    }
  });

  it("une obligation à périodicité 'mise_en_service_uniquement' ne génère pas d'échéance récurrente", () => {
    const mes = obligationsConformite.filter(
      (o) => o.periodicite === "mise_en_service_uniquement",
    );
    // on vérifie simplement qu'elles existent et sont traitées comme one-shot
    for (const o of mes) {
      expect(o.realisateurs.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// Invariants durcis (amendement 2026-08)
//
// Le fichier ne vérifiait auparavant que l'unicité des id. Les quatre familles
// de tests ci-dessous verrouillent les défauts trouvés à l'audit : conditions
// mortes, doublons réels, seuils d'effectif écrits en prose mais jamais
// encodés, et perte silencieuse d'obligations vitales.
// =============================================================================

describe("référentiel conformité — conditions bien formées", () => {
  it("toute catégorie citée dans conditions[] appartient à categoriesEquipement", () => {
    // Une condition qui cible une catégorie absente de `categoriesEquipement`
    // est une condition MORTE : le moteur ne la rencontre jamais, l'obligation
    // s'applique donc sans restriction alors que le rédacteur croyait l'avoir
    // bornée. C'est le pire des cas — un faux positif déguisé en règle fine.
    for (const o of obligationsConformite) {
      for (const c of o.conditions ?? []) {
        expect(
          o.categoriesEquipement,
          `${o.id} : condition sur ${c.categorie}, absente de categoriesEquipement`,
        ).toContain(c.categorie);
      }
    }
  });

  it("un tableau conditions[] déclaré n'est jamais vide", () => {
    for (const o of obligationsConformite) {
      if (o.conditions !== undefined) {
        expect(o.conditions.length, o.id).toBeGreaterThan(0);
      }
    }
  });

  it("toute propriété conditionnée porte un nom exploitable (non vide)", () => {
    for (const o of obligationsConformite) {
      for (const c of o.conditions ?? []) {
        expect(c.propriete.trim().length, o.id).toBeGreaterThan(0);
      }
    }
  });
});

describe("référentiel conformité — anti-doublon", () => {
  /**
   * Normalise une référence légale pour la comparaison : casse, espaces et
   * numéros de paragraphe sont ignorés, de sorte que « art. GC 20 » et
   * « art. GC 20 § 2 » désignent bien le même article — c'était exactement
   * le doublon ramonage/nettoyage de hotte trouvé à l'audit.
   */
  function normaliserReference(r: string): string {
    return r
      .toLowerCase()
      .replace(/§\s*\d+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[\s,.]+$/, "")
      .trim();
  }

  /**
   * L'identité d'un article, pour la comparaison.
   *
   * La clé canonique `article` d'abord — c'est exactement ce pour quoi elle
   * a été introduite (`types.ts` : « `reference` est faite pour être lue par
   * un humain […] Elle ne peut pas servir de clé »). Deux obligations
   * pouvaient citer le MÊME article sous deux libellés — « Arrêté du 25 juin
   * 1980, art. PE 4 § 2 » et « Arrêté du 22 juin 1990 (ERP 5ᵉ catégorie),
   * art. PE 4 § 2, rédaction de l'arrêté du 1er décembre 2025 » — et échapper
   * au test faute de se ressembler. La normalisation du texte ne reste qu'en
   * repli, pour les références qui n'ont pas encore de clé.
   */
  function identiteArticle(r: ReferenceLegale): string {
    return r.article
      ? `article:${r.article.toLowerCase().replace(/§\s*\d+/g, " ").replace(/\s+/g, " ").trim()}`
      : `texte:${normaliserReference(r.reference)}`;
  }

  /**
   * Deux obligations distinguées par des conditions différentes ne sont pas
   * des doublons : elles couvrent des périmètres disjoints ou emboîtés
   * (ex. RIA vs extincteurs, tous deux sur MS 73).
   */
  function signatureConditions(o: Obligation): string {
    return JSON.stringify(
      (o.conditions ?? [])
        .map((c) => JSON.stringify(c))
        .sort()
        .join("|"),
    );
  }

  /**
   * Deux obligations qu'AUCUN établissement ne peut recevoir ensemble ne sont
   * pas un doublon — c'est la même distinction que `signatureConditions`, sur
   * l'autre axe. Le cas qui l'a rendue nécessaire est le tableau de GE 4 § 1 :
   * six lignes du même article, deux périodicités, sans aucune condition
   * d'équipement, et une partition exacte par catégorie × type. Les déclarer
   * une à une en exceptions aurait fait six commentaires là où le référentiel
   * porte déjà la preuve.
   *
   * Volontairement ÉTROIT et conservateur : il ne répond « disjointes » que
   * si les deux typologies ne déclarent QUE la dimension ERP — dès qu'un
   * effectif, un autre régime ou un seuil entre en jeu, il répond « elles se
   * recouvrent » et le doublon reste signalé. Un test qui devine trop se tait
   * sur de vrais doublons.
   */
  function typologiesErpDisjointes(a: Obligation, b: Obligation): boolean {
    // LES CRITÈRES QUE CETTE SONDE SAIT PARCOURIR, et elle refuse de conclure
    // sur les autres. Deux obligations ne sont déclarées disjointes que si
    // AUCUN établissement du domaine sondé ne les reçoit toutes deux ; le
    // domaine doit donc couvrir tout ce dont elles dépendent. `erp` était seul
    // jusqu'au 2026-09-08 ; `locauxSommeilPublic` l'a rejoint le jour où deux
    // lignes de GE 4 § 1 s'en sont servies pour se partager la colonne R.
    // Élargir la sonde est la seule façon honnête de les comparer : les
    // déclarer « paire connue » aurait éteint le contrôle au lieu de le
    // passer.
    const CRITERES_SONDES = new Set(["erp", "locauxSommeilPublic"]);
    const dansLeDomaineSonde = (o: Obligation) =>
      Object.keys(o.typologies).every((c) => CRITERES_SONDES.has(c)) &&
      typeof o.typologies.erp === "object";
    if (!dansLeDomaineSonde(a) || !dansLeDomaineSonde(b)) return false;

    const sonde = (
      categorieErp: EtablissementMatching["categorieErp"],
      typeErp: EtablissementMatching["typeErp"],
      comporteLocauxSommeilPublic: boolean | null,
    ): EtablissementMatching => ({
      id: "sonde",
      effectifSurSite: 10,
      estEtablissementTravail: false,
      estERP: true,
      estIGH: false,
      estHabitation: false,
      typeErp,
      categorieErp,
      classeIgh: null,
      familleHabitation: null,
      comporteLocauxSommeilPublic,
      personnesPresentesHabituellement: null,
      manipuleMatieresR422722: null,
    });

    // `null` figure dans les TROIS axes : c'est l'établissement qui n'a pas
    // précisé sa catégorie, son type ou son hébergement, et c'est précisément
    // là que deux lignes complémentaires peuvent se recouvrir sans qu'on le
    // voie. Le silence sur l'hébergement est le cas critique : une paire
    // `true` / `false` ne se partage proprement un type que si l'une des deux
    // retient le muet et l'autre le laisse.
    for (const cat of [...CATEGORIES_ERP, null] as const) {
      for (const type of [...TYPES_ERP, null] as const) {
        for (const heb of [true, false, null] as const) {
          const etab = sonde(cat, type, heb);
          if (
            matchTypologie(a.typologies, etab).ok &&
            matchTypologie(b.typologies, etab).ok
          ) {
            return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Les paires que la comparaison signale et qui n'en sont pas — ou qui en
   * sont, et attendent une décision qu'un test ne peut pas prendre.
   *
   * Chacune porte sa raison et, quand c'en est une vraie, la question exacte
   * qui la résoudrait. Une exception sans condition de levée est une
   * exception qui reste ; c'est ce qu'on veut éviter.
   */
  const PAIRES_DECLAREES: { paire: [string, string]; raison: string }[] = [
    // ── Vraies distinctions que le test ne sait pas voir ────────────────
    {
      paire: [
        "prevention-etablissement-salarie-designe",
        "formation-securite-salarie-designe-competent",
      ],
      raison:
        "Instruit le 2026-08-31, ce n'est PAS un doublon. `L. 4644-1` I porte deux actes dans deux alinéas successifs : l'alinéa 1 impose de DÉSIGNER un ou plusieurs salariés compétents — acte de l'employeur, porteur établissement, dû même sans aucun équipement déclaré —, l'alinéa 2 fait bénéficier la personne ainsi désignée d'une FORMATION en matière de santé au travail — titre nominatif, porteur salarié, qui n'existe qu'une fois quelqu'un déclaré. Un employeur peut avoir désigné sans avoir formé, et c'est le cas ordinaire ; les fondre aurait laissé cocher « fait » pour une désignation sur un papier. Le test ne compare que la clé d'article et ne sait pas distinguer deux alinéas.",
    },
    {
      paire: [
        "elec-travail-habilitation-personnel",
        "elec-salarie-habilitation",
      ],
      raison:
        "Instruit le 2026-09-01, ce n'est PAS un doublon, et la paire est la réplique exacte de `formation-securite-etablissement-organisation` / `formation-securite-salarie-accueil` — à ceci près que celle-là a échappé au test parce que ses deux lignes se fondent sur des articles différents (R. 4141-13 et R. 4141-20), quand `R. 4544-10` porte les deux actes à lui seul. La première ligne est déclenchée par une installation électrique déclarée et existe MÊME si aucune personne n'est déclarée : c'est elle qui dit au dirigeant « cette obligation suppose une personne nommée, en voici le titre ». La seconde ne produit de ligne que par salarié déclaré détenteur. Les fondre imposerait de choisir entre deux erreurs : une obligation qui disparaît de l'écran quand personne n'est déclaré — alors qu'elle est due dès qu'on opère sur l'installation —, ou une obligation qui ne se solde jamais nominativement, alors que R. 4544-10 délivre l'habilitation « à un travailleur désigné ». Ce test ne compare que la clé d'article ; il ne sait pas voir qu'un même article institue une charge d'employeur et un titre de personne.",
    },
    {
      paire: [
        "elec-travail-carnet-prescriptions",
        "elec-salarie-habilitation",
      ],
      raison:
        "Instruit à l'intégration du 2026-09-02, et c'est une paire née de deux branches qui ne se voyaient pas : le carnet de prescriptions a été encodé l'après-midi par un lot, quand une réserve écrite le matin par un autre disait qu'il n'était « encodé nulle part ». `R. 4544-10` porte les deux — le quatrième alinéa remet un carnet de prescriptions À CHAQUE travailleur, charge d'employeur due dès qu'on opère sur l'installation ; le premier délivre l'habilitation « à un travailleur désigné », titre nominatif qui n'existe que par personne déclarée. Un employeur peut avoir remis les carnets sans qu'aucune habilitation soit à jour, et l'inverse. Les fondre ferait cocher « fait » pour l'un en réglant l'autre. Le test ne compare que la clé d'article, et `R. 4544-10` en institue deux ; c'est le troisième couple de ce genre sur ce seul article.",
    },
    {
      paire: [
        "aeration-controle-installations-r4222-20",
        "stockage-dangereux-ventilation-locaux",
      ],
      raison:
        "Même article fondateur (R. 4222-20), mais deux régimes distincts de l'arrêté du 8 octobre 1987 : l'article 3 pour les locaux à pollution NON spécifique, l'article 4 pour les locaux à pollution spécifique — dont relève un local de stockage de matières dangereuses. Le discriminant est la référence de CONTEXTE, que ce test ne compare pas (il ne regarde que le fondateur, par convention). Ce n'est pas un doublon.",
    },
    {
      paire: [
        "porte-auto-verification-initiale",
        "porte-auto-portail-piete-coulissant",
      ],
      raison:
        "Instruit le 2026-08-27, ce n'est PAS un doublon. La clé canonique est la même (`Arrêté 1993-12-21 art. 2`) parce que l'article 2 pose le champ d'application commun, mais les deux obligations renvoient à des dispositions distinctes du même arrêté : « art. 2 à 4 — installations neuves » d'un côté, « art. 2 et 5 — passages de véhicules » de l'autre. Un article peut fonder plusieurs actes ; ce test ne compare que le fondateur, il ne sait pas les distinguer.",
    },
    {
      paire: [
        "stockage-dangereux-retention",
        "stockage-dangereux-verification-etancheite",
      ],
      raison:
        "Ce n'est pas un doublon, mais la raison qui le disait était fausse et a été réécrite le 2026-09-01 (lot A). Elle affirmait que R. 4412-11 fonde « entretien régulier des équipements de stockage » : l'article, lu en entier à la source, ne l'écrit pas. Ce qui distingue vraiment les deux lignes est leur NATURE, et elle est déclarée : `stockage-dangereux-retention` est un `etat_permanent` — la rétention est en place ou elle ne l'est pas — et `stockage-dangereux-verification-etancheite` une `echeance_recurrente` — l'acte revient, sans rythme connu. Un état et un acte ne se cochent pas de la même façon et ne se prouvent pas par la même chose. Le 7° de l'article fonde le premier (procédures de stockage sûres), le 2° le second (procédures d'entretien régulières) ; seul l'article est commun, et aucune des deux n'a pour l'instant de texte qui DATE l'acte — voir les notes internes de la seconde.",
    },
    // ── Apparue le 2026-09-01 avec le recalage des fondements (lot A) ──
    {
      paire: [
        "levage-examen-adequation-mise-en-service",
        "levage-epreuve-initiale-fonctionnement",
      ],
      raison:
        "CELLE-CI EN EST PEUT-ÊTRE UNE, ET LA QUESTION EST OUVERTE. Elle n'apparaît que depuis le 2026-09-01 : `levage-examen-adequation-mise-en-service` se fondait sur l'article 5, qui DÉFINIT l'examen d'adéquation sans l'imposer, et le lot A l'a recalée sur l'article 14, seul article qui l'exige. Or c'est déjà le fondement de `levage-epreuve-initiale-fonctionnement`, dont la description reprend les quatre actes du I — examen d'adéquation a), examen de montage b), épreuve statique c), épreuve dynamique d). L'examen d'adéquation est donc décrit deux fois, une fois seul et une fois dans l'énumération. LA QUESTION QUI TRANCHE : l'article 14 fonde-t-il UNE vérification à quatre volets — auquel cas la ligne d'adéquation est un fragment à fondre — ou quatre actes séparables, sachant que le d) porte une exception qui ne vaut que pour lui (épreuve dynamique non exigée pour les appareils mus par la force humaine) et que les trois autres n'en ont pas ? Le fondre est un retrait de ligne : décision de la propriétaire, hors mandat du lot A. Le défaut de fondement, lui, était réel et est corrigé ; la déclaration ne le masque pas, elle rend visible ce qu'il découvre.",
    },
    // ── Apparue le 2026-09-01 avec le lot C ────────────────────────────
    {
      paire: [
        "elec-travail-habilitation-personnel",
        "elec-travail-carnet-prescriptions",
      ],
      raison:
        "Instruit le 2026-09-01, ce n'est PAS un doublon, et c'est exactement le motif de la paire `R. 4412-38` juste en dessous : un même article met plusieurs actes à la charge de l'employeur, et ce test ne compare que la clé d'article. R. 4544-10 en met QUATRE — délivrer l'habilitation en spécifiant les opérations autorisées, s'assurer au préalable de la formation, remettre à chaque travailleur un carnet de prescriptions (quatrième alinéa), et subordonner la validité au voisinage à une attestation médicale. L'habilitation est une DÉCISION de l'employeur ; le carnet est une PIÈCE qu'il remet, et l'un peut exister sans l'autre — un employeur qui a habilité sans remettre est le manquement ordinaire, pas un cas d'école. Les deux se prouvent différemment : `pieceAttendue` est nulle sur l'habilitation, nommée sur le carnet. Article rouvert à la source avant l'encodage, version en vigueur du 2025-10-01.",
    },
    {
      paire: [
        "stockage-dangereux-fiches-donnees",
        "stockage-dangereux-formation-personnel",
      ],
      raison:
        "Instruit le 2026-08-27, ce n'est PAS un doublon. `R. 4412-38` fonde d'un côté « l'accès des travailleurs aux fiches de données de sécurité » — une pièce à tenir disponible — et de l'autre leur formation. Un document et un enseignement ne sont pas le même acte, même sous le même article.",
    },
    // ── Résolus le 2026-08-27 ──────────────────────────────────────────
    // Trois paires figuraient ici : les fragments de PE 4 § 2 (électricité,
    // gaz) et de R. 4222-20 (VMC/CTA) face aux obligations qui portent ces
    // articles entiers. Elles ont été résolues plutôt que déclarées : aucun
    // des trois fragments n'avait de fondement propre — leur article
    // fondateur était celui-là même que le référentiel porte désormais en
    // entier — et les garder aurait maintenu la décomposition que l'ADR-022
    // existe pour écarter.
    //
    // Ils sont RETIRÉS (`OBLIGATIONS_RETIREES` dans `index.ts`), pas
    // supprimés au sens des données : la réconciliation n'efface
    // physiquement qu'une ligne sans rapport, sans action et sans date de
    // réalisation ; toute ligne porteuse d'une preuve est archivée, libellé
    // marqué (ADR-012). Constat en base avant le retrait : six lignes au
    // total, aucune preuve, aucune réalisation.
  ];

  const CLES_DECLAREES = new Set(
    PAIRES_DECLAREES.map(({ paire }) => [...paire].sort().join(" ↔ ")),
  );

  it("chaque paire déclarée existe encore, et dit pourquoi", () => {
    // Une exception qui survit à la disparition de son objet est un
    // commentaire périmé qui a l'air d'une règle.
    for (const { paire, raison } of PAIRES_DECLAREES) {
      for (const id of paire) {
        expect(obligationParId(id), `${id} n'existe plus`).toBeDefined();
      }
      expect(raison.length, paire.join(" ↔ ")).toBeGreaterThan(80);
    }
  });

  it("pas deux obligations partageant catégorie d'équipement, périodicité et article fondateur", () => {
    // On compare l'article FONDATEUR (`referencesLegales[0]`, cf. convention
    // documentée sur le type `Obligation`) et non l'ensemble des références :
    // deux obligations distinctes citent légitimement un même article en
    // contexte — le dossier de maintenance et le maintien en état d'une porte
    // automatique renvoient tous deux à R. 4224-17 sans être un doublon.
    const doublons: string[] = [];
    for (let i = 0; i < obligationsConformite.length; i++) {
      for (let j = i + 1; j < obligationsConformite.length; j++) {
        const a = obligationsConformite[i];
        const b = obligationsConformite[j];
        if (a.periodicite !== b.periodicite) continue;
        if (signatureConditions(a) !== signatureConditions(b)) continue;
        if (typologiesErpDisjointes(a, b)) continue;
        // Le porteur ne dispense PAS de la comparaison. Une obligation
        // portée par l'établissement et un fragment de la même obligation
        // accroché à un équipement sont deux lignes pour un seul acte —
        // c'est le doublon que ce test doit voir, pas celui qu'il doit
        // laisser passer.
        if (estPorteeParEquipement(a) && estPorteeParEquipement(b)) {
          const memeCategorie = a.categoriesEquipement.some((c) =>
            b.categoriesEquipement.includes(c),
          );
          if (!memeCategorie) continue;
        }
        if (
          identiteArticle(a.referencesLegales[0]) ===
          identiteArticle(b.referencesLegales[0])
        ) {
          if (CLES_DECLAREES.has([a.id, b.id].sort().join(" ↔ "))) continue;
          doublons.push(`${a.id} ↔ ${b.id}`);
        }
      }
    }
    expect(doublons).toEqual([]);
  });

  it("l'id retiré `aeration-hotte-pro-annuelle` n'est pas réintroduit", () => {
    // Fusionné dans `cuisson-erp-circuits-extraction-nettoyage`. Un id retiré
    // ne doit jamais réapparaître : des Verification en base le référencent.
    expect(obligationParId("aeration-hotte-pro-annuelle")).toBeUndefined();
    expect(
      obligationParId("cuisson-erp-circuits-extraction-nettoyage"),
    ).toBeDefined();
  });
});

describe("référentiel conformité — seuils d'effectif", () => {
  /**
   * Un seuil d'effectif écrit dans la description mais absent de la typologie
   * est un seuil qui n'existe pas : le moteur applique l'obligation à tout le
   * monde, description trompeuse à l'appui.
   */
  const MENTION_SEUIL_EFFECTIF =
    /\d+\s*(salari[ée]s?|personnes?|travailleurs?)/i;

  it("toute description citant un seuil d'effectif le déclare dans la typologie", () => {
    for (const o of obligationsConformite) {
      if (!o.description) continue;
      if (!MENTION_SEUIL_EFFECTIF.test(o.description)) continue;
      const t = o.typologies;
      expect(
        t.effectifMin !== undefined ||
          t.effectifMax !== undefined ||
          t.personnesPresentesMin !== undefined,
        `${o.id} : la description mentionne un seuil d'effectif jamais encodé`,
      ).toBe(true);
    }
  });

  it("les plages d'effectif déclarées sont cohérentes", () => {
    for (const o of obligationsConformite) {
      const { effectifMin, effectifMax } = o.typologies;
      if (effectifMin !== undefined) {
        expect(effectifMin, o.id).toBeGreaterThanOrEqual(0);
      }
      if (effectifMin !== undefined && effectifMax !== undefined) {
        expect(effectifMin, o.id).toBeLessThanOrEqual(effectifMax);
      }
    }
  });

  it("l'exercice semestriel et la consigne portent le champ disjonctif de R. 4227-34", () => {
    // R. 4227-39 → consigne (R. 4227-37) → établissements de R. 4227-34 :
    // « plus de cinquante personnes » occupées ou réunies (public compris)
    // OU matières R. 4227-22 quel que soit l'effectif.
    for (const id of [
      "incendie-travail-exercice-semestriel",
      "incendie-travail-consigne-affichee",
    ]) {
      const o = obligationParId(id);
      expect(o?.typologies.personnesPresentesMin, id).toBe(51);
      expect(o?.typologies.champR422734, id).toBe(true);
      expect(o?.typologies.effectifMin, id).toBeUndefined();
    }
  });

  it("`champR422734` n'est jamais posé sans `personnesPresentesMin`", () => {
    for (const o of obligationsConformite) {
      if (o.typologies.champR422734) {
        expect(o.typologies.personnesPresentesMin, o.id).toBeDefined();
      }
    }
  });
});

describe("référentiel conformité — non-régression des obligations critiques", () => {
  /**
   * Conditions strictes tolérées sur une obligation de criticité ≥ 4, chacune
   * pour une raison nommée. Le critère commun : aucun établissement ne peut
   * perdre en silence une obligation qu'il avait déjà.
   *
   *  - les trois premières sont antérieures à l'amendement 2026-08 :
   *    l'obligation n'a JAMAIS été appliquée sans réponse ;
   *  - `levage-vgp-semestrielle-chariot-gerbeur` est une obligation neuve, que
   *    personne ne peut donc perdre, et dont la couverture par défaut reste
   *    assurée par `levage-vgp-annuelle-charges` tant que la question n'a pas
   *    reçu « oui ».
   *
   * Toute autre condition stricte sur une obligation de criticité ≥ 4 doit
   * être ajoutée ici en connaissance de cause — ou, bien plus probablement,
   * rédigée en `non_infirmee` ou en `infirmee`.
   */
  const CONDITIONS_STRICTES_JUSTIFIEES = new Set([
    "elec-erp-groupe-electrogene-annuel",
    // Obligation neuve créée le 2026-08-26 (arrêté du 1er mars 2004, art. 23 b) :
    // aucun équipement déjà en base ne peut la perdre, et
    // `levage-vgp-semestrielle-personnes` couvre l'appareil tant que la question
    // sur la force humaine n'a pas reçu « oui » — elle porte pour cela une
    // condition `infirmee` sur la même propriété.
    "levage-vgp-trimestrielle-force-humaine",
    "aeration-travail-locaux-pollution-specifique",
    // Obligation neuve du 2026-09-01 (arrêté du 8 octobre 1987, art. 4 b) :
    // aucun équipement déjà en base ne peut la perdre, et
    // `aeration-travail-locaux-pollution-specifique` reste due tant que la
    // question sur le recyclage n'a pas reçu « oui » — répondre ne fait
    // qu'AJOUTER le semestriel, jamais retirer l'annuel.
    //
    // Le trois-états aurait été le réflexe, et il aurait été faux ici : il
    // afficherait un semestriel à tout propriétaire de VMC tant qu'il n'a pas
    // répondu non, soit un faux positif de masse sur une ligne qui revient
    // deux fois par an. La règle du dépôt vise les obligations DÉJÀ PUBLIÉES
    // qui s'éteindraient au silence ; celle-ci naît d'une réponse.
    "aeration-travail-recyclage-semestriel",
    "aeration-erp-ps-surveillance-qualite-air-sup-250",
    "levage-vgp-semestrielle-chariot-gerbeur",
    // Les cinq paliers non nominaux du contrôle d'étanchéité des fluides
    // frigorigènes. Même raisonnement : obligations neuves, donc impossibles à
    // perdre, et la couverture par défaut reste assurée par
    // `froid-controle-etancheite-annuel`, dont les quatre conditions sont
    // toutes satisfaites au silence. Répondre « oui » à une question ne fait
    // que déplacer l'échéance vers le palier exact.
    "froid-controle-etancheite-biennal-detection",
    "froid-controle-etancheite-semestriel-50t",
    "froid-controle-etancheite-annuel-50t-detection",
    "froid-controle-etancheite-trimestriel-500t",
    "froid-controle-etancheite-semestriel-500t-detection",
    // Créée le 2026-09-01 (arrêté du 20 novembre 2017, art. 15 : deux ans pour
    // les générateurs de vapeur). Même critère que le chariot élévateur, et il
    // est rempli pour les deux mêmes raisons : l'obligation est NEUVE — aucun
    // équipement déjà en base ne peut la perdre —, et la couverture par défaut
    // reste assurée par `esp-inspection-periodique`, qui porte sur la même
    // propriété la condition `enum_differente` correspondante et s'applique
    // donc tant que `familleEsp` n'a pas été renseignée.
    "esp-inspection-periodique-generateur-vapeur",
  ]);

  /**
   * Les deux formes qui restent satisfaites quand la propriété est absente.
   * C'est la seule propriété qui compte pour ce garde-fou : une obligation
   * déjà publiée ne doit pas s'éteindre au silence.
   */
  const FORMES_SANS_EXTINCTION_AU_SILENCE = new Set([
    "equipement_propriete_non_infirmee",
    "equipement_propriete_infirmee",
    // Ajoutée le 2026-09-01 avec la forme elle-même. `enum_differente` est
    // satisfaite quand la propriété est absente — c'est sa raison d'être : elle
    // porte la ligne GÉNÉRALE d'un couple d'énumération et doit survivre au
    // silence, exactement comme `infirmee` porte la VGP annuelle de levage.
    // Son pendant `enum_egale` n'y figure évidemment PAS : il est strict, et
    // toute obligation de criticité ≥ 4 qui s'en sert doit passer par la liste
    // blanche ci-dessus.
    "equipement_propriete_enum_differente",
  ]);

  it("une obligation criticité ≥ 4 ne se conditionne pas sur le silence", () => {
    // Sans cette règle, ajouter une condition à une obligation déjà publiée
    // ferait disparaître l'obligation pour TOUS les équipements déjà en base
    // — qui n'ont évidemment pas la nouvelle propriété — sans le moindre
    // signal. Inacceptable sur une obligation de criticité élevée.
    for (const o of obligationsConformite) {
      if (o.criticite < 4) continue;
      if (!o.conditions || o.conditions.length === 0) continue;
      if (CONDITIONS_STRICTES_JUSTIFIEES.has(o.id)) continue;
      for (const c of o.conditions) {
        expect(
          FORMES_SANS_EXTINCTION_AU_SILENCE.has(c.type),
          `${o.id} : condition stricte (${c.type}) sur une obligation criticité ${o.criticite}`,
        ).toBe(true);
      }
    }
  });

  it("les deux VGP de levage s'excluent sur la même propriété", () => {
    // Le couple annuelle / semestrielle doit couvrir les trois états de la
    // réponse sans jamais laisser un appareil sans échéance, ni lui en donner
    // deux pour un seul acte de vérification.
    const annuelle = obligationParId("levage-vgp-annuelle-charges");
    const semestrielle = obligationParId(
      "levage-vgp-semestrielle-chariot-gerbeur",
    );
    expect(annuelle?.conditions).toEqual([
      {
        type: "equipement_propriete_infirmee",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "estChariotOuGerbeur",
      },
    ]);
    expect(semestrielle?.conditions).toEqual([
      {
        type: "equipement_propriete_booleenne",
        categorie: "EQUIPEMENT_LEVAGE",
        propriete: "estChariotOuGerbeur",
        valeur: true,
      },
    ]);
  });

  it("les six contrôles d'étanchéité du froid s'excluent sur les mêmes propriétés", () => {
    // Le levage n'avait que deux états sur une seule propriété ; le froid en a
    // six, sur trois. Le découpage doit rester une partition : pour n'importe
    // quel triplet de réponses, exactement une obligation s'applique. Une
    // condition oubliée et deux échéances tombent pour un seul acte de
    // contrôle ; une condition de trop et un parc entier n'a plus rien.
    const CAT = "INSTALLATION_FRIGORIFIQUE";
    // Le seuil de déclenchement précède la dispense sur les six : sous le
    // seuil, il n'y a pas d'obligation à dispenser.
    const seuil = {
      type: "equipement_propriete_infirmee",
      categorie: CAT,
      propriete: "estChargeSousSeuilControle",
    };
    const dispense = {
      type: "equipement_propriete_infirmee",
      categorie: CAT,
      propriete: "estHermetiquementScelleSousSeuil",
    };
    const pas = (propriete: string) => ({
      type: "equipement_propriete_infirmee",
      categorie: CAT,
      propriete,
    });
    const oui = (propriete: string) => ({
      type: "equipement_propriete_booleenne",
      categorie: CAT,
      propriete,
      valeur: true,
    });

    const attendu: Record<string, unknown[]> = {
      "froid-controle-etancheite-annuel": [
        seuil,
        dispense,
        pas("estChargeSuperieure500TCo2"),
        pas("estChargeSuperieure50TCo2"),
        pas("aDetectionDeFuites"),
      ],
      "froid-controle-etancheite-biennal-detection": [
        seuil,
        dispense,
        pas("estChargeSuperieure500TCo2"),
        pas("estChargeSuperieure50TCo2"),
        oui("aDetectionDeFuites"),
      ],
      "froid-controle-etancheite-semestriel-50t": [
        seuil,
        dispense,
        pas("estChargeSuperieure500TCo2"),
        oui("estChargeSuperieure50TCo2"),
        pas("aDetectionDeFuites"),
      ],
      "froid-controle-etancheite-annuel-50t-detection": [
        seuil,
        dispense,
        pas("estChargeSuperieure500TCo2"),
        oui("estChargeSuperieure50TCo2"),
        oui("aDetectionDeFuites"),
      ],
      "froid-controle-etancheite-trimestriel-500t": [
        seuil,
        dispense,
        oui("estChargeSuperieure500TCo2"),
        pas("aDetectionDeFuites"),
      ],
      "froid-controle-etancheite-semestriel-500t-detection": [
        seuil,
        dispense,
        oui("estChargeSuperieure500TCo2"),
        oui("aDetectionDeFuites"),
      ],
    };

    for (const [id, conditions] of Object.entries(attendu)) {
      expect(obligationParId(id)?.conditions, id).toEqual(conditions);
    }
  });

  it("le contrôle d'étanchéité annuel ne s'éteint sur aucun silence", () => {
    // L'obligation par défaut du domaine froid : c'est elle qui tient quand le
    // dirigeant ne connaît ni sa charge en tonnes équivalent CO2 — ce chiffre
    // ne se lit pas sur la porte d'une chambre froide — ni la présence d'un
    // système de détection. Toutes ses conditions doivent donc être de la
    // forme qui survit à l'absence de réponse.
    const o = obligationParId("froid-controle-etancheite-annuel");
    expect(o?.conditions?.length).toBe(5);
    expect(
      o?.conditions?.every((c) => c.type === "equipement_propriete_infirmee"),
    ).toBe(true);
  });

  it("aucune référence ne fonde une obligation sur un texte abrogé", () => {
    // Le règlement (UE) 517/2014 a été abrogé le 11 mars 2024 par le
    // 2024/573. R. 543-79 et l'arrêté du 29 février 2016 le visent encore ;
    // le référentiel, jamais — une note peut dire qu'il est abrogé, une
    // `reference` ne peut pas s'y adosser.
    for (const o of obligationsConformite) {
      for (const ref of o.referencesLegales) {
        expect(ref.reference, o.id).not.toContain("517/2014");
      }
    }
  });

  it("l'allowlist ne contient que des obligations réellement existantes", () => {
    for (const id of CONDITIONS_STRICTES_JUSTIFIEES) {
      const o = obligationParId(id);
      expect(o, id).toBeDefined();
      expect(o?.conditions?.length, id).toBeGreaterThan(0);
    }
  });

  it("les obligations bornées à l'audit 2026-08 portent bien leur condition", () => {
    const attendus: [string, string][] = [
      ["aeration-habitation-vmc-gaz-annuelle", "estVmcGaz"],
      ["cuisson-erp-extinction-automatique-annuelle", "aExtinctionAutomatique"],
      ["levage-vgp-semestrielle-personnes", "sertAuLevageDePersonnes"],
      ["levage-vgp-accessoires-annuelle", "aAccessoiresDeLevage"],
      ["esp-requalification-decennale", "estSoumisSuiviEnService"],
      ["esp-inspection-periodique", "estSoumisSuiviEnService"],
    ];
    for (const [id, propriete] of attendus) {
      const o = obligationParId(id);
      expect(o, id).toBeDefined();
      expect(
        o?.conditions?.some(
          (c) =>
            c.type === "equipement_propriete_non_infirmee" &&
            c.propriete === propriete,
        ),
        `${id} attend une condition non infirmée sur ${propriete}`,
      ).toBe(true);
    }
  });
});

describe("référentiel conformité — éclairage de sécurité en lieu de travail", () => {
  /**
   * Avant l'amendement 2026-08-21, la seule obligation visant la catégorie
   * `BAES` portait `erp: true`. Un employeur non-ERP — le bureau tertiaire à
   * qui le pré-remplissage suggère précisément un BAES — déclarait
   * l'équipement et n'obtenait aucune échéance.
   */
  const IDS_TRAVAIL = [
    "incendie-travail-eclairage-securite-essai-mensuel",
    "incendie-travail-eclairage-securite-autonomie-semestrielle",
  ];

  it("la catégorie BAES est couverte hors régime ERP", () => {
    // LE FILTRE PORTE SUR CE QUI DÉCLENCHE, PAS SUR CE QUI EST CITÉ, et la
    // distinction a été posée le 2026-09-02 parce que la liste ci-dessus
    // rougissait sans qu'aucune régression n'ait eu lieu. `categoriesCitees()`
    // rend `equipementsEnContexte` pour un porteur établissement, or ce champ
    // n'est pas un déclencheur : il dit au dirigeant quels appareils sont
    // concernés par une ligne qui existe de toute façon. Quatre obligations du
    // domaine `signalisation` nomment `BAES` à ce titre — un bloc à
    // pictogramme est un signal lumineux au sens de l'annexe I de l'arrêté du
    // 4 novembre 1993 —, et les compter ici aurait fait dire au test qu'elles
    // couvrent la catégorie alors qu'elles ne s'y accrochent pas.
    //
    // Ce que le test garde est ce qu'il a toujours voulu garder : un employeur
    // non-ERP qui DÉCLARE un BAES reçoit une échéance de son appareil. Écrit
    // ainsi, il ne se répare plus en recopiant la sortie à chaque obligation
    // qui mentionne un bloc en contexte.
    const horsErp = obligationsConformite.filter(
      (o) =>
        estPorteeParEquipement(o) &&
        o.categoriesEquipement.includes("BAES") &&
        o.typologies.travail === true,
    );
    expect(horsErp.map((o) => o.id).sort()).toEqual([...IDS_TRAVAIL].sort());
  });

  it("les deux fréquences de l'article 11 sont encodées distinctement", () => {
    const mensuel = obligationParId(IDS_TRAVAIL[0]);
    const semestriel = obligationParId(IDS_TRAVAIL[1]);
    expect(mensuel?.periodicite).toBe("mensuelle");
    expect(semestriel?.periodicite).toBe("semestrielle");
    // L'employeur en est le réalisateur : l'article 11 le désigne nommément.
    expect(mensuel?.realisateurs).toEqual(["exploitant"]);
    expect(semestriel?.realisateurs).toEqual(["exploitant"]);
  });

  const IDS_ERP = [
    "incendie-erp-eclairage-securite-essai-mensuel",
    "incendie-erp-eclairage-securite-autonomie-semestrielle",
  ];

  it("elles s'excluent du régime ERP, qui porte les siennes", () => {
    // Un même parc de blocs ne doit pas produire deux séries d'échéances sur
    // un établissement cumulant travail et ERP (arrêté du 14 décembre 2011,
    // art. 1er : le règlement ERP gouverne les locaux accessibles au public).
    for (const id of IDS_TRAVAIL) {
      expect(obligationParId(id)?.typologies.erp, id).toBe(false);
    }
    expect(obligationParId("incendie-erp-baes-annuelle")?.typologies.erp).toBe(
      true,
    );
  });

  it("l'ERP porte les mêmes deux fréquences, fondées sur EC 14 § 3", () => {
    // Le trou que ce test ferme : les deux obligations « travail » sortent du
    // régime ERP, et rien n'y prenait leur place. Un restaurant ou un commerce
    // — les deux secteurs visés par le produit — ne recevait qu'une ligne
    // annuelle là où l'exploitant doit quatorze actes par an.
    const mensuel = obligationParId(IDS_ERP[0]);
    const semestriel = obligationParId(IDS_ERP[1]);
    expect(mensuel?.periodicite).toBe("mensuelle");
    expect(semestriel?.periodicite).toBe("semestrielle");
    for (const o of [mensuel, semestriel]) {
      expect(o?.realisateurs).toEqual(["exploitant"]);
      expect(o?.typologies.erp).toBe(true);
      expect(o?.referencesLegales[0].reference).toContain("EC 14");
    }
  });

  it("la partition est exacte : jamais les deux jeux sur un même établissement", () => {
    // C'est l'exclusion en ET de `matchTypologie` qui le garantit. Le vérifier
    // ici plutôt que de s'en remettre à la lecture : un `erp: false` retiré
    // par mégarde ferait doubler chaque échéance de bloc autonome sur tout
    // restaurant, sans qu'aucun autre test ne s'en aperçoive.
    const erpEtTravail = {
      id: "etab-mixte",
      effectifSurSite: 8,
      estEtablissementTravail: true,
      estERP: true,
      estIGH: false,
      estHabitation: false,
      typeErp: "N" as const,
      categorieErp: "N5" as const,
      classeIgh: null,
      familleHabitation: null,
      comporteLocauxSommeilPublic: null,
      personnesPresentesHabituellement: null,
      manipuleMatieresR422722: null,
    };
    const parc = [
      { id: "eq-baes", libelle: "BAES", categorie: "BAES" as const, caracteristiques: null },
    ];
    const ids = determineObligationsApplicables(erpEtTravail, parc).map(
      (a) => a.obligation.id,
    );
    for (const id of IDS_TRAVAIL) expect(ids, id).not.toContain(id);
    for (const id of IDS_ERP) expect(ids, id).toContain(id);

    const employeurSeul = { ...erpEtTravail, estERP: false, typeErp: null, categorieErp: null };
    const idsEmployeur = determineObligationsApplicables(employeurSeul, parc).map(
      (a) => a.obligation.id,
    );
    for (const id of IDS_TRAVAIL) expect(idsEmployeur, id).toContain(id);
    for (const id of IDS_ERP) expect(idsEmployeur, id).not.toContain(id);
  });

  it("elles se fondent sur l'arrêté du 14 décembre 2011, pas sur R. 4227-14 seul", () => {
    // R. 4227-14 impose l'éclairage de sécurité mais ne fixe aucune
    // périodicité : il renvoie à un arrêté. Citer le code seul en article
    // fondateur reviendrait à lui faire dire ce qu'il ne dit pas.
    for (const id of IDS_TRAVAIL) {
      const fondateur = obligationParId(id)?.referencesLegales[0];
      expect(fondateur?.source, id).toBe("ARRETE");
      expect(fondateur?.reference, id).toContain("14 décembre 2011");
      expect(fondateur?.note?.length ?? 0, id).toBeGreaterThan(0);
    }
  });
});

describe("référentiel conformité — forme normalisée des typologies", () => {
  it("aucune obligation ne liste les 5 catégories ERP (écrire `erp: true`)", () => {
    // `erp: { categories: ["N1"…"N5"] }` et `erp: true` ne sont PAS
    // équivalents : la première forme exige en plus une `categorieErp` non
    // nulle et crée donc un faux négatif sur tout ERP dont la catégorie n'est
    // pas renseignée. Une restriction qui n'exclut rien ne doit pas s'écrire
    // comme une restriction.
    for (const o of obligationsConformite) {
      if (typeof o.typologies.erp === "object" && o.typologies.erp.categories) {
        expect(
          o.typologies.erp.categories.length,
          `${o.id} : liste exhaustive de catégories, écrire \`erp: true\``,
        ).toBeLessThan(CATEGORIES_ERP.length);
      }
    }
  });

  it("aucune obligation ne liste tous les types d'ERP (écrire `erp: true`)", () => {
    // Même raisonnement que pour les catégories : une restriction de type qui
    // n'exclut aucun type exige en plus que `typeErp` soit renseigné, et crée
    // donc un faux négatif silencieux sur tout ERP dont le type est inconnu.
    for (const o of obligationsConformite) {
      if (typeof o.typologies.erp === "object" && o.typologies.erp.types) {
        expect(
          o.typologies.erp.types.length,
          `${o.id} : liste exhaustive de types, écrire \`erp: true\``,
        ).toBeLessThan(TYPES_ERP.length);
      }
    }
  });

  it("`types` et `typesExclus` ne cohabitent jamais sur une même obligation", () => {
    // Les deux écrivent la MÊME frontière, dans les deux sens. Les poser
    // ensemble, c'est se garantir qu'elles divergeront à la première
    // correction — et la divergence serait muette : le moteur les évalue en
    // ET, donc la plus étroite gagnerait sans rien dire.
    for (const o of obligationsConformite) {
      if (typeof o.typologies.erp !== "object") continue;
      const { types, typesExclus } = o.typologies.erp;
      expect(
        Boolean(types) && Boolean(typesExclus),
        `${o.id} : \`types\` et \`typesExclus\` sur la même obligation`,
      ).toBe(false);
    }
  });

  it("les types exclus existent dans l'enum, et ne les excluent jamais tous", () => {
    // Symétrique du test sur `types`, et pour la raison inverse : une
    // exclusion qui porte sur tous les types n'exclut pas « tout ERP », elle
    // exclut tout ERP DONT LE TYPE EST CONNU — l'obligation ne resterait qu'à
    // ceux qui n'ont rien précisé. C'est une typologie qui ne veut rien dire.
    for (const o of obligationsConformite) {
      if (typeof o.typologies.erp !== "object") continue;
      for (const t of o.typologies.erp.typesExclus ?? []) {
        expect(TYPES_ERP, o.id).toContain(t);
      }
      if (o.typologies.erp.typesExclus) {
        expect(
          o.typologies.erp.typesExclus.length,
          `${o.id} : exclusion de tous les types`,
        ).toBeLessThan(TYPES_ERP.length);
      }
    }
  });

  it("une restriction de catégorie ou de classe n'est jamais vide", () => {
    for (const o of obligationsConformite) {
      if (typeof o.typologies.erp === "object") {
        // `erp: {}` n'exprime rien : soit une restriction est posée, soit on
        // écrit `erp: true`.
        const { categories, types, typesExclus } = o.typologies.erp;
        expect(
          (categories?.length ?? 0) +
            (types?.length ?? 0) +
            (typesExclus?.length ?? 0),
          `${o.id} : \`erp: {}\` sans restriction, écrire \`erp: true\``,
        ).toBeGreaterThan(0);
        if (categories) expect(categories.length, o.id).toBeGreaterThan(0);
        if (types) expect(types.length, o.id).toBeGreaterThan(0);
        if (typesExclus) expect(typesExclus.length, o.id).toBeGreaterThan(0);
      }
      if (typeof o.typologies.igh === "object") {
        expect(o.typologies.igh.classes.length, o.id).toBeGreaterThan(0);
      }
    }
  });
});

describe("référentiel conformité — version et empreinte", () => {
  // Le référentiel vit en TypeScript (ADR-003) mais ses effets sont écrits en
  // base : chaque `Verification` fige une périodicité et un libellé. Sans
  // repère de version, une correction du référentiel ne se propageait qu'au
  // hasard d'une mutation d'équipement, et deux établissements identiques
  // pouvaient afficher deux échéances différentes selon la date de leur
  // dernière modification.
  //
  // Ce test est le garde-fou : il échoue dès qu'on touche au contenu sans
  // incrémenter `REFERENTIEL_VERSION`. Pour le corriger, incrémentez la
  // version PUIS recopiez l'empreinte que le message d'échec affiche.
  // 87 depuis le 2026-08-27 : deux obligations portées par l'établissement
  // (ADR-022) — PE 4 § 2 et R. 4222-20.
  // 84 depuis le 2026-08-27 : 85 au départ, +2 obligations portées par
  // l'établissement (PE 4 § 2, R. 4222-20), −3 fragments de ces mêmes
  // articles qu'elles absorbent (ADR-022).
  // 98 depuis le 2026-08-31 : +13 au lot 7, les trois premiers domaines qui ne
  // naissent d'aucun équipement. Formation à la sécurité (3, dont la première
  // ligne de catalogue due à TOUS les salariés), conduite d'équipements (2),
  // santé au travail (5, dont VIP et SIR), premiers secours (3). Le compte
  // saute de treize d'un coup parce que le dépouillement de quatre textes a été
  // livré en un lot, pas parce qu'un article a été découpé en morceaux : chaque
  // obligation cite un article distinct ou un alinéa distinct, et le corpus le
  // montre article par article.
  // 100 depuis la revue du 2026-08-31 : +2 dérogations de périodicité que le
  // premier passage avait manquées, et dont les `notesInternes` affirmaient le
  // contraire. `R. 4624-17` ramène la VIP à trois ans au plus pour les
  // travailleurs handicapés, les titulaires d'une pension d'invalidité et les
  // travailleurs de nuit ; `R. 4451-82` porte le suivi renforcé à un an pour la
  // catégorie A des rayonnements ionisants, et y supprime la visite
  // intermédiaire. Deux populations pour lesquelles le référentiel annonçait
  // une échéance trop tardive.
  // L'empreinte bouge sans que le compte change : le libellé de
  // `sante-travail-etablissement-liste-postes-risques` porte désormais le
  // conditionnel du III de R. 4624-23 (« s'il le juge nécessaire »). Le libellé
  // entre dans l'empreinte parce qu'il s'affiche au calendrier — c'est
  // exactement ce qu'on veut voir bouger.
  //
  // `REFERENTIEL_VERSION` n'est délibérément pas incrémentée ici : le lot 7, le
  // palier 1 et le lot 8 ont posé la même valeur chacun de leur côté, et c'est
  // la session d'intégration qui la tranche pour les trois.
  
  // +16 au lot 8 (2026-08-31), qui n'annonce PAS le total : deux autres lots
  // touchent ce compte le même jour, et chacun ne connaît que son propre
  // apport. Ce que celui-ci ajoute, et rien d'autre : organisation de la
  // prévention (3 — salarié désigné, CSE, règlement intérieur), information
  // des travailleurs (2 — affichages de D. 4711-1, avis d'accès au DUERP),
  // locaux sociaux (4 — sanitaires, eau potable, et les deux régimes de
  // restauration qui se partagent le seuil de cinquante), co-activité (1 —
  // protocole de sécurité de chargement), santé au travail (2 — adhésion au
  // service, fiche d'entreprise) et formation à la sécurité (3 — manutention,
  // travail sur écran, formation santé-sécurité du CSE, et formation en santé
  // au travail du salarié désigné compétent). Quatre domaines entrent avec lui.
  // La seizième est arrivée après coup : la relecture des trois articles du
  // renvoi de L. 4644-1 a montré que la formation du salarié désigné et celle
  // du membre du CSE sont deux actes sous un même régime, et non un seul.
  // L'empreinte bouge deux fois sans que le compte change, et les deux fois
  // parce qu'une contre-vérification a corrigé une ligne de ce lot :
  //
  //  1. le réalisateur de `sante-travail-etablissement-fiche-entreprise` passe
  //     de `professionnel_sante_travail` à `equipe_pluridisciplinaire`, la
  //     valeur que le lot 7 a ajoutée à l'enum après que ce lot eut signalé
  //     qu'aucune valeur existante ne disait ce que R. 4624-46 confie à
  //     l'équipe ;
  //  2. le libellé de `sante-travail-etablissement-adhesion-spst` cessait de
  //     dire « adhésion » là où L. 4622-1 écrit « organisent » — l'adhésion à un
  //     service interentreprises est une modalité, pas l'obligation.
  //
  // Réalisateur et libellé entrent tous deux dans l'empreinte parce qu'ils
  // s'affichent au calendrier et décident de ce que le dirigeant croit devoir
  // faire — c'est exactement ce qu'on veut voir bouger.
  //
  //
  // 2026-09-01 : 116 → 121, depuis QUATRE branches écrites en parallèle, et
  // c'est la cinquième remesure de la journée. Sont entrés :
  // `elec-salarie-habilitation` au catalogue des titres (`R. 4544-10`), le
  // contrôle semestriel des gaines de recyclage (arrêté du 8 octobre 1987
  // art. 4 b), les trois obligations de l'arrêté du 31 janvier 1986
  // (habitation), et l'inspection ESP portée de trois à quatre ans avec son
  // plafond de premier cycle dans `premierDelai`. La campagne de traçabilité
  // du même jour a recalé sept fondements et rattaché des dizaines
  // d'articles : elle ne déplace PAS l'empreinte, et le point suivant dit
  // pourquoi.
  //
  // L'EMPREINTE A ÉTÉ REMESURÉE À CHAQUE INTÉGRATION, jamais recopiée d'une
  // branche. Trois branches l'ont vue à 117, chacune juste chez elle et fausse
  // une fois réunies. Les commentaires que chacune portait sont ce qui a
  // empêché de prendre l'une pour l'autre.
  //
  // CE QU'ELLE NE COUVRE PAS, et qu'il faut savoir avant de s'y fier :
  // `empreinteReferentiel()` exclut `referencesLegales`, `description` et
  // `notesInternes`. Le fondement légal de tout le référentiel peut être
  // réécrit sans qu'elle bouge d'un chiffre — c'est exactement ce qu'a fait la
  // campagne de traçabilité, légitimement. Une empreinte stable n'est donc PAS
  // une preuve que rien n'a changé.
  //
  // Et ce qu'elle couvre depuis aujourd'hui seulement : `premierDelai` en a
  // d'abord été absent. Le champ posé, sa valeur écrite, la suite passait au
  // vert — alors qu'il déplace la date de première occurrence d'un équipement
  // neuf. Tout champ qui influence une échéance entre au hachage, et la preuve
  // se fait en changeant sa valeur : si l'empreinte ne bouge pas, il y manque.
  //
  // 2026-09-02 : 135 → 144. Le lot « signalisation » ouvre l'arrêté du
  // 4 novembre 1993, que ce dépôt n'avait jamais lu, et en tire neuf
  // obligations sur un domaine neuf. Sept articles sur les onze déclarés
  // manquants au dépouillement sortent de la liste de `corpus.test.ts` ;
  // quatre y restent, chacun avec sa raison. Deux des neuf lignes seulement
  // portent un rythme — la semestrielle des signaux lumineux et acoustiques et
  // l'annuelle des alimentations de secours —, les sept autres sont des états
  // permanents en `periodicite: "autre"`, parce que l'article 15 n'impose sur
  // les panneaux, les couleurs et les bandes qu'un entretien « régulier ».
  // C'est le point où le lot pouvait se tromper : le guide professionnel qui
  // l'a déclenché annonçait le semestre pour « les moyens et dispositifs de
  // signalisation », alors que le « et notamment » du texte le réserve à ce
  // qui se déclenche.
  //
  // 2026-09-02 : 144 → 145. Le lot machines ouvre la SECONDE branche de
  // `R. 4323-23` — l'arrêté du 5 mars 1993 —, que le dépôt citait depuis la
  // veille comme « non instruite nulle part » sans l'avoir encodée. Une seule
  // ligne, et c'est le produit du dépouillement, pas sa moitié : sur les onze
  // catégories d'équipements que le I de son article 1er soumet à
  // vérification trimestrielle, deux touchent les secteurs cibles — presses à
  // balles et compacteurs à déchets — et elles partagent l'acte, le rythme,
  // le réalisateur, le contenu et la consignation. Les scinder aurait produit
  // deux rendez-vous trimestriels sur une seule machine.
  //
  // C'est la première échéance TRIMESTRIELLE de criticité 5 portée par un
  // équipement de travail hors levage, et le point où le lot pouvait se
  // tromper n'est pas le chiffre mais l'ASSIETTE : une catégorie nommée
  // « machine » aurait attiré le pétrin et la trancheuse, que l'arrêté ne vise
  // pas, et leur aurait réclamé quatre visites par an. Le nom de la catégorie
  // — `COMPACTEUR_PRESSE_DECHETS_MOTORISE` — porte le proviso du I, ce qui
  // évite d'inventer un attribut d'équipement pour la motorisation.
  //
  // 152 depuis le 2026-09-04, lot « protection individuelle ». Deux lignes de
  // plus, sur le premier domaine dont AUCUNE obligation ne s'est déduite d'un
  // équipement existant : le dépouillement de la section 9 a créé la catégorie
  // avant l'obligation, et non l'inverse.
  //  * `epi-etablissement-consigne-utilisation` (`R. 4323-105`) — le seul écrit
  //    de toute la section, dû dès qu'un travailleur porte un équipement de
  //    protection, gants compris ; état permanent, porteur établissement ;
  //  * `epi-verification-generale-periodique` (arrêté du 19 mars 1993, art. 1er)
  //    — douze mois, personne qualifiée, sur les TROIS catégories que l'arrêté
  //    nomme et pas sur `EPI`, qui garde le casque et les gants. C'est la
  //    scission qui a permis d'encoder sans sur-appliquer.
  //
  // 150 depuis le 2026-09-04, lot « les sept articles du Livre II ». Quatre
  // lignes de plus, et elles ne se ressemblent pas :
  //  * `eclairage-etablissement-regles-entretien` (`R. 4223-11`) — le document
  //    consignant les règles d'entretien de l'éclairage, état permanent, et le
  //    seul domaine neuf du lot (`eclairage`) ;
  //  * `prevention-etablissement-liste-personnes-qualifiees` (`R. 4323-24`) —
  //    la liste tenue à la disposition de l'inspection du travail, état
  //    permanent elle aussi ;
  //  * `incendie-erp-alarme-verification-hebdomadaire` (`MS 69`) — le contrôle
  //    hebdomadaire de l'alarme par l'exploitant ;
  //  * `aeration-erp-filtres-visite-periodique` (`CH 39 § 3`) — la visite
  //    trimestrielle des filtres de ventilation par l'utilisateur.
  //
  // Les deux dernières sont les PREMIÈRES lignes du référentiel bornées aux
  // quatre premières catégories d'ERP par lecture de leur champ, et non par
  // héritage d'une sur-application ancienne. C'est le point du lot : un ERP de
  // 3ᵉ catégorie recevait jusqu'ici moins d'obligations qu'un de 5ᵉ, parce que
  // le Livre II n'était dépouillé qu'à moitié quand le Livre III l'était en
  // entier.
  const EMPREINTE_ATTENDUE = "154-f79cfff96b4eff09";

  it("l'empreinte du contenu correspond à la version déclarée", () => {
    expect(
      empreinteReferentiel(),
      "Le contenu du référentiel a changé. Incrémentez " +
        "`REFERENTIEL_VERSION` dans `index.ts`, puis mettez `EMPREINTE_ATTENDUE` " +
        "à jour avec la valeur reçue ci-dessus. Les calendriers déjà générés " +
        "seront réconciliés automatiquement à la version suivante.",
    ).toBe(EMPREINTE_ATTENDUE);
  });

  it("la version est datée et incrémentable", () => {
    expect(REFERENTIEL_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });

  /**
   * Le compte exact, à part de l'empreinte.
   *
   * L'empreinte le porte déjà en préfixe, mais elle échoue pour n'importe
   * quelle modification : son message dit « le contenu a changé », jamais
   * « il y a deux obligations de moins qu'hier ». Les deux autres tests de
   * volume (`conformite.test.ts`) ne posent que des planchers — 25 et 60 —
   * qu'une suppression accidentelle de vingt lignes passerait sans bruit.
   *
   * Ce test-ci nomme le nombre. Quand il casse, on sait immédiatement s'il
   * s'agit d'un ajout voulu ou d'une disparition.
   */
  /**
   * `Obligation.id` dit « Jamais réutilisé ». Voici ce qui le fait respecter.
   *
   * Un id survit à son obligation : `Verification.obligationId` le porte en
   * base, et la réconciliation s'en sert pour retrouver ses lignes. Réemployer
   * un id retiré rattacherait les lignes de l'ancienne obligation à la
   * nouvelle — leurs dates, leurs statuts, et les rapports qui y pendent.
   * Silencieusement : aucune contrainte de base ne s'y oppose, et le
   * référentiel vivant en TypeScript, aucune clé étrangère non plus.
   */
  it("aucun identifiant retiré n'est réemployé", () => {
    const vivants = new Set(obligationsConformite.map((o) => o.id));
    const reemployes = Object.keys(OBLIGATIONS_RETIREES).filter((id) =>
      vivants.has(id),
    );

    expect(
      reemployes,
      "Un identifiant listé dans `OBLIGATIONS_RETIREES` est réemployé par une obligation vivante. Les lignes `Verification` de l'ancienne obligation seraient rattachées à la nouvelle, avec leurs rapports.",
    ).toEqual([]);
  });

  it("chaque identifiant retiré dit où son contenu est passé", () => {
    // Un id retiré sans explication laisse un lecteur qui le trouve en base
    // devant une impasse.
    for (const [id, r] of Object.entries(OBLIGATIONS_RETIREES)) {
      expect(r.motif.length, id).toBeGreaterThan(80);
    }
  });

  it("l'obligation absorbante d'un id retiré existe encore", () => {
    // Une chaîne de retraits (A absorbé par B, B retiré plus tard) laisserait
    // sinon un `absorbePar` qui pointe dans le vide — et le report d'historique
    // que ce champ prépare échouerait silencieusement.
    const vivants = new Set(obligationsConformite.map((o) => o.id));
    for (const [id, r] of Object.entries(OBLIGATIONS_RETIREES)) {
      if (r.absorbePar === null) continue;
      expect(
        vivants.has(r.absorbePar),
        `${id} est absorbé par ${r.absorbePar}, qui n'existe pas (ou plus) dans le référentiel.`,
      ).toBe(true);
    }
  });

  /**
   * Le trou que ce test ferme, et il était réel.
   *
   * Rien n'obligeait à INSCRIRE un retrait. Retirer une obligation sans
   * l'inscrire ne faisait échouer que l'empreinte et le compte — deux tests
   * dont les messages disent « mettez ce compte à jour », c'est-à-dire qui
   * invitent à les faire taire sans jamais nommer l'inscription.
   *
   * Ce n'est pas théorique : `aeration-hotte-pro-annuelle` a été retiré,
   * `prisma/schema.prisma` le documente comme le cas vécu qui a motivé la
   * colonne `referentielVersion`, et il ne figurait pas dans le registre. Il y
   * est depuis le 2026-08-27, à titre rétroactif.
   *
   * La liste ci-dessous est le seul point d'entrée légitime pour un id sorti
   * du référentiel : elle DOIT grandir à chaque retrait.
   */
  it("tout identifiant cité dans le corpus ou le produit est vivant ou déclaré retiré", () => {
    const vivants = new Set(obligationsConformite.map((o) => o.id));
    const declares = new Set(Object.keys(OBLIGATIONS_RETIREES));

    // Les renvois du corpus sont la source la plus fiable d'ids « attendus » :
    // ils sont contraints par le type et vérifiés par `corpus.test.ts`.
    const cites = new Set(
      CORPUS.flatMap((c) =>
        c.articles.flatMap((a) =>
          a.statut === "retenu" ? [...a.obligations] : [],
        ),
      ),
    );

    const fantomes = [...cites].filter(
      (id) => !vivants.has(id) && !declares.has(id),
    );

    expect(
      fantomes,
      "Un identifiant est cité sans exister ni figurer dans `OBLIGATIONS_RETIREES`. Soit l'obligation a été retirée sans être inscrite au registre — auquel cas l'id peut être réemployé et rattacher silencieusement d'anciennes lignes `Verification` —, soit l'id est une invention.",
    ).toEqual([]);
  });

  it("le référentiel compte exactement le nombre d'obligations annoncé", () => {
    expect(
      obligationsConformite.length,
      "Le nombre d'obligations a changé. Si c'est voulu, mettez ce compte à " +
        "jour — ainsi que `EMPREINTE_ATTENDUE` et `.claude/CLAUDE.md`, qui " +
        "l'annoncent tous les deux.",
    ).toBe(154);
  });

  it("l'empreinte bouge quand une condition, une typologie ou une catégorie change", () => {
    // Le trou que ce test ferme : l'empreinte ne couvrait que l'identité et la
    // périodicité. Poser une condition sur une obligation retirait l'échéance
    // à tout un parc d'équipements sans faire bouger le hash — le garde-fou de
    // version laissait passer exactement ce qu'il existe pour attraper.
    const reference = empreinteReferentiel();
    const cible = obligationParId("levage-vgp-annuelle-charges");
    expect(cible).toBeDefined();
    if (!cible) return;

    // `levage-vgp-annuelle-charges` est portée par un équipement ; le test
    // manipule `categoriesEquipement`, qui n'existe que sur cette branche.
    expect(estPorteeParEquipement(cible)).toBe(true);
    if (!estPorteeParEquipement(cible)) return;
    const cibleEq: ObligationPorteeParEquipement = cible;

    const original = {
      conditions: cibleEq.conditions,
      typologies: cibleEq.typologies,
      categoriesEquipement: cibleEq.categoriesEquipement,
    };
    try {
      cibleEq.conditions = undefined;
      expect(empreinteReferentiel()).not.toBe(reference);

      cibleEq.conditions = original.conditions;
      cibleEq.typologies = { ...original.typologies, erp: true };
      expect(empreinteReferentiel()).not.toBe(reference);

      cibleEq.typologies = original.typologies;
      cibleEq.categoriesEquipement = [
        ...original.categoriesEquipement,
        "AUTRE",
      ];
      expect(empreinteReferentiel()).not.toBe(reference);
    } finally {
      cibleEq.conditions = original.conditions;
      cibleEq.typologies = original.typologies;
      cibleEq.categoriesEquipement = original.categoriesEquipement;
    }
    expect(empreinteReferentiel()).toBe(reference);
  });

  it("l'empreinte ne dépend pas de l'ordre d'écriture des clés", () => {
    // Corollaire : réordonner les clés d'une typologie dans le fichier source
    // ne doit pas forcer un bump de version pour rien.
    const reference = empreinteReferentiel();
    const cible = obligationParId("incendie-erp-ssi-triennale");
    expect(cible).toBeDefined();
    if (!cible) return;

    const original = cible.typologies;
    try {
      const inverse = Object.fromEntries(
        Object.entries(original).reverse(),
      ) as typeof original;
      cible.typologies = inverse;
      expect(empreinteReferentiel()).toBe(reference);
    } finally {
      cible.typologies = original;
    }
  });

  // ---------------------------------------------------------------------------
  // L'empreinte doit réagir à TOUT ce qui change le champ d'application.
  //
  // Elle ne couvrait initialement que id / périodicité / libellé /
  // réalisateurs : restreindre une obligation à certains types d'ERP ou la
  // borner par une propriété d'équipement ne la déplaçait pas, alors que ces
  // changements font apparaître ou disparaître des lignes de calendrier. Ces
  // trois tests verrouillent la correction.
  // ---------------------------------------------------------------------------

  const OBLIGATION_TEMOIN: Obligation = {
    id: "temoin-empreinte",
    domaine: "incendie",
    libelle: "Obligation témoin",
    referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 0000-0" }],
    periodicite: "annuelle",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    nature: "echeance_recurrente",
    pieceAttendue: null,
    typologies: { erp: true },
    categoriesEquipement: ["ALARME_INCENDIE"],
  };

  it("l'empreinte change quand une typologie change", () => {
    const avant = empreinteReferentiel([OBLIGATION_TEMOIN]);
    const apres = empreinteReferentiel([
      { ...OBLIGATION_TEMOIN, typologies: { erp: { types: ["O"] } } },
    ]);
    expect(apres).not.toBe(avant);
  });

  it("l'empreinte change quand la condition de locaux à sommeil change", () => {
    // LA PREUVE, ET ELLE SE FAIT EN CHANGEANT LA VALEUR. `premierDelai` a été
    // posé le 2026-09-01 sans entrer au hachage : le champ existait, sa valeur
    // était écrite, la suite passait au vert, et il déplaçait pourtant la date
    // de première occurrence. Une garde qui ne mesure pas ce qu'elle prétend
    // couvrir rassure d'autant mieux.
    //
    // `locauxSommeilPublic` décide de l'EXISTENCE de quatre lignes de
    // calendrier — la basculer de `true` à `false` retire les quatre chez un
    // hôtel et les rend chez un bureau. Il entre au hachage par
    // `canonique(o.typologies)`, ce qui est un chemin déjà couvert ; ce test
    // vérifie que ce chemin porte bien CE champ, et pas seulement les
    // régimes que le test voisin fait varier.
    const sans = empreinteReferentiel([OBLIGATION_TEMOIN]);
    const avecOui = empreinteReferentiel([
      {
        ...OBLIGATION_TEMOIN,
        typologies: { erp: true, locauxSommeilPublic: true },
      },
    ]);
    const avecNon = empreinteReferentiel([
      {
        ...OBLIGATION_TEMOIN,
        typologies: { erp: true, locauxSommeilPublic: false },
      },
    ]);
    // Les trois états se distinguent deux à deux : poser le critère bouge
    // l'empreinte, et l'inverser la rebouge. Un hachage qui ne verrait que la
    // PRÉSENCE de la clé passerait le premier et échouerait au second.
    expect(avecOui).not.toBe(sans);
    expect(avecNon).not.toBe(sans);
    expect(avecNon).not.toBe(avecOui);
  });

  it("l'empreinte change quand une condition est ajoutée", () => {
    const avant = empreinteReferentiel([OBLIGATION_TEMOIN]);
    const apres = empreinteReferentiel([
      {
        ...OBLIGATION_TEMOIN,
        conditions: [
          {
            type: "equipement_propriete_non_infirmee",
            categorie: "ALARME_INCENDIE",
            // Propriété quelconque : le test mesure l'empreinte, pas le
            // référentiel. Elle citait `dessertLocauxSommeil`, retiré le
            // 2026-09-01 avec l'attribut d'établissement qui le remplace.
            propriete: "uneProprieteQuelconque",
          },
        ],
      },
    ]);
    expect(apres).not.toBe(avant);
  });

  it("l'empreinte change quand les catégories d'équipement changent", () => {
    // Même classe que les deux tests ci-dessus : élargir
    // `categoriesEquipement` fait apparaître des lignes de calendrier sur des
    // équipements qui ne déclenchaient rien. C'était le dernier champ décidant
    // de l'existence d'une `Verification` à manquer à l'empreinte.
    const avant = empreinteReferentiel([OBLIGATION_TEMOIN]);
    const apres = empreinteReferentiel([
      {
        ...OBLIGATION_TEMOIN,
        categoriesEquipement: ["ALARME_INCENDIE", "EXTINCTEUR"],
      },
    ]);
    expect(apres).not.toBe(avant);
  });

  it("l'empreinte ne bouge pas si l'ordre des clés de typologie change", () => {
    // Réordonner `{ erp, travail }` en `{ travail, erp }` est cosmétique :
    // réclamer une réconciliation de tous les calendriers pour ça userait le
    // garde-fou jusqu'à ce que plus personne ne le lise.
    const a = empreinteReferentiel([
      { ...OBLIGATION_TEMOIN, typologies: { erp: true, travail: true } },
    ]);
    const b = empreinteReferentiel([
      { ...OBLIGATION_TEMOIN, typologies: { travail: true, erp: true } },
    ]);
    expect(b).toBe(a);
  });
});

// ---------------------------------------------------------------------------
// Veille réglementaire
//
// Le référentiel savait déjà que certains textes changeraient — mais il le
// disait en prose, dans `notesInternes`. Une note ne réveille personne : deux
// des trois rendez-vous que portait le référentiel étaient échus depuis des
// semaines sans que quiconque l'ait su, et R. 143-44 a été cité deux mois
// après sa réécriture.
//
// Ces tests sont la contrepartie du champ structuré : ils échouent le jour où
// une relecture devient due. Oui, cela veut dire qu'une suite verte peut
// rougir un matin sans qu'une ligne de code ait bougé. C'est exactement
// l'effet recherché — c'est le seul moment où l'information sert.
// ---------------------------------------------------------------------------

describe("veille — rendez-vous de relecture", () => {
  const CLE_JOUR = /^\d{4}-\d{2}-\d{2}$/;

  it("toute date de relecture est une clé de jour civil", () => {
    for (const o of obligationsConformite) {
      if (!o.relectureDue) continue;
      expect(o.relectureDue.le, o.id).toMatch(CLE_JOUR);
    }
  });

  it("tout rendez-vous porte un motif exploitable", () => {
    for (const o of obligationsConformite) {
      if (!o.relectureDue) continue;
      // Un motif qui ne dit pas quoi relire oblige à rouvrir l'enquête
      // entière le jour où l'alarme sonne.
      expect(o.relectureDue.motif.length, o.id).toBeGreaterThan(60);
    }
  });

  it("aucune relecture n'est échue", () => {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const echues = obligationsConformite
      .filter((o) => o.relectureDue && o.relectureDue.le <= aujourdHui)
      .map((o) => `${o.id} (due le ${o.relectureDue!.le}) : ${o.relectureDue!.motif}`);

    expect(
      echues,
      `Relecture(s) échue(s) au ${aujourdHui}. Relire le ou les textes sur ` +
        `Légifrance, corriger l'obligation, mettre à jour versionConstatee, ` +
        `puis retirer ou repousser relectureDue. Ne pas repousser la date ` +
        `sans avoir relu : ce test ne mesure pas le temps, il mesure une ` +
        `dette.\n\n${echues.join("\n")}`,
    ).toEqual([]);
  });

  it("une version constatée est une clé de jour civil, jamais dans le futur", () => {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    for (const o of obligationsConformite) {
      for (const r of o.referencesLegales) {
        if (!r.versionConstatee) continue;
        expect(r.versionConstatee, `${o.id} / ${r.reference}`).toMatch(CLE_JOUR);
        // Une version « en vigueur » à une date future n'a pas été constatée,
        // elle a été anticipée : c'est un rendez-vous, pas un constat.
        expect(
          r.versionConstatee <= aujourdHui,
          `${o.id} / ${r.reference} : version constatée dans le futur (${r.versionConstatee}) — ` +
            `un texte à application différée se note en relectureDue, pas en versionConstatee`,
        ).toBe(true);
      }
    }
  });
});

/**
 * Une périodicité chiffrée doit venir de quelque part.
 *
 * Les codes — travail, CCH, environnement — délèguent presque toujours le
 * chiffre à un arrêté : « selon une périodicité appropriée », « des arrêtés
 * précisent la périodicité ». Une obligation qui affiche « annuelle » en ne
 * citant qu'un article de code attribue donc un chiffre à un texte qui ne le
 * contient pas, et le dirigeant voit une date que le droit ne lui donne pas.
 *
 * L'audit du 2026-08-27 a trouvé quatre cas sur cinquante-sept. Trois étaient
 * de vrais défauts — la vérification annuelle des extincteurs en lieu de
 * travail vient de la norme NF S 61-919, pas du Code du travail ; la consigne
 * de sécurité n'a aucune échéance écrite ; la formation triennale au risque
 * chimique était une pratique INRS reconnue comme telle en note et affichée
 * quand même. Le quatrième était fondé, et figure ci-dessous.
 */
const PERIODICITE_SUR_CODE_JUSTIFIEE: Record<string, string> = {
  "incendie-travail-exercice-semestriel":
    "R. 4227-39 porte le chiffre lui-même, cas rare dans le Code du travail : " +
    "« Ces exercices et essais périodiques ont lieu au moins tous les six " +
    "mois. » Relu à la source le 2026-08-27 — c'est la seule périodicité de " +
    "toute la section R. 4227-28 à R. 4227-41.",
  "elec-salarie-attestation-medicale-voisinage":
    "R. 4544-11-1 porte le chiffre dans sa première phrase : « L'attestation " +
    "mentionnée aux articles R. 4544-10 et R. 4544-11, **d'une validité de " +
    "cinq ans**, est délivrée par le médecin du travail à l'issue d'un examen " +
    "médical qu'il réalise. » Relu à la source le 2026-08-27, version en " +
    "vigueur du 2025-10-01 (décret n° 2025-355 du 18 avril 2025). " +
    "Contraste à garder en tête : l'habilitation elle-même n'a AUCUN chiffre " +
    "— R. 4544-10 renvoie aux modalités des normes, que R. 4544-3 qualifie de " +
    "recommandées — et c'est pourquoi elle est passée à `autre` (ADR-023 § 6).",
  "ascenseur-rapport-annuel-activite":
    "Le CCH porte l'adjectif lui-même, au III de R. 134-7 : « En outre, " +
    "l'entreprise remet au propriétaire un RAPPORT ANNUEL D'ACTIVITÉ auquel " +
    "est annexé le contenu du carnet d'entretien lorsque celui-ci est établi " +
    "sous forme électronique. » Article rouvert à la source le 2026-09-01, " +
    "version en vigueur du 2026-04-01 (décret n° 2026-166 du 4 mars 2026). " +
    "Ce n'est ni un plafond ni un renvoi : le texte ne dit pas « au moins une " +
    "fois par an » et ne laisse à aucun tiers le soin de fixer le délai — " +
    "c'est la différence avec les quatre cas de la section B du cadrage du " +
    "2026-09-01. R. 134-10 le redit à l'identique pour le propriétaire qui " +
    "entretient par ses propres moyens, « dans les conditions fixées au III " +
    "de l'article R. 134-7 ». L'arrêté du 18 novembre 2004, qui porte les " +
    "autres rythmes de l'entretien d'ascenseur, ne connaît pas ce rapport : " +
    "son annexe ne cadence que des opérations techniques.",

  // ---------------------------------------------------------------------------
  // Lot 7 — les cinq périodicités chiffrées du dépouillement du 2026-08-31.
  //
  // Treize obligations sont entrées, cinq seulement portent un chiffre. Les
  // huit autres sont à `autre`, et c'est le résultat du dépouillement, pas une
  // paresse : le chapitre R. 4141-* ne chiffre RIEN, R. 4323-55 dit
  // « réactualisée chaque fois que nécessaire », et aucun des trois articles de
  // la section secours ne porte de durée. Le « recyclage SST tous les
  // vingt-quatre mois » vient du dispositif INRS/CNAM et le « recyclage CACES à
  // cinq ans » des recommandations de l'assurance maladie — ni l'un ni l'autre
  // n'est du droit, et ni l'un ni l'autre n'est encodé.
  //
  // ⚠ TROIS DES CINQ SONT DES PLAFONDS, PAS DES RYTHMES, et c'est la nuance à
  // ne pas perdre. R. 4624-16 et R. 4624-28 écrivent « qui ne peut excéder » et
  // « qui ne peut être supérieure à » : le médecin du travail fixe le délai
  // réel, plus court. Le chiffre encodé est la borne extérieure — la date
  // au-delà de laquelle l'employeur est nécessairement en défaut. Ce n'est
  // défendable que parce que `TitreSalarie.echeanceLe`, déclaré par
  // l'employeur, prime sur tout calcul : un dirigeant dont le médecin a fixé
  // trois ans saisit trois ans. Sans cette échappatoire, il aurait fallu
  // passer à `autre` et ne rien dire du tout.
  // ---------------------------------------------------------------------------
  "sante-travail-salarie-vip":
    "R. 4624-16 porte le chiffre : « Le travailleur bénéficie d'un " +
    "renouvellement de la visite d'information et de prévention initiale […] " +
    "selon une périodicité **qui ne peut excéder cinq ans**. » Relu à la " +
    "source le 2026-08-31, version en vigueur du 2017-01-01. PLAFOND : la " +
    "phrase suivante ajoute que « ce délai […] est fixé par le médecin du " +
    "travail dans le cadre du protocole mentionné à l'article L. 4624-1 ».",
  "sante-travail-salarie-sir":
    "R. 4624-28 porte le chiffre : renouvellement « effectuée par le médecin " +
    "du travail selon une périodicité qu'il détermine et **qui ne peut être " +
    "supérieure à quatre ans** ». Relu à la source le 2026-08-31, version en " +
    "vigueur du 2017-01-01. PLAFOND, comme la VIP.",
  "sante-travail-salarie-sir-visite-intermediaire":
    "R. 4624-28, seconde phrase : « Une visite intermédiaire est effectuée " +
    "par un professionnel de santé mentionné au premier alinéa de l'article " +
    "L. 4624-1 **au plus tard deux ans** après la visite avec le médecin du " +
    "travail. » Relu à la source le 2026-08-31. PLAFOND, et son point de " +
    "départ est la visite du MÉDECIN, non la précédente visite intermédiaire " +
    "— nuance que `Periodicite` n'exprime pas.",
  "sante-travail-etablissement-liste-postes-risques":
    "R. 4624-23, III porte le chiffre, et c'est la seule périodicité FERME du " +
    "lot 7 : la liste des postes à risques particuliers « est transmise au " +
    "service de prévention et de santé au travail, tenue à disposition […] et " +
    "**mise à jour tous les ans** ». Relu à la source le 2026-08-31, version " +
    "en vigueur du 2026-04-10 (décret n° 2026-253 du 8 avril 2026). Ce décret " +
    "a été dépouillé le 2026-09-01 : il ne touche PAS le III, il supprime sept " +
    "mots au 2° du I. Cette entrée classait l'article en tête du référentiel " +
    "par sa fraîcheur ; le rang n'y est plus écrit, et la date en vigueur " +
    "ci-dessus dit tout ce qu'il disait d'utile.",
  "conduite-salarie-attestation-medicale":
    "R. 4323-56 porte le chiffre, dans les mêmes termes que R. 4544-11-1 et " +
    "par le même décret : « Cette attestation, **d'une validité de cinq ans**, " +
    "est délivrée par le médecin du travail à l'issue d'un examen médical " +
    "qu'il réalise. » Relu à la source le 2026-08-31, version en vigueur du " +
    "2025-10-01 (décret n° 2025-355 du 18 avril 2025). Contraste à garder en " +
    "tête, exactement comme en électricité : l'autorisation de conduite " +
    "elle-même n'a AUCUNE durée écrite, et elle est passée à `autre`.",

  // Les deux dérogations relevées à la revue du 2026-08-31. Elles ne s'ajoutent
  // pas aux plafonds ci-dessus : elles les CORRIGENT pour deux populations que
  // le premier passage rangeait à tort sous le régime général.
  "sante-travail-salarie-vip-adaptee":
    "R. 4624-17 porte le chiffre : le travailleur dont l'état de santé, l'âge, " +
    "les conditions de travail ou les risques le nécessitent — « notamment les " +
    "travailleurs handicapés, les travailleurs qui déclarent être titulaires " +
    "d'une pension d'invalidité et les travailleurs de nuit mentionnés à " +
    "l'article L. 3122-5 » — bénéficie de modalités adaptées « selon une " +
    "périodicité **qui n'excède pas une durée de trois ans** ». Relu à la " +
    "source le 2026-08-31, version en vigueur du 2017-01-01. PLAFOND, comme le " +
    "reste du suivi médical — mais un plafond à TROIS ans, là où " +
    "`sante-travail-salarie-vip` en annonce cinq.",
  "sante-travail-salarie-sir-categorie-a":
    "R. 4451-82 porte le chiffre, et c'est une périodicité FERME : « Pour un " +
    "travailleur classé en catégorie A, la visite médicale mentionnée à " +
    "l'article R. 4624-28 **est renouvelée chaque année**. La visite " +
    "intermédiaire mentionnée au même article n'est pas requise. » Relu à la " +
    "source le 2026-08-31, version en vigueur du 2018-07-01 (décret " +
    "n° 2018-437 du 4 juin 2018). Ni « au plus », ni « qui ne peut excéder » : " +
    "c'est un rythme, pas une borne.",
  // ---------------------------------------------------------------------------
  // Lot 8 — une seule périodicité chiffrée sur seize obligations.
  //
  // Et elle a failli ne pas y être. Le premier passage de ce lot a rendu quinze
  // obligations toutes à `autre`, en affirmant qu'aucun des textes lus n'écrivait
  // de durée. C'était faux, et le défaut venait d'un dépouillement incomplet :
  // `L. 4644-1` renvoie aux articles `L. 2315-16` À `L. 2315-18`, et seul le
  // dernier avait été ouvert. `L. 2315-17` porte le renouvellement.
  //
  // L'erreur inverse de celle que ce fichier surveille d'habitude : non pas
  // afficher un chiffre que le droit ne donne pas, mais taire un chiffre que le
  // droit donne. Une échéance absente est moins visible qu'une échéance fausse,
  // et pas moins fautive.
  // ---------------------------------------------------------------------------
  "formation-securite-salarie-cse-sst":
    "L. 2315-17 porte le chiffre : « Ces formations sont renouvelées lorsque " +
    "les représentants ont exercé leur mandat pendant **quatre ans**, " +
    "consécutifs ou non. » Relu à la source le 2026-08-31, version en vigueur " +
    "du 2026-05-28, trois mois avant ce lot. " +
    "⚠ CE N'EST NI UN RYTHME NI UN PLAFOND, mais une BORNE INTÉRIEURE, et " +
    "c'est un troisième cas de figure après les deux du lot 7 : les quatre ans " +
    "comptent du MANDAT EXERCÉ, « consécutifs ou non », et non du temps " +
    "calendaire depuis la formation. Un élu qui siège deux ans, s'interrompt " +
    "trois, puis siège deux ans encore les atteint au bout de sept années " +
    "civiles. Le produit ne modélise aucun mandat : l'échéance calculée est " +
    "juste pour un mandat continu — le cas ordinaire — et arrive EN AVANCE " +
    "pour un mandat interrompu. C'est le sens d'erreur que ce dépôt préfère " +
    "explicitement, une sur-application visible et corrigeable valant mieux " +
    "qu'un faux négatif muet ; les plafonds du lot 7 se trompent dans l'autre " +
    "sens et peuvent annoncer « à jour » à tort. `TitreSalarie.echeanceLe`, " +
    "déclaré par l'employeur, prime de toute façon sur le calcul. " +
    "Contraste à garder en tête : `formation-securite-salarie-designe-competent` " +
    "cite le MÊME article et porte `autre`, parce que la condition est écrite " +
    "pour des « représentants » exerçant un « mandat » — ce qu'un salarié " +
    "DÉSIGNÉ (R. 4644-1) n'est ni ne fait.",
};

describe("référentiel conformité — d'où vient le chiffre", () => {
  it("toute périodicité chiffrée s'appuie sur un texte qui porte un chiffre", () => {
    // Les sources capables de fixer une périodicité. Un code peut le faire,
    // mais c'est l'exception : ces cas passent par l'allowlist ci-dessus.
    const PORTEUSES = new Set(["ARRETE", "REGLEMENT_UE", "INRS"]);
    const sansSource = obligationsConformite
      .filter(
        (o) =>
          o.periodicite !== "autre" &&
          o.periodicite !== "mise_en_service_uniquement",
      )
      .filter((o) => !o.referencesLegales.some((r) => PORTEUSES.has(r.source)))
      .filter((o) => !(o.id in PERIODICITE_SUR_CODE_JUSTIFIEE))
      .map((o) => `${o.id} (${o.periodicite})`);

    expect(
      sansSource,
      "Ces obligations affichent une périodicité chiffrée sans citer de texte " +
        "qui la porte. Soit le bon texte manque à `referencesLegales`, soit la " +
        "périodicité n'a pas de fondement et doit passer à `autre`. Si un " +
        "article de code porte vraiment le chiffre, ajoutez l'obligation à " +
        "`PERIODICITE_SUR_CODE_JUSTIFIEE` avec le verbatim qui le prouve.",
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// GH 61 § 5 — la seule obligation du règlement IGH qui vise l'OCCUPANT
// ---------------------------------------------------------------------------
//
// Ce bloc existe parce que la restriction qu'il interdit a été ÉPROUVÉE EN LA
// POSANT, le 2026-09-04. Injecter `igh: { classes: ["GHW1", "GHW2"] }` sur
// cette ligne — la restriction que l'intuition suggère, puisqu'il s'agit de
// bureaux — la fait DISPARAÎTRE du calendrier d'un établissement qui déclare
// `classeIgh: "GHU"`. C'est exactement le faux négatif que GH 66 prédit : le
// classement d'une tour mixte retient « l'usage principal de l'immeuble », donc
// un plateau de bureaux peut vivre dans une tour classée GH U, et son occupant
// doit la même vérification. Sans ce test, la restriction se reposerait un jour
// sur un raisonnement plausible, et rien ne l'arrêterait.
//
// Le premier cas — classe non renseignée — ne discrimine RIEN aujourd'hui :
// `evaluerIgh` retient sur l'attribut absent. Il est là quand même, parce que
// c'est le cas nominal depuis que la question a été retirée du produit
// (2026-09-03), et qu'une dissymétrie qui bougerait le casserait.
describe("GH 61 § 5 — la quinquennale de la charge calorifique atteint l'occupant", () => {
  const bureauEnIgh: EtablissementMatching = {
    id: "etab-igh",
    effectifSurSite: 8,
    estEtablissementTravail: true,
    estERP: false,
    estIGH: true,
    estHabitation: false,
    typeErp: null,
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    comporteLocauxSommeilPublic: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
  };

  const idsDe = (etab: EtablissementMatching) =>
    determineObligationsApplicables(etab, []).map((a) => a.obligation.id);

  it("tombe sur un bureau en IGH sans classe déclarée ET SANS AUCUN ÉQUIPEMENT", () => {
    // Porteur établissement : le parc vide ne doit rien lui retirer. C'était
    // tout l'objet de l'ADR-022, et c'est ce qui distingue cette ligne des
    // deux autres obligations IGH, portées par des équipements.
    expect(idsDe(bureauEnIgh)).toContain(
      "incendie-igh-charge-calorifique-quinquennale",
    );
  });

  it("tombe aussi sur un plateau de bureaux dans une tour classée GH U", () => {
    expect(idsDe({ ...bureauEnIgh, classeIgh: "GHU" })).toContain(
      "incendie-igh-charge-calorifique-quinquennale",
    );
  });

  it("ne tombe pas sur un établissement qui n'est pas en IGH", () => {
    // La borne basse : sans ce cas, la ligne pourrait s'appliquer partout et
    // les deux cas ci-dessus passeraient quand même.
    expect(idsDe({ ...bureauEnIgh, estIGH: false })).not.toContain(
      "incendie-igh-charge-calorifique-quinquennale",
    );
  });
});

describe("GE 4 § 1 — le tableau, case par case", () => {
  /**
   * LE TABLEAU CONFIRMÉ. Relevé sur la donnée officielle de la DILA puis
   * vérifié case par case sur le FAC-SIMILÉ du Journal officiel — quinze
   * colonnes, huit lignes, sans un écart (`docs/revues/releve-ge4-tableau.md`).
   *
   * Il est écrit ici comme DONNÉE DE CONTRÔLE, et il n'est pas la copie de ce
   * que le référentiel encode : le référentiel se déduit de lui par le
   * moteur, et les tests ci-dessous comparent les deux. Ses quinze colonnes
   * sont celles de l'arrêté, pas celles de l'énumération `TypeErp` — c'est ce
   * décalage que le dernier test nomme.
   *
   * `type` porte la valeur de `TypeErp` par laquelle un tel établissement se
   * déclare dans le produit, `null` quand il n'en existe aucune.
   *
   * `hebergement` porte la SEULE colonne que le tableau dédouble : R (1) et
   * R (2) ne sont pas deux types — GN 1 § 1 n'écrit qu'un seul R — mais deux
   * régimes d'une même ligne, séparés par le fait d'héberger au sens du § 4
   * (« les seuls locaux destinés au sommeil du public la nuit »). `null` pour
   * les quatorze autres colonnes : le tableau ne les fait pas dépendre de ce
   * fait, et leur périodicité ne doit donc jamais en dépendre non plus.
   */
  const TABLEAU: {
    colonne: string;
    type: (typeof TYPES_ERP)[number] | null;
    hebergement: boolean | null;
    ans: [number, number, number, number];
  }[] = [
    { colonne: "J", type: "J", hebergement: null, ans: [3, 3, 3, 3] },
    { colonne: "L", type: "L", hebergement: null, ans: [3, 3, 3, 5] },
    { colonne: "M", type: "M", hebergement: null, ans: [3, 3, 5, 5] },
    { colonne: "N", type: "N", hebergement: null, ans: [3, 3, 5, 5] },
    { colonne: "O", type: "O", hebergement: null, ans: [3, 3, 3, 3] },
    { colonne: "P", type: "P", hebergement: null, ans: [3, 3, 3, 5] },
    {
      colonne: "R (1) avec hébergement",
      type: "R",
      hebergement: true,
      ans: [3, 3, 3, 3],
    },
    {
      colonne: "R (2) sans hébergement",
      type: "R",
      hebergement: false,
      ans: [3, 3, 3, 5],
    },
    { colonne: "S", type: "S", hebergement: null, ans: [3, 3, 5, 5] },
    { colonne: "T", type: "T", hebergement: null, ans: [3, 3, 5, 5] },
    { colonne: "U", type: "U", hebergement: null, ans: [3, 3, 3, 3] },
    { colonne: "V", type: "V", hebergement: null, ans: [5, 5, 5, 5] },
    { colonne: "W", type: "W", hebergement: null, ans: [3, 3, 5, 5] },
    { colonne: "X", type: "X", hebergement: null, ans: [3, 3, 5, 5] },
    { colonne: "Y", type: "Y", hebergement: null, ans: [3, 3, 5, 5] },
  ];

  const CATEGORIES_DU_TABLEAU = ["N1", "N2", "N3", "N4"] as const;

  /** Les sept lignes qui portent le tableau, et rien d'autre. */
  const LIGNES_GE4 = [
    "incendie-erp-visite-commission-cat1-2-triennale",
    "incendie-erp-visite-commission-cat1-2-quinquennale",
    "incendie-erp-visite-commission-cat3-triennale",
    "incendie-erp-visite-commission-cat3-quinquennale",
    "incendie-erp-visite-commission-cat4-triennale",
    "incendie-erp-visite-commission-cat4-quinquennale",
    // Les deux régimes de la colonne R en 4ᵉ catégorie (2026-09-08). La
    // septième ligne ne vient pas d'un bloc de plus du tableau, mais de la
    // seule colonne qu'il dédouble.
    "incendie-erp-visite-commission-cat4-r-avec-hebergement-triennale",
    "incendie-erp-visite-commission-cat4-r-sans-hebergement-quinquennale",
  ];

  /**
   * TROIS ÉTATS, PAS DEUX, et c'est le troisième qui porte la garantie : un
   * établissement qui n'a pas répondu n'est pas un établissement qui a
   * répondu « non ». Toutes les boucles ci-dessous parcourent les trois.
   */
  const ETATS_HEBERGEMENT = [true, false, null] as const;

  function erpSonde(
    categorieErp: EtablissementMatching["categorieErp"],
    typeErp: EtablissementMatching["typeErp"],
    comporteLocauxSommeilPublic: boolean | null = null,
  ): EtablissementMatching {
    return {
      id: "sonde-ge4",
      effectifSurSite: 10,
      estEtablissementTravail: false,
      estERP: true,
      estIGH: false,
      estHabitation: false,
      typeErp,
      categorieErp,
      classeIgh: null,
      familleHabitation: null,
      comporteLocauxSommeilPublic,
      personnesPresentesHabituellement: null,
      manipuleMatieresR422722: null,
    };
  }

  /**
   * Ce que le PRODUIT rendrait à cet établissement : les lignes de GE 4 qu'il
   * reçoit, avec leur périodicité en années. On passe par le moteur complet et
   * non par la lecture des typologies : c'est le résultat qui compte, pas
   * l'intention écrite.
   */
  function visitesRendues(
    categorieErp: EtablissementMatching["categorieErp"],
    typeErp: EtablissementMatching["typeErp"],
    hebergement: boolean | null = null,
  ): { id: string; ans: number; raisons: string[] }[] {
    return determineObligationsApplicables(
      erpSonde(categorieErp, typeErp, hebergement),
      [],
    )
      .filter((a) => LIGNES_GE4.includes(a.obligation.id))
      .map((a) => ({
        id: a.obligation.id,
        ans: Math.round(PERIODICITE_EN_JOURS[a.obligation.periodicite]! / 365),
        raisons: a.raisons,
      }));
  }

  it("les sept lignes du tableau existent, et elles sont sept", () => {
    for (const id of LIGNES_GE4) expect(obligationParId(id), id).toBeDefined();
    // Sur l'article FONDATEUR (`referencesLegales[0]`) : GE 4 est aussi cité
    // par `incendie-erp-5-visite-commission`, en second, pour montrer
    // précisément où sa périodicité N'EST PAS fixée.
    const portantGe4 = obligationsConformite.filter(
      (o) => o.referencesLegales[0].article === "GE 4",
    );
    expect(portantGe4.map((o) => o.id).sort()).toEqual([...LIGNES_GE4].sort());
  });

  it("le tableau de contrôle reproduit les cardinalités lues au Journal officiel", () => {
    // LE SEUL CONTRÔLE MÉCANIQUE DISPONIBLE SUR CE TABLEAU. Les cellules vides
    // ne sont pas encodées dans la donnée officielle — le défaut vient du
    // texte publié au JO et se retrouve dans le consolidé —, si bien qu'aucune
    // extraction ne rend les POSITIONS. Ce qui est exact, et lu sur DEUX jeux
    // de données officiels indépendants, ce sont les nombres de croix par
    // ligne. Ils contraignent le tableau : une case déplacée casse une somme.
    //
    // Ce test porte sur la donnée de contrôle ci-dessus, pas sur le
    // référentiel — il vérifie que le tableau depuis lequel on encode est bien
    // celui du Journal officiel. Les tests suivants comparent l'encodage à ce
    // tableau-là.
    const troisAns = CATEGORIES_DU_TABLEAU.map(
      (_, i) => TABLEAU.filter((c) => c.ans[i] === 3).length,
    );
    const cinqAns = CATEGORIES_DU_TABLEAU.map(
      (_, i) => TABLEAU.filter((c) => c.ans[i] === 5).length,
    );
    expect(troisAns).toEqual([14, 14, 7, 4]);
    expect(cinqAns).toEqual([1, 1, 8, 11]);
    // Et chaque catégorie se complète à quinze : aucune colonne ne porte deux
    // valeurs ni aucune.
    expect(troisAns.map((n, i) => n + cinqAns[i])).toEqual([15, 15, 15, 15]);
    expect(TABLEAU).toHaveLength(15);
  });

  it("chaque établissement reçoit EXACTEMENT une ligne de visite", () => {
    // Borne haute et borne basse à la fois, et c'est ce qui fait tenir le
    // découpage en sept : les sept typologies forment une partition des
    // 1ʳᵉ à 4ᵉ catégories. Deux lignes, et le dirigeant voit deux fois la même
    // visite à deux dates ; zéro ligne, et il ne voit rien du tout.
    //
    // `null` est dans les TROIS boucles À DESSEIN. Le type non renseigné est le
    // cas que l'énumération des types aurait perdu en silence — c'est pour lui
    // que `typesExclus` existe —, et l'hébergement non renseigné est celui que
    // la scission du 2026-09-08 aurait pu perdre : une paire de lignes dont
    // l'une exige `true` et l'autre `false` ne couvre pas le silence, sauf à
    // ce que celle qui exige `true` le retienne. C'est ce que fait
    // `evaluerLocauxSommeil`, et c'est ici qu'on l'éprouve.
    for (const cat of CATEGORIES_DU_TABLEAU) {
      for (const type of [...TYPES_ERP, null] as const) {
        for (const heb of ETATS_HEBERGEMENT) {
          const rendues = visitesRendues(cat, type, heb);
          expect(
            rendues.map((r) => r.id),
            `${cat} / type ${type ?? "non renseigné"} / hébergement ${heb ?? "non renseigné"}`,
          ).toHaveLength(1);
        }
      }
    }
    // Hors du tableau, aucune ligne : ni la 5ᵉ catégorie (Livre II écarté par
    // PE 1 § 1), ni l'ERP dont la catégorie n'est pas renseignée.
    for (const type of [...TYPES_ERP, null] as const) {
      for (const heb of ETATS_HEBERGEMENT) {
        expect(visitesRendues("N5", type, heb), `N5 / ${type}`).toEqual([]);
        expect(
          visitesRendues(null, type, heb),
          `cat. inconnue / ${type}`,
        ).toEqual([]);
      }
    }
  });

  it("aucune case n'est allongée : le produit ne dit jamais cinq là où le tableau dit trois", () => {
    // LA GARANTIE QUI COMPTE, et elle n'est pas symétrique de la suivante.
    // Porter une case à cinq ans quand le texte dit trois donne à l'exploitant
    // deux ans de délai qu'il n'a pas, et personne n'est en situation de s'en
    // apercevoir. L'erreur inverse avance une date : elle se voit.
    const allongees: string[] = [];
    for (const colonne of TABLEAU) {
      if (colonne.type === null) continue;
      CATEGORIES_DU_TABLEAU.forEach((cat, i) => {
        // Chaque colonne est sondée DANS SON PROPRE RÉGIME d'hébergement :
        // c'est ce qui rend les deux colonnes R distinguables. Les quatorze
        // autres sont sondées à `null`, comme un dossier qui n'a pas répondu.
        const rendues = visitesRendues(cat, colonne.type, colonne.hebergement);
        for (const r of rendues) {
          if (r.ans > colonne.ans[i]) {
            allongees.push(
              `${colonne.colonne} en ${cat} : tableau ${colonne.ans[i]} ans, produit ${r.ans} ans (${r.id})`,
            );
          }
        }
      });
    }
    expect(
      allongees,
      "Une case du tableau est encodée PLUS LONGUE que le texte. C'est le seul " +
        "sens d'erreur que ce référentiel refuse : il laisse un exploitant se " +
        "croire à jour, et rien dans le produit ne le détrompera.",
    ).toEqual([]);
  });

  it("plus aucune case n'est raccourcie quand le régime d'hébergement est déclaré", () => {
    // L'AUTRE SENS, celui qui se voit — il avance une date au lieu de
    // l'allonger. Il était autorisé tant qu'un manque nommé le produisait ;
    // il ne l'est plus, parce qu'il n'en reste aucun.
    //
    // Les deux manques de l'encodage du 2026-09-02 sont levés : le type J est
    // entré dans `TypeErp` le 2026-09-03 (il ne déplaçait aucune case, mais un
    // EHPAD ne pouvait pas se déclarer), et la distinction R (1) / R (2) est
    // encodée depuis le 2026-09-08 — non par une lettre de plus, que GN 1 § 1
    // n'écrit pas, mais par le croisement du type R avec l'attribut
    // d'établissement `comporteLocauxSommeilPublic`.
    const raccourcies: string[] = [];
    for (const colonne of TABLEAU) {
      if (colonne.type === null) continue;
      CATEGORIES_DU_TABLEAU.forEach((cat, i) => {
        for (const r of visitesRendues(cat, colonne.type, colonne.hebergement)) {
          if (r.ans < colonne.ans[i]) {
            raccourcies.push(`${colonne.colonne} en ${cat}`);
          }
        }
      });
    }
    expect(
      raccourcies,
      "Une case est encodée plus courte que le tableau alors que le régime " +
        "d'hébergement est déclaré. Il n'existe plus de manque de modèle pour " +
        "l'expliquer : c'est un défaut d'encodage.",
    ).toEqual([]);

    expect(TABLEAU.filter((c) => c.type === null)).toEqual([]);
    // Toute colonne du tableau se déclare désormais dans le produit, et
    // chaque valeur nommée existe bien dans l'énumération.
    for (const c of TABLEAU) expect(TYPES_ERP, c.colonne).toContain(c.type);
  });

  it("le silence sur l'hébergement garde le rythme COURT, et le dit", () => {
    // LA GARANTIE DE LA SCISSION, et la seule qui vaille d'être cassée pour
    // être crue. Deux lignes se partagent la colonne R de 4ᵉ catégorie : trois
    // ans avec hébergement, cinq sans. Un dossier qui n'a pas répondu n'est
    // dans aucun des deux cas — et c'est le rythme COURT qu'il doit recevoir,
    // parce qu'un allègement pris sur un silence ne se voit de nulle part.
    const silence = visitesRendues("N4", "R", null);
    expect(silence.map((r) => r.ans)).toEqual([3]);
    expect(silence[0].id).toBe(
      "incendie-erp-visite-commission-cat4-r-avec-hebergement-triennale",
    );
    // Et il le DIT : la raison est affichée au guide (`ChezVous`), ce qui fait
    // de cette ligne l'endroit où la question se pose à quelqu'un qui a une
    // raison d'y répondre. Sans cette phrase, l'allègement resterait hors de
    // portée d'un dossier né du parcours d'accueil, qui ne pose pas la
    // question.
    expect(silence[0].raisons.join(" · ")).toContain("à confirmer");

    // LES DEUX RÉPONSES EXPLICITES, dans les deux sens. Sans elles, la ligne
    // ci-dessus passerait encore si la scission n'avait rien scindé du tout.
    expect(visitesRendues("N4", "R", true).map((r) => r.ans)).toEqual([3]);
    expect(visitesRendues("N4", "R", false).map((r) => r.ans)).toEqual([5]);
    expect(visitesRendues("N4", "R", false)[0].id).toBe(
      "incendie-erp-visite-commission-cat4-r-sans-hebergement-quinquennale",
    );
  });

  it("la scission ne déborde pas de la 4ᵉ catégorie", () => {
    // BORNE HAUTE DE LA SCISSION. Le tableau ne sépare les deux R qu'en
    // 4ᵉ catégorie ; en 1ʳᵉ, 2ᵉ et 3ᵉ il les met tous deux à trois ans.
    // Répondre « je n'héberge pas » ne doit donc RIEN changer ailleurs — sans
    // ce test, une ligne mal bornée allongerait à cinq ans un centre de
    // formation de 3ᵉ catégorie, du côté que le référentiel refuse.
    for (const cat of ["N1", "N2", "N3"] as const) {
      for (const heb of ETATS_HEBERGEMENT) {
        expect(
          visitesRendues(cat, "R", heb).map((r) => r.ans),
          `R en ${cat} / hébergement ${heb ?? "non renseigné"}`,
        ).toEqual([3]);
      }
    }
    // Et les autres types de 4ᵉ catégorie ne dépendent pas de l'hébergement :
    // le tableau ne le leur demande pas. Un hôtel (O) qui déclare des chambres
    // et un magasin (M) qui n'en déclare pas gardent chacun leur rythme.
    for (const type of TYPES_ERP.filter((t) => t !== "R")) {
      const parEtat = ETATS_HEBERGEMENT.map((heb) =>
        visitesRendues("N4", type, heb).map((r) => r.ans),
      );
      expect(parEtat[0], `${type} en N4`).toEqual(parEtat[1]);
      expect(parEtat[1], `${type} en N4`).toEqual(parEtat[2]);
    }
  });

  it("les huit types spéciaux gardent trois ans, faute de colonne au tableau", () => {
    // PA, CTS, SG, PS, GA, OA, REF, EF n'ont aucune colonne : GE 4 § 1 ne leur
    // fixe rien. On ne leur invente pas cinq ans ; ils restent au statu quo,
    // qui est la borne prudente. Le test le vérifie plutôt que de s'en
    // remettre au fait qu'ils sont absents des listes `types`.
    const SPECIAUX = ["PA", "CTS", "SG", "PS", "GA", "OA", "REF", "EF"] as const;
    for (const type of SPECIAUX) {
      for (const cat of CATEGORIES_DU_TABLEAU) {
        const rendues = visitesRendues(cat, type);
        expect(rendues.map((r) => r.ans), `${type} / ${cat}`).toEqual([3]);
      }
    }
  });

  it("la prolongation « dans la limite de cinq ans » du § 3 n'est pas devenue un rythme", () => {
    // Le § 3 est une FACULTÉ sous plafond, ouverte après deux avis favorables
    // consécutifs et sur PROPOSITION DE LA COMMISSION — un historique et une
    // décision que le produit n'observe pas. Le § 4 est un pouvoir du maire ou
    // du préfet, donc une prescription particulière (ADR-014).
    //
    // Ce qui les distingue du tableau, mécaniquement : une quinquennale du
    // § 3 s'appliquerait à TOUT établissement sans hébergement, donc sans
    // restriction de type. Une quinquennale du tableau vise des types nommés,
    // et chacun de ces types doit porter cinq ans dans la catégorie visée.
    for (const id of LIGNES_GE4) {
      const o = obligationParId(id)!;
      expect(["triennale", "quinquennale"], id).toContain(o.periodicite);
      if (o.periodicite !== "quinquennale") continue;
      const erp = o.typologies.erp;
      expect(typeof erp === "object" && erp.types, id).toBeDefined();
      const typologie = erp as { categories?: string[]; types?: string[] };
      // La ligne peut restreindre le RÉGIME d'hébergement ; alors elle ne
      // répond que de la colonne correspondante. C'est ce qui autorise cinq
      // ans sur R (2) sans autoriser cinq ans sur R.
      const heb = o.typologies.locauxSommeilPublic;
      for (const cat of typologie.categories!) {
        const i = CATEGORIES_DU_TABLEAU.indexOf(
          cat as (typeof CATEGORIES_DU_TABLEAU)[number],
        );
        for (const type of typologie.types!) {
          const colonnes = TABLEAU.filter(
            (c) =>
              c.type === type &&
              (heb === undefined || c.hebergement === null || c.hebergement === heb),
          );
          // GARDE-FOU : un filtre qui ne rend rien ferait passer le `every`
          // ci-dessous à vide, donc à `true`. La ligne doit désigner au moins
          // une case réelle du tableau.
          expect(
            colonnes.length,
            `${id} : ${type} / hébergement ${heb ?? "indifférent"} ne désigne aucune colonne du tableau`,
          ).toBeGreaterThan(0);
          expect(
            colonnes.every((c) => c.ans[i] === 5),
            `${id} : ${type} en ${cat} n'est pas à cinq ans au tableau`,
          ).toBe(true);
        }
      }
    }
  });

  it("les § 2, § 3 et § 4 sont nommés au dirigeant plutôt que tus", () => {
    for (const id of LIGNES_GE4) {
      const d = obligationParId(id)!.description;
      expect(d, id).toContain("la périodicité la plus courte");
      expect(d, id).toContain("dans la limite de cinq ans");
      expect(d, id).toContain("maire ou le préfet");
    }
  });

  it("aucune relecture n'est due au 1er juin 2027 sur ces lignes", () => {
    // Le piège de l'article : le sélecteur de la page de SECTION affiche un
    // terme « au 01/06/2027 » qui est celui de GE 2 et GE 6, pas de GE 4. Trois
    // lectures s'y sont laissé prendre le 2026-09-01. La section relue au
    // 1er juillet 2027 rend GE 4 inchangé — il n'a pas de fin de vigueur.
    for (const id of LIGNES_GE4) {
      const o = obligationParId(id)!;
      expect(o.relectureDue, id).toBeUndefined();
      const ge4 = o.referencesLegales.find((r) => r.article === "GE 4");
      expect(ge4?.versionConstatee, id).toBe("2015-01-01");
      // Deux arrêtés du 20 octobre 2014 portent le même titre au même JO ;
      // celui qui a posé ce tableau est nommé par son NOR, pas par sa date.
      expect(ge4?.note, id).toContain("INTE1420988A");
    }
  });
});
