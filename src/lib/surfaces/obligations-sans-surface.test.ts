import { CORPUS } from "@/lib/referentiels/corpus";
import { describe, expect, it } from "vitest";

import {
  obligationsConformite,
  type Obligation,
} from "@/lib/referentiels/conformite";
import {
  PLAFOND_SANS_SURFACE,
  SANS_SURFACE,
  inscriptionsFantomes,
  inscriptionsPerimees,
  obligationsSansSurface,
  orphelinesNonInscrites,
  surfacesDe,
} from "./obligations-sans-surface";

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
    const doubles = obligationsConformite
      .filter((o) => surfacesDe(o).length > 1)
      .map((o) => `${o.id} → ${surfacesDe(o).join(" + ")}`);
    expect(doubles).toEqual([]);
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
    // `stockage-dangereux-formation-personnel`.
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
