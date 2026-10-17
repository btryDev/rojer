import { describe, expect, it } from "vitest";
import {
  empreinteReferentiel,
  obligationsConformite,
} from "./index";
import { estPorteeParSalarie, type Obligation } from "./types";

/**
 * Les transmissions qui nomment un titre absent du catalogue.
 *
 * Extraite pour que la garantie et sa contre-épreuve emploient **le même**
 * prédicat : quand la contre-épreuve recopiait la logique, neutraliser la
 * garantie la laissait verte — elles ne partageaient plus rien.
 */
function renvoisMorts(obligations: readonly Obligation[]): string[] {
  const titres = new Set(
    obligations.filter(estPorteeParSalarie).map((o) => o.id),
  );
  const morts: string[] = [];
  for (const o of obligations) {
    for (const t of o.transmet) {
      if (t.vers !== "salarie_designe") continue;
      if (t.titre === null) continue; // réponse déclarée, cf. types.ts
      if (!titres.has(t.titre)) morts.push(`${o.id} → ${t.titre}`);
    }
  }
  return morts;
}

/**
 * Les transmissions qui posent une question sans laisser répondre.
 *
 * Même construction que `renvoisMorts` — un seul prédicat, partagé par la
 * garantie et par sa contre-épreuve — et pour la même raison.
 */
function renvoisSansTitre(obligations: readonly Obligation[]): string[] {
  const muets: string[] = [];
  for (const o of obligations) {
    for (const t of o.transmet) {
      if (t.vers !== "salarie_designe") continue;
      if (t.titre === null) muets.push(o.id);
    }
  }
  return muets;
}

/**
 * Les garanties de l'ADR-024. Chacune est éprouvée en réinjectant le défaut
 * qu'elle prétend interdire : une garantie qu'on n'a pas vue mordre est une
 * décoration.
 */
