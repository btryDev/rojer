import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import { CORPUS } from "@/lib/referentiels/corpus";
import { describe, expect, it } from "vitest";

import {
  obligationsConformite,
  type Obligation,
} from "@/lib/referentiels/conformite";
import {
  PLAFOND_SANS_SURFACE,
  SANS_SURFACE,
  estTitreSousCondition,
  inscriptionsFantomes,
  inscriptionsPerimees,
  obligationsSansSurface,
  orphelinesNonInscrites,
  surfacesDe,
  type Surface,
} from "./obligations-sans-surface";
import { modeSurLEcranEnPlace } from "@/lib/etats-permanents/regle";
import { estPorteeParSalarie } from "@/lib/referentiels/conformite/types";
import { cataloguerTitres } from "@/lib/salaries/catalogue";
import {
  ceQuiManqueALaPersonne,
  estDuALEntree,
  titresLusParLaFiche,
} from "@/lib/salaries/du-a-la-personne";

/**
 * Une obligation orpheline FABRIQUÉE, pour éprouver la garde en la cassant.
 *
 * Elle porte exactement la combinaison qui échappe aux deux surfaces :
 * `periodicite: "autre"` (le générateur la saute) et `nature: "evenementielle"`
 * (l'écran des états permanents ne la retient pas). C'est la faute que ce
 * module existe pour attraper, et la seule façon de savoir qu'il l'attrape est
 * de la commettre.
 *
 * Fabriquée plutôt qu'empruntée au référentiel : une garde éprouvée sur une
 * ligne livrée passe au vert le jour où cette ligne est corrigée, et personne
 * ne s'aperçoit qu'elle ne mesure plus rien.
 */
const ORPHELINE_FABRIQUEE = {
  id: "sonde-obligation-sans-surface",
  domaine: "co_activite",
  libelle: "Sonde — obligation qu'aucune surface ne montre",
  description:
    "Obligation fabriquée par le test pour éprouver la garde. Elle n'entre jamais dans le référentiel.",
  referencesLegales: [],
  periodicite: "autre",
  // `ponctuelle` et non plus `evenementielle` : depuis l'ADR-037 (2026-09-21)
  // une événementielle sans rendez-vous A une surface. La ponctuelle est la
  // nature qui n'en a toujours aucune.
  nature: "ponctuelle",
  pieceAttendue: null,
  realisateurs: ["exploitant"],
  criticite: 1,
  typologies: { travail: true },
  porteur: "etablissement",
  transmet: [],
  notesInternes: "Sonde de test, jamais livrée.",
} as unknown as Obligation;

/**
 * Les obligations montrées DEUX fois sur la fiche salarié — par la liste des
 * obligations événementielles (`faits`) et par la carte « Ce qui manque »
 * (`fiche_salarie`). Inscrites et datées, comme `SANS_SURFACE` : un double
 * filtré en silence ne se verrait plus.
 */
const DOUBLES_INSCRITS: Readonly<Record<string, string>> = {
  "formation-securite-salarie-accueil":
    "2026-10-12, ADR-043 — événementielle (R. 4141-20, redue au changement de poste) ET due à l'entrée (premier délai d'un mois) : la fiche la liste comme fait et la date comme manque. Fusion à décider côté fiche.",
};

