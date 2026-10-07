import { describe, it, expect } from "vitest";
import {
  obligationsConformite,
  empreinteReferentiel,
  obligationParId,
} from "./index";
import { PERIODICITE_EN_JOURS } from "../types-communs";
import type { Obligation } from "./types";

/**
 * Le champ `nature` (ADR-026) et ce qu'il garantit.
 *
 * Ces tests ne récitent pas le référentiel. Une liste exhaustive d'identifiants
 * se répare en recopiant la sortie, donc elle cesse de vérifier quoi que ce
 * soit — ce dépôt s'est déjà fait avoir deux fois par là. Ce qui est éprouvé
 * ici, ce sont des **règles** : une périodicité chiffrée impose une nature,
 * `autre` n'en impose aucune, et la nature ne doit rien changer à ce qui
 * s'écrit en base.
 *
 * Chacune a été éprouvée en injectant la violation qu'elle prétend interdire.
 */

/** Une périodicité que le texte chiffre — donc dont on sait calculer la suivante. */
function estChiffree(o: Obligation): boolean {
  return PERIODICITE_EN_JOURS[o.periodicite] !== null;
}

describe("nature d'obligation (ADR-026)", () => {
  it("un rythme chiffré impose la nature « échéance récurrente »", () => {
    // Le sens qui compte est celui-ci, et pas l'inverse : dès que le texte
    // écrit un rythme, l'acte revient, donc la nature est décidée. Encoder
    // « annuelle » sur un état permanent ou sur une obligation ponctuelle
    // serait une contradiction dans les termes, et le générateur en tirerait
    // une échéance que la nature dit ne pas exister.
    const fautives = obligationsConformite
      .filter((o) => estChiffree(o) && o.nature !== "echeance_recurrente")
      .map((o) => `${o.id} → ${o.periodicite} / ${o.nature}`);

    expect(fautives).toEqual([]);
  });

  it("l'inverse est FAUX, et c'est toute la raison d'être du champ", () => {
    // Une échéance récurrente dont l'article ne chiffre pas le rythme reste
    // récurrente : `L. 4141-2` écrit « répétée périodiquement » sans durée,
    // `R. 4412-11` écrit « régulièrement ». Si ce test devenait vert-vide, ce
    // serait que quelqu'un a réaligné la nature sur la périodicité — c'est-à-
    // dire supprimé l'information que ce champ apporte.
    const recurrentesSansRythme = obligationsConformite.filter(
      (o) => o.nature === "echeance_recurrente" && !estChiffree(o),
    );

    expect(recurrentesSansRythme.length).toBeGreaterThan(0);
  });

  it("`periodicite: \"autre\"` recouvre plusieurs natures — c'est le constat qui a fait ce lot", () => {
    // L'audit du 2026-08-31 (`docs/revues/rapport-audit-sans-surface.md`) a
    // établi que les quarante-trois obligations sans rythme écrit n'étaient pas
    // toutes des états permanents. Un écran qui trierait sur `periodicite ===
    // "autre"` les mélangerait. Si ce compte retombait à 1, le champ serait
    // devenu un synonyme de la périodicité.
    const natures = new Set(
      obligationsConformite
        .filter((o) => o.periodicite === "autre")
        .map((o) => o.nature),
    );

    expect(natures.size).toBeGreaterThanOrEqual(3);
  });

  it("les trois cas d'école de l'audit portent trois natures différentes", () => {
    // Trois identifiants nommés, et trois valeurs ATTENDUES DIFFÉRENTES : ce
    // n'est pas une liste à recopier, c'est une discrimination. Les trois
    // portaient la même `periodicite: "autre"` avant ce lot, et c'est cette
    // confusion-là qui rendait l'écran des états permanents inécrivable.
    //
    // Le troisième cas a changé le 2026-08-31 au soir, et le motif vaut d'être
    // gardé : c'était `incendie-erp-5-visite-commission`, dont l'ADR-026 disait
    // que sa `periodicite: "autre"` était un manque et non une description.
    // La relecture de PE 37 l'a confirmé et la quinquennale a été posée — elle
    // n'est donc plus un cas de cette famille, et la remplacer par une autre
    // récurrente sans rythme écrit garde au test sa discrimination. Le champ
    // `nature` a fait ce qu'il devait : nommer un désaccord jusqu'à ce qu'il
    // soit tranché.
    //
    // [2026-10-07] Les deux lignes de stockage d'origine sont retirées
    // (périmètre, relecture préventeur du 30/09, décision de la propriétaire
    // du 07/10) — ~~`stockage-dangereux-declaration-icpe`~~ (ponctuelle),
    // ~~`stockage-dangereux-verification-etancheite`~~ (récurrente). Leurs
    // remplaçantes portent la même nature et la même `periodicite: "autre"`.
    const cas = {
      "secours-salarie-secouriste": "ponctuelle",
      "froid-controle-etancheite-apres-modification": "evenementielle",
      "stockage-dangereux-formation-personnel": "echeance_recurrente",
    } as const;

    for (const [id, attendue] of Object.entries(cas)) {
      const o = obligationParId(id);
      expect(o, `obligation ${id} introuvable`).toBeDefined();
      expect(o!.periodicite, `${id} devrait rester sans rythme écrit`).toBe(
        "autre",
      );
      expect(o!.nature, `${id}`).toBe(attendue);
    }
  });

  it("un écrit déclaré manquant suppose un écrit attendu", () => {
    // `transmet: modele_absent` dit « le produit n'a pas de modèle pour
    // recevoir la pièce ». Sur une obligation dont `pieceAttendue` est nulle,
    // la phrase n'a pas d'objet : il n'y a pas de pièce. L'incohérence
    // signalerait soit un modèle réclamé pour rien, soit — le cas dangereux —
    // une pièce attendue que personne n'a nommée.
    const incoherentes = obligationsConformite
      .filter(
        (o) =>
          o.transmet.some((t) => t.vers === "modele_absent") &&
          o.pieceAttendue === null,
      )
      .map((o) => o.id);

    expect(incoherentes).toEqual([]);
  });

  it("une pièce attendue porte un nom, pas une chaîne vide", () => {
    const vides = obligationsConformite
      .filter((o) => o.pieceAttendue !== null && o.pieceAttendue.trim() === "")
      .map((o) => o.id);

    expect(vides).toEqual([]);
  });

  it("changer la nature ne déplace PAS l'empreinte du référentiel", () => {
    // C'est ce qui autorise à corriger une nature sans réconcilier les
    // calendriers de tout le parc. La nature ne décide ni de l'existence d'une
    // ligne de `Verification`, ni de sa date — `periodicite` et `porteur` le
    // font, et ils sont dans l'empreinte, eux.
    //
    // Éprouvé en cassant : ajouter `o.nature` au corps d'`empreinteReferentiel`
    // fait échouer ce test.
    const avant = empreinteReferentiel();

    const retournee: Obligation[] = obligationsConformite.map((o) => ({
      ...o,
      nature:
        o.nature === "etat_permanent" ? "echeance_recurrente" : "etat_permanent",
      pieceAttendue: o.pieceAttendue === null ? "témoin" : null,
    }));

    expect(empreinteReferentiel(retournee)).toBe(avant);
  });

  it("changer la périodicité déplace l'empreinte — la garantie précédente n'est pas vide", () => {
    // Sans ce contre-test, celui du dessus serait vrai d'une empreinte qui
    // ignorerait tout : il faut montrer qu'elle voit encore ce qu'elle doit
    // voir.
    const avant = empreinteReferentiel();
    const [premiere, ...reste] = obligationsConformite;
    const modifiee: Obligation[] = [
      { ...premiere, periodicite: "decennale" },
      ...reste,
    ];

    expect(empreinteReferentiel(modifiee)).not.toBe(avant);
  });
});