describe("transmissions (ADR-024)", () => {
  it("toutes les obligations déclarent leurs transmissions", () => {
    // Le type l'impose déjà — ce test dit ce que le type garantit, pour que
    // quelqu'un qui rendrait le champ optionnel voie rouge et pas seulement
    // vert. `undefined` ne peut pas arriver ici sans une régression de type.
    for (const o of obligationsConformite) {
      expect(Array.isArray(o.transmet), o.id).toBe(true);
    }
  });

  it("une transmission vers un titre pointe sur une obligation salarié réelle", () => {
    // La garantie qui compte. Un identifiant mal recopié créerait un renvoi
    // mort, et un renvoi mort dans ce référentiel se lit comme « rien à
    // signaler » — exactement le faux négatif muet que l'ADR-022 existe pour
    // supprimer.
    expect(renvoisMorts(obligationsConformite)).toEqual([]);
  });

  it("le renvoi mort est bien attrapé, sur le prédicat que la garantie emploie", () => {
    // Contre-épreuve, réécrite deux fois. La première se réduisait à
    // `titres.has("titre-qui-n-existe-pas")`, vraie de n'importe quelle
    // implémentation. La seconde éprouvait un prédicat RECOPIÉ dans le test :
    // neutraliser la garantie laissait la contre-épreuve verte, puisqu'elles
    // ne partageaient plus rien. Les deux appellent maintenant `renvoisMorts`.
    //
    // Et ce test porte une seconde charge, qui a changé de nature le
    // 2026-09-01. Quand il a été écrit, la garantie ne traversait AUCUNE
    // transmission nommée — il n'en existait qu'une à porteur salarié, et son
    // `titre` était `null` : éprouvée sur le seul référentiel, elle n'aurait
    // mordu que le jour d'un ajout. Le référentiel en porte désormais dix,
    // toutes nommées ; les cas fabriqués ci-dessous restent utiles pour la
    // raison inverse — ils éprouvent les branches que le référentiel réel ne
    // contient PAS, à commencer par l'identifiant inventé.
    const titreReel = obligationsConformite.filter(estPorteeParSalarie)[0];
    expect(titreReel, "le référentiel doit porter au moins un titre").toBeDefined();

    const avecTransmission = (titre: string | null): Obligation => ({
      id: "temoin-renvoi",
      domaine: "electricite",
      libelle: "Obligation témoin",
      referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 0000-0" }],
      periodicite: "autre",
      nature: "etat_permanent",
      pieceAttendue: null,
      usageEcran: null,
      realisateurs: ["exploitant"],
      criticite: 3,
      transmet: [
        {
          vers: "salarie_designe",
          titre,
          motif:
            "Motif de test, assez long pour tenir le contrôle de substance du motif.",
        },
      ],
      typologies: { travail: true },
      categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    });

    // `null` : réponse déclarée, jamais un renvoi mort.
    expect(renvoisMorts([...obligationsConformite, avecTransmission(null)])).toEqual([]);
    // Un titre réel du catalogue : accepté.
    expect(
      renvoisMorts([...obligationsConformite, avecTransmission(titreReel.id)]),
    ).toEqual([]);
    // Un identifiant inventé : attrapé, et nommé.
    expect(
      renvoisMorts([...obligationsConformite, avecTransmission("titre-inexistant")]),
    ).toEqual(["temoin-renvoi → titre-inexistant"]);

    // Et le cas qui exerce la FINESSE du prédicat, pas seulement son
    // existence : une obligation portée par l'ÉTABLISSEMENT n'est pas un
    // titre, et la nommer est un renvoi mort. Sans ce cas, élargir
    // `estPorteeParSalarie` en `porteurDe(o) !== "equipement"` — le piège que
    // sa propre docstring décrit — laissait les six tests verts.
    expect(
      renvoisMorts([
        ...obligationsConformite,
        avecTransmission("aeration-controle-installations-r4222-20"),
      ]),
    ).toEqual(["temoin-renvoi → aeration-controle-installations-r4222-20"]);
  });

  /**
   * Le cliquet ajouté le 2026-09-01, et ce qu'il empêche.
   *
   * `titre: null` compile, et le type le documente comme « une réponse
   * déclarée ». Il l'est du point de vue du rédacteur ; il ne l'est pas du
   * point de vue du dirigeant, à qui l'écran annonce alors « cette obligation
   * suppose une personne nommée, aucune n'est déclarée » sans lui laisser en
   * déclarer une. Une question fermée dans un outil de conformité se lit comme
   * un reproche sans issue.
   *
   * Le référentiel en portait UN — l'habilitation électrique de `R. 4544-10`,
   * branchée ce jour sur `elec-salarie-habilitation`. Le compte est donc à
   * zéro, et il ne remonte pas : c'est le même idiome de plafond que
   * `corpus.test.ts`, avec la même règle — s'il augmente, ce n'est pas le
   * plafond qu'on relève, c'est le titre qu'on encode.
   *
   * Ce qui a débloqué celui-ci vaut pour le prochain : le blocage n'était pas
   * l'absence de lecture, c'était la croyance qu'un titre suppose une durée.
   * `TitreSalarie.echeanceLe` est nullable, et `periodicite: "autre"` empêche
   * le générateur d'en calculer une.
   */
  /*
   * REMONTÉ À 1 À L'INTÉGRATION DU 2026-09-02, et la règle ci-dessus tient
   * quand même — parce que le seul renvoi restant n'a pas de titre à encoder.
   *
   * `EL 18 § 2` exige la présence d'« une personne qualifiée » pendant toute
   * la présence du public. Le texte ne renvoie à aucune formation, ne nomme
   * aucun titre, ne fixe aucune durée : il exige une qualification sans la
   * définir. Encoder une ligne de catalogue reviendrait à inventer le titre
   * que l'article se garde de nommer, et pointer vers l'habilitation
   * électrique dirait quelque chose qu'il n'écrit pas.
   *
   * C'est donc l'exception que la règle prévoit en creux : « s'il augmente,
   * ce n'est pas le plafond qu'on relève, c'est le titre qu'on encode » vaut
   * quand un titre existe à encoder. Le second renvoi de ce lot, lui, en
   * avait un — le carnet de prescriptions a été branché sur
   * `elec-salarie-habilitation` plutôt que compté ici.
   *
   * Il ne remonte pas au-delà sans le même genre d'argument, écrit ici.
   */
  const PLAFOND_RENVOIS_SANS_TITRE = 1;

  it("aucune transmission ne pose une question sans laisser répondre", () => {
    const muets = renvoisSansTitre(obligationsConformite);
    expect(
      muets,
      `${muets.length} transmission(s) \`salarie_designe\` déclarent ` +
        `\`titre: null\` (plafond ${PLAFOND_RENVOIS_SANS_TITRE}). L'écran ` +
        `annonce alors au dirigeant qu'une personne nommée est requise sans ` +
        `lui laisser en déclarer une. Encoder la ligne de catalogue plutôt ` +
        `que relever le plafond : un titre n'a pas besoin d'une durée pour ` +
        `exister — \`periodicite: "autre"\` et \`echeanceLe\` nulle suffisent, ` +
        `c'est ce qui a débloqué l'habilitation électrique.`,
    ).toHaveLength(PLAFOND_RENVOIS_SANS_TITRE);
  });

  it("le cliquet voit bien le `null` qu'il interdit", () => {
    // Contre-épreuve sur le prédicat que la garantie emploie, comme
    // ci-dessus : neutraliser `renvoisSansTitre` doit rendre CE test rouge,
    // sans quoi le cliquet est une décoration qui reste verte parce que le
    // référentiel est propre aujourd'hui.
    const temoin = (titre: string | null): Obligation => ({
      id: "temoin-muet",
      domaine: "electricite",
      libelle: "Obligation témoin",
      referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 0000-0" }],
      periodicite: "autre",
      nature: "etat_permanent",
      pieceAttendue: null,
      usageEcran: null,
      realisateurs: ["exploitant"],
      criticite: 3,
      transmet: [
        {
          vers: "salarie_designe",
          titre,
          motif:
            "Motif de test, assez long pour tenir le contrôle de substance du motif.",
        },
      ],
      typologies: { travail: true },
      categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    });

    // `null` : attrapé, et nommé. On compare l'ÉCART au référentiel réel, pas
    // une liste absolue : celle-ci valait tant que le compte était à zéro, et
    // elle est devenue fausse le jour où le plafond est passé à 1. Une
    // contre-épreuve qui énumère l'état du référentiel se répare en recopiant
    // cet état — donc cesse de vérifier le prédicat qu'elle prétend éprouver.
    const avant = renvoisSansTitre(obligationsConformite);
    const apres = renvoisSansTitre([...obligationsConformite, temoin(null)]);
    expect(apres.filter((id) => !avant.includes(id))).toEqual(["temoin-muet"]);
    // Un titre nommé : accepté, même inventé — ce n'est pas le défaut que ce
    // cliquet-ci surveille, c'est celui de `renvoisMorts`. Les deux gardes
    // sont disjointes, et ce cas le prouve : sans lui, écrire
    // `renvoisSansTitre` en `t.titre === null || !titres.has(t.titre)` les
    // confondrait et laisserait les deux tests verts.
    expect(
      renvoisSansTitre([...obligationsConformite, temoin("titre-inexistant")]),
    ).toEqual(avant);
  });

  it("chaque transmission porte un motif substantiel", () => {
    // Un motif vide ou d'un mot rendrait le champ décoratif : quelqu'un qui
    // relit un article doit lire ce que le TEXTE implique, pas une étiquette.
    for (const o of obligationsConformite) {
      for (const t of o.transmet) {
        expect(t.motif.trim().length, `${o.id} / ${t.vers}`).toBeGreaterThan(40);
      }
    }
  });

  it("une transmission ne fait pas bouger l'empreinte du référentiel", () => {
    // Décision explicite de l'ADR-024, et elle doit rester vérifiée : y faire
    // entrer `transmet` réconcilierait TOUS les calendriers de TOUS les
    // dossiers à chaque annotation de relecture, pour un résultat identique —
    // une transmission ne produit aucune échéance.
    const temoin: Obligation = {
      id: "temoin-transmission",
      domaine: "incendie",
      libelle: "Obligation témoin",
      referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 0000-0" }],
      periodicite: "annuelle",
      realisateurs: ["exploitant"],
      criticite: 3,
      transmet: [],
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
      typologies: { erp: true },
      categoriesEquipement: ["ALARME_INCENDIE"],
    };
    const avant = empreinteReferentiel([temoin]);
    const apres = empreinteReferentiel([
      {
        ...temoin,
        transmet: [
          {
            vers: "modele_absent",
            modele: "ModeleImaginaire",
            motif:
              "Motif de test, assez long pour passer le contrôle de substance du motif.",
          },
        ],
      },
    ]);
    expect(apres).toBe(avant);
  });

  it("l'empreinte réagit toujours à ce qui, lui, change les échéances", () => {
    // Contre-épreuve du test précédent : sans elle, une empreinte cassée qui
    // ne réagirait plus à RIEN le passerait aussi.
    const temoin: Obligation = {
      id: "temoin-transmission",
      domaine: "incendie",
      libelle: "Obligation témoin",
      referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 0000-0" }],
      periodicite: "annuelle",
      realisateurs: ["exploitant"],
      criticite: 3,
      transmet: [],
    nature: "echeance_recurrente",
    pieceAttendue: null,
    usageEcran: null,
      typologies: { erp: true },
      categoriesEquipement: ["ALARME_INCENDIE"],
    };
    expect(
      empreinteReferentiel([{ ...temoin, periodicite: "biennale" }]),
    ).not.toBe(empreinteReferentiel([temoin]));
  });
});