describe("toute obligation atteint une surface, ou elle est inscrite", () => {
  it("aucune obligation sans surface n'échappe au registre", () => {
    // LA GARDE. Le message nomme les coupables : une garde qui dit seulement
    // « le compte a changé » se répare en changeant le compte.
    expect(
      orphelinesNonInscrites(),
      "Une obligation n'atteint ni le calendrier ni l'écran « Ce qui doit être en place », " +
        "et elle ne figure pas au registre `SANS_SURFACE`. Le dirigeant ne la verra jamais " +
        "et personne ne le sait. Soit sa `nature` est fausse — c'est le cas le plus fréquent, " +
        "et la corriger lui rend un écran sans écrire une ligne d'interface —, soit son " +
        "absence de surface est assumée, et il faut l'inscrire avec sa date et son motif.",
    ).toEqual([]);
  });

  it("le registre ne garde aucune inscription dont l'obligation a retrouvé une surface", () => {
    // C'est ce qui le fait RÉTRÉCIR. Sans ce test, une nature corrigée
    // laisserait son inscription derrière elle, et le registre décrirait un
    // état qui n'existe plus — ce qui est exactement le défaut que
    // `perimetre/non-couverture.ts` a été écrit pour retirer d'une page de
    // couverture.
    expect(
      inscriptionsPerimees(),
      "Une obligation inscrite au registre atteint désormais une surface. Retirez son " +
        "entrée : `SANS_SURFACE` ne décrit que ce qui est sans surface AUJOURD'HUI.",
    ).toEqual([]);
  });

  it("le registre ne nomme aucune obligation qui n'existe pas", () => {
    // Un registre qui garde des fantômes cesse d'être lu, et son plafond cesse
    // de vouloir dire quelque chose.
    expect(
      inscriptionsFantomes(),
      "Le registre `SANS_SURFACE` nomme un identifiant qu'aucune obligation ne porte. " +
        "L'obligation a été retirée ou renommée : retirez l'inscription.",
    ).toEqual([]);
  });

  it("chaque inscription est datée et dit pourquoi", () => {
    // Sans date, une inscription devient un état de fait dont personne ne sait
    // l'âge ; sans motif, elle devient une dispense. Le plancher de longueur
    // est le même geste que celui d'`OBLIGATIONS_RETIREES` : un motif d'un mot
    // ne dit rien.
    for (const [id, inscription] of Object.entries(SANS_SURFACE)) {
      expect(inscription.inscriteLe, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(inscription.motif.length, id).toBeGreaterThan(120);
    }
  });

  it("le registre ne dépasse pas son plafond, qui ne se relève pas", () => {
    // Dix au constat du 2026-09-04, neuf après la correction de
    // `stockage-dangereux-fiches-donnees`. Le plafond est la seconde moitié de
    // « qui ne peut que rétrécir » : inscrire une dixième obligation orpheline
    // oblige à toucher CE nombre, dans un diff où la ligne d'à côté dit qu'il
    // ne se relève pas.
    expect(
      Object.keys(SANS_SURFACE).length,
      "Le registre des obligations sans surface a grandi. Ce plafond ne se relève pas : " +
        "une obligation de plus qu'aucun écran ne montre est un défaut à corriger, " +
        "pas une limite à desserrer.",
    ).toBeLessThanOrEqual(PLAFOND_SANS_SURFACE);
  });

  it("aucune obligation n'atteint DEUX surfaces", () => {
    // L'autre moitié du même défaut, et celle que la journée du 2026-08-31 a
    // passé à retirer : une ligne qui vit au calendrier ET sur l'écran des
    // états permanents donne deux états qui divergent à la première
    // correction. `estSansRendezVous` l'interdit aujourd'hui par construction ;
    // ce test le tient le jour où une troisième surface sera branchée ici.
    //
    // [2026-10-12, ADR-043 (c)] Deux exceptions, et seulement deux, chacune
    // avec sa raison :
    //
    //  - `calendrier + fiche_salarie` n'est pas un double, et c'est prouvé au
    //    test suivant, pas supposé : la fiche ne montre un titre que tant qu'il
    //    n'a JAMAIS été déclaré pour la personne, et la ligne de calendrier
    //    d'un titre ne naît que de sa déclaration
    //    (`genererVerificationsDepuisTitres`). Les deux se succèdent ;
    //  - `faits + fiche_salarie` EST un double, et il est inscrit plutôt que
    //    filtré : la liste des obligations événementielles de la fiche
    //    (`salaries/obligations-evenementielles.ts`) montre la formation à la
    //    sécurité que le titre soit déclaré ou non, et la carte « Ce qui
    //    manque » la montre aussi, datée, tant qu'il ne l'est pas. Les deux
    //    disent la même chose sans se contredire aujourd'hui (« rien de
    //    déclaré » d'un côté, une échéance de l'autre), mais c'est la forme qui
    //    diverge. Les fusionner relève de la fiche, que ce lot ne touche pas.
    const estDouble = (s: Surface[]) => {
      const autres = s.filter((x) => x !== "fiche_salarie");
      if (autres.length > 1) return true;
      return s.includes("fiche_salarie") && autres[0] === "faits";
    };
    const doubles = obligationsConformite
      .filter((o) => estDouble(surfacesDe(o)) && !(o.id in DOUBLES_INSCRITS))
      .map((o) => `${o.id} → ${surfacesDe(o).join(" + ")}`);
    expect(doubles).toEqual([]);
    // Le registre ne garde aucune inscription qui n'est plus un double.
    for (const id of Object.keys(DOUBLES_INSCRITS)) {
      const o = obligationsConformite.find((x) => x.id === id);
      expect(surfacesDe(o!), id).toEqual(["faits", "fiche_salarie"]);
    }
  });

  it("la fiche ne montre jamais un titre déjà déclaré — elle précède la ligne, elle ne la double pas", () => {
    // La prémisse dont dépend l'exception du test précédent. Elle est tenue
    // par `ceQuiManqueALaPersonne` lui-même, appelé ici sur chaque titre que
    // la surface `fiche_salarie` revendique : déclaré, il ne manque plus.
    const lus = [...titresLusParLaFiche()];
    expect(lus.length).toBeGreaterThan(0);
    const present = { actif: true, entreLe: new Date("2026-01-01T12:00:00Z") };
    for (const id of lus) {
      const manques = ceQuiManqueALaPersonne(present, [
        { obligationId: id, delivreLe: new Date("2026-01-02T12:00:00Z") },
      ]).map((m) => m.obligation.id);
      expect(manques, id).not.toContain(id);
    }
  });
});

describe("l'exemption « sans surface » des titres salarié, resserrée (ADR-043 (c))", () => {
  const VIP = "sante-travail-salarie-vip";
  const ACCUEIL = "formation-securite-salarie-accueil";
  const SECOURISTE = "secours-salarie-secouriste";
  const parId = (id: string) => obligationsConformite.find((o) => o.id === id)!;

  it("borne basse : la VIP et la formation à la sécurité ont la surface de la fiche", () => {
    expect(surfacesDe(parId(VIP))).toContain("fiche_salarie");
    expect(surfacesDe(parId(ACCUEIL))).toContain("fiche_salarie");
  });

  it("tout titre dû à l'entrée a la surface de la fiche — par le prédicat de la fiche", () => {
    const dus = obligationsConformite.filter(estDuALEntree);
    expect(dus.length).toBeGreaterThanOrEqual(2);
    for (const o of dus) expect(surfacesDe(o), o.id).toContain("fiche_salarie");
  });

  it("borne haute : un titre sous condition n'a pas la fiche, et reste exempté", () => {
    // Le secouriste : le produit ne sait pas qui doit l'être (ADR-043 (b)).
    expect(surfacesDe(parId(SECOURISTE))).not.toContain("fiche_salarie");
    expect(estTitreSousCondition(parId(SECOURISTE))).toBe(true);
  });

  it("l'exemption ne couvre plus les titres que la fiche date", () => {
    expect(estTitreSousCondition(parId(VIP))).toBe(false);
    expect(estTitreSousCondition(parId(ACCUEIL))).toBe(false);
    // Et elle ne couvre rien d'autre qu'un titre salarié.
    expect(
      obligationsConformite
        .filter((o) => estTitreSousCondition(o))
        .every(estPorteeParSalarie),
    ).toBe(true);
  });

  it("propriété : aucun titre salarié n'est sans surface ni exemption", () => {
    const orphelins = obligationsConformite
      .filter(estPorteeParSalarie)
      .filter((o) => surfacesDe(o).length === 0 && !estTitreSousCondition(o))
      .map((o) => o.id);
    expect(orphelins).toEqual([]);
  });

  it("éprouvé : un titre fabriqué, dû à l'entrée et sans autre surface, n'atteint que la fiche", () => {
    // La combinaison qui n'aurait aucune autre surface : `autre` (pas de
    // calendrier), `ponctuelle` (ni l'écran « en place », ni les faits).
    const titre = {
      ...ORPHELINE_FABRIQUEE,
      id: "sonde-titre-du-a-l-entree",
      porteur: "salarie",
      exclut: [],
      pieceMedicale: false,
      premierDelai: "mensuelle",
    } as unknown as Obligation;
    const augmente = [...obligationsConformite, titre];
    const lus = titresLusParLaFiche(cataloguerTitres(augmente));
    expect(surfacesDe(titre, lus)).toEqual(["fiche_salarie"]);
    expect(orphelinesNonInscrites(augmente)).toEqual([]);

    // Le même sans `premierDelai` : sous condition, sans surface, exempté —
    // le motif d'Équipe, qui reste.
    const sousCondition = { ...titre, premierDelai: undefined } as Obligation;
    const augmente2 = [...obligationsConformite, sousCondition];
    const lus2 = titresLusParLaFiche(cataloguerTitres(augmente2));
    expect(surfacesDe(sousCondition, lus2)).toEqual([]);
    expect(estTitreSousCondition(sousCondition, lus2)).toBe(true);
    expect(orphelinesNonInscrites(augmente2)).toEqual([]);
  });
});

describe("la garde éprouvée en la cassant", () => {
  it("une obligation orpheline ajoutée au référentiel est NOMMÉE", () => {
    // Sans ce test, les trois précédents seraient vrais d'une garde qui ne
    // regarde plus rien — un `filter` cassé rend une liste vide, et une liste
    // vide est exactement ce qu'ils attendent.
    const augmente = [...obligationsConformite, ORPHELINE_FABRIQUEE];

    expect(obligationsSansSurface(augmente).map((o) => o.id)).toContain(
      "sonde-obligation-sans-surface",
    );
    expect(orphelinesNonInscrites(augmente)).toEqual([
      "sonde-obligation-sans-surface",
    ]);
  });

  it("la même obligation dotée d'un rythme n'est plus orpheline", () => {
    // La borne haute de la garde : elle ne doit pas dénoncer tout ce qu'on lui
    // passe. Une périodicité chiffrée rend une ligne au calendrier, et la
    // sonde disparaît — c'est ce qui prouve que le premier test tient à la
    // combinaison, pas à la fabrication.
    const avecRythme = { ...ORPHELINE_FABRIQUEE, periodicite: "annuelle" } as Obligation;
    expect(surfacesDe(avecRythme)).toEqual(["calendrier"]);
    expect(
      orphelinesNonInscrites([...obligationsConformite, avecRythme]),
    ).toEqual([]);
  });

  it("la même obligation en état permanent atteint l'écran, pas le calendrier", () => {
    // La couche voisine : c'est le chemin qu'a pris
    // `stockage-dangereux-fiches-donnees` le 2026-09-04, et il se vérifie sans
    // dépendre de cette ligne-là.
    const permanente = {
      ...ORPHELINE_FABRIQUEE,
      nature: "etat_permanent",
    } as Obligation;
    expect(surfacesDe(permanente)).toEqual(["etats_permanents"]);
    expect(
      orphelinesNonInscrites([...obligationsConformite, permanente]),
    ).toEqual([]);
  });
});

describe("les deux obligations tranchées le 2026-09-04", () => {
  it("les fiches de données de sécurité atteignent l'écran des états permanents", () => {
    // R. 4412-38 2° — « Aient accès aux fiches de données de sécurité fournies
    // par le fournisseur des agents chimiques » : un état à constituer puis à
    // maintenir. L'« actualisation » qui l'avait fait ranger en
    // `evenementielle` est au 1° du même article, et elle est portée par
    // ~~`stockage-dangereux-formation-personnel`~~
    // `stockage-dangereux-etablissement-formation-personnel` (2026-10-08, C64).
    const o = obligationsConformite.find(
      (x) => x.id === "stockage-dangereux-fiches-donnees",
    );
    expect(o?.nature).toBe("etat_permanent");
    expect(surfacesDe(o!)).toEqual(["etats_permanents"]);
    expect("stockage-dangereux-fiches-donnees" in SANS_SURFACE).toBe(false);
  });

  it("le protocole de sécurité A une surface depuis l'ADR-037, et le corpus garde ce qui manque", () => {
    // ~~« reste sans surface, et le registre dit pourquoi »~~ — 2026-09-21.
    // R. 4515-8 fait établir un protocole par opération non répétitive : la
    // nature `evenementielle` est juste, et la page « Quand ça arrive » la
    // montre. Ce que le registre portait en plus — le protocole UNIQUE de
    // R. 4515-9, état permanent, encodé nulle part — n'a pas disparu avec
    // l'inscription : c'est une `reserve` du corpus, donc une dette comptée.
    const o = obligationsConformite.find(
      (x) => x.id === "co-activite-etablissement-protocole-securite",
    );
    expect(o?.nature).toBe("evenementielle");
    expect(surfacesDe(o!)).toEqual(["faits"]);
    expect(SANS_SURFACE["co-activite-etablissement-protocole-securite"]).toBeUndefined();
    const r45159 = CORPUS.flatMap((c) => c.articles).find((a) => a.ref === "R. 4515-9");
    expect(r45159?.statut === "retenu" ? r45159.reserve : undefined).toContain(
      "SECOND régime",
    );
  });
});

describe("l'écran en place compté comme l'écran le compte (2026-09-27, lot 2)", () => {
  // `surfacesDe` lisait `modeDeclaration` nu et attribuait l'écran « Ce qui doit
  // être en place » à deux titres salarié que l'écran écarte. Éprouvé en
  // rétablissant `modeDeclaration(o) !== null` : ce test rougit sur
  // `elec-salarie-habilitation` et `conduite-salarie-autorisation`.
  it("n'attribue l'écran « en place » qu'aux obligations que l'écran liste", () => {
    // Hors niveau audit (ADR-042) : l'écran ne les reçoit jamais — le moteur
    // les écarte en amont —, et `surfacesDe` leur rend la seule rubrique
    // « Niveau audit » (gardé dans `niveau-audit.test.ts`).
    const faux = obligationsConformite
      .filter((o) => !estNiveauAudit(o))
      .filter(
        (o) =>
          surfacesDe(o).includes("etats_permanents") !==
          (modeSurLEcranEnPlace(o) !== null),
      )
      .map((o) => o.id);
    expect(faux).toEqual([]);
  });
});
