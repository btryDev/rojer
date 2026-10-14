import { describe, expect, it } from "vitest";
import { CAUSES_BLOCAGE, type CauseBlocage } from "./types";
import { CORPUS, reservesDeLecture } from "./index";

/**
 * LE REGISTRE DE DETTE SE COMPTE (2026-09-20).
 *
 * Trois nombres, tenus à l'unité : un changement — dans un sens ou dans
 * l'autre — demande de venir ici l'écrire. Ce ne sont pas des plafonds qu'on
 * s'interdit de remonter : un dépouillement honnête TROUVE des manques, et le
 * corpus existe pour ça. Ce sont des comptes qu'on s'interdit de laisser
 * bouger EN SILENCE.
 */

const manquantes = CORPUS.flatMap((c) =>
  c.articles.flatMap((a) =>
    a.statut === "obligation_manquante" ? [{ corpus: c.id, ...a }] : [],
  ),
);

const parCause = (cause: CauseBlocage) =>
  manquantes.filter((a) => a.cause === cause);

describe("registre de dette — les obligations manquantes", () => {
  it("les « libres » sont NOMMÉES : ce que rien ne bloque s'encode au lot suivant", () => {
    // Pas « aucune » : un test qui interdit l'étiquette pousse à mal étiqueter,
    // et c'est arrivé dès le premier jour — `PE 27` était rangée `a_trancher`
    // alors que son blocage (« l'article n'écrit aucune périodicité ») est levé
    // depuis que l'ADR-026 porte cinquante états permanents sans rythme. La
    // contre-lecture l'a vu. Le test tient donc la LISTE : elle doit se vider,
    // et s'allonger coûte un geste visible.
    //
    // `R. 4222-21`, libre au matin du 2026-09-20, est encodée le soir même.
    // `PE 27`, nommée ici au soir du 2026-09-20, est encodée le lendemain
    // (§ 4 et § 5). La liste est vide ; elle doit le rester ou se justifier.
    expect(parCause("libre").map((a) => a.ref)).toEqual([]);
  });

  it("« hors de la cible, rien ne bloque » ne peut pas toucher la cible", () => {
    // Les deux champs sont indépendants partout ailleurs ; ici l'un implique
    // l'autre, et une contradiction ferait disparaître une dette de la cible
    // sous une étiquette de périmètre.
    expect(
      parCause("perimetre")
        .filter((a) => a.toucheLaCible)
        .map((a) => a.ref),
    ).toEqual([]);
  });

  it("la matrice cause × cible, tenue dans ses DEUX colonnes", () => {
    // La première écriture ne tenait que la colonne « cible » : réétiqueter une
    // dette hors cible en `perimetre` passait en silence (contre-épreuve de la
    // contre-lecture). Ce que ce test ne voit toujours pas : une permutation de
    // deux causes à l'intérieur d'une même colonne. Il tient des comptes, pas
    // la justesse d'un classement — celle-là se relit.
    const matrice = Object.fromEntries(
      CAUSES_BLOCAGE.map((c) => [
        c,
        [
          parCause(c).filter((a) => a.toucheLaCible).length,
          parCause(c).filter((a) => !a.toucheLaCible).length,
        ],
      ]),
    );
    expect(matrice).toEqual({
      //                        [cible, hors cible]
      libre: [0, 0],
      // 9 → 6 le 2026-09-21 : les trois de la chaleur intense (`R. 4463-4`,
      // `-5`, `-7`) sont encodées sur la page « Quand ça arrive ».
      // 6 → 0 le même jour : cinq relues à la source et encodées ; la sixième,
      // `L. 8222-5`, passe en `a_trancher` — ce qui la retient est la décision
      // sur le module de vigilance, plus l'absence de surface.
      // [0, 1] → [1, 0] le 2026-10-12 (cible redéfinie le 2026-10-12) : arrêté 1986 art. 102.
      // [1, 0] → [0, 0] le 2026-10-13 : arrêté 1986 art. 102 annoncé (`non_couvert`).
      evenement: [0, 0],
      // [5, 6] → [11, 0] le 2026-10-12 (cible redéfinie le 2026-10-12) : `GZ 13`, `GZ 14`, `CO 61`,
      // `AS 10`, `GC 18`, arrêté 2018-02-23 art. 26 § 3.
      // [11, 0] → [7, 0] le 2026-10-13 (décision de la propriétaire) : `GZ 13`,
      // `GZ 14`, `AS 10` et l'arrêté 2018-02-23 art. 26 § 3 annoncés
      // (`non_couvert`). Restent HORS CADRE `CO 61`, `GC 18`.
      categorie_equipement: [7, 0],
      // 4 → 1 le 2026-09-27 (C45) : `R. 4227-23`, `R. 4227-24` et l'art. 8 de
      // l'arrêté du 10 septembre 2021 passent `non_couvert`, annoncés.
      // [1, 2] → [3, 0] le 2026-10-12 (cible redéfinie le 2026-10-12) : `MS 71`, arrêté 1986 art. 60.
      attribut_etablissement: [3, 0],
      // 5 → 0 le 2026-09-27 (C45) : `R. 1321-60` et les art. 4, 9, 10, 12 de
      // l'arrêté du 10 septembre 2021, annoncés (`non_couvert`).
      // [0, 1] → [1, 0] le 2026-10-12 (cible redéfinie le 2026-10-12) : arrêté 1986 art. 78-1.
      // [1, 0] → [0, 0] le 2026-10-13 : arrêté 1986 art. 78-1 annoncé (`non_couvert`).
      destinataire: [0, 0],
      // 6 → 4 le 2026-09-27 (C45) : `R. 4227-26` encodé (retenu), `R. 4225-3`
      // annoncé. Restent quatre HORS CADRE (`R. 4323-61`, `-69`, arrêté 1993
      // art. 8 et annexe III).
      // [4, 1] → [5, 0] le 2026-10-12 (cible redéfinie le 2026-10-12) : `R. 4323-89`.
      activite_exercee: [5, 0],
      // 3 → 0 le 2026-09-27 (C45) : `L. 8222-1`, `D. 8222-5`, `D. 8222-7`
      // annoncés.
      relation_tiers: [0, 0],
      // 7 → 9 le 2026-09-21 : `R. 4431-2` ouvert, les deux manques du bruit ne
      // sont plus un texte à lire mais une donnée que le DUERP ne recueille pas.
      // 9 → 1 le 2026-09-27 (C45) : `L. 4121-3-1` (VI tracé, III 1° annoncé)
      // et `R. 4512-12` (2° tracé) encodés au module ; `R. 4463-8`,
      // `R. 4121-1-1`, `R. 4512-1`, `-9`, `-11`, `R. 4433-2` annoncés. Reste
      // `R. 4434-9`, HORS CADRE.
      module: [1, 0],
      // 4 → 1 le même jour : trois lectures faites. Reste la « centrifugeuse »
      // de l'arrêté du 5 mars 1993, qui ne se tranche pas en ouvrant un article.
      texte_a_lire: [1, 0],
      // 7 → 8 : `R. 4224-3`, trouvé en l'ouvrant pour un autre.
      // 9 → 3 le 2026-09-27 (C45) : `L. 4141-5`, `L. 4121-3`, `L. 8222-5`,
      // `R. 4227-22`, `R. 4227-25`, `R. 4323-106` annoncés. Restent trois HORS
      // CADRE (`R. 4224-3`, `R. 4223-4`, arrêté 1993-11-04 art. 4).
      // [3, 1] → [7, 0] le 2026-10-12 (cible redéfinie le 2026-10-12) : `R. 4544-11` entre dans la
      // cible ; `PO 1 § 3`, `PO 7`, `PO 12` y entrent aussi et passent de
      // `perimetre` à `a_trancher` — à classer selon la grille C45, rien ne
      // s'encode. 3 + 1 + 3 = 7.
      // [7, 0] → [4, 0] le 2026-10-13 (décision de la propriétaire) : les trois
      // hôtels encodés (`retenu`). `R. 4544-11` est classé HORS CADRE et reste
      // ici, avec les trois du 2026-09-27.
      // [4, 0] → [3, 0] le même jour : `R. 4544-11` annoncé (`non_couvert`),
      // décision de la propriétaire (« hors cadre et on l'annonce »).
      // [3, 0] → [4, 0] le 2026-10-14 : « MS 69 — stock permanent de
      // fournitures de rechange », HORS CADRE (décision de la propriétaire),
      // sortie de la réserve de `MS 69` pour être classée.
      a_trancher: [4, 0],
      // [0, 3] → [0, 0] le 2026-10-12 : les trois hôtels, voir `a_trancher`.
      perimetre: [0, 0],
    });
    // 42 → 15 et 57 → 30 le 2026-09-27 (C45) : 42 − 1 encodé (`R. 4227-26`)
    // − 2 tracés au module (`L. 4121-3-1`, `R. 4512-12`) − 24 annoncés = 15,
    // les quinze HORS CADRE de `docs/couverture-declaree-du-produit.md`.
    // 15 → 30 le 2026-10-12 : la cible est ce que l'onboarding ne refuse pas
    // (≤ 50 travailleurs, pas d'ERP en IGH ; ADR-031), et non plus
    // `CATEGORIES_COUVERTES = ["N5"]`. 15 + 3 hôtels + 6 ERP des quatre
    // premières catégories + 4 habitation + 2 activités (`R. 4544-11`,
    // `R. 4323-89`) − 0 = 30. Le total ne bouge pas (30) : c'est une mesure,
    // pas une dette nouvelle. ~~Les quinze entrées sont OUVERTES, à évaluer
    // selon la grille C45 (encoder / annoncer / hors cadre).~~ [Classées le
    // 2026-10-13, ci-dessous.]
    // 30 → 23 le 2026-10-13 (décision de la propriétaire, grille C45 sur les
    // quinze) : 30 − 3 encodés (`PO 1 § 3`, `PO 7`, `PO 12`) − 4 annoncés
    // (`GZ 13`, `GZ 14`, `AS 10`, arrêté 2018-02-23 art. 26 § 3) = 23. Les
    // huit autres sont HORS CADRE et restent ici : 15 + 8 = 23, le § 7 de
    // `docs/couverture-declaree-du-produit.md`.
    // 23 → 21 le même jour, après revue : arrêté 1986 art. 78-1 et 102,
    // d'abord classés hors cadre, sont annoncés (décision de la propriétaire).
    // 21 → 20 : `R. 4544-11` annoncé, même décision.
    // 20 → 21 le 2026-10-14 : le stock de rechange de `MS 69`, hors cadre
    // (§ 7). 20 + 1 − 0 = 21.
    expect(manquantes.filter((a) => a.toucheLaCible).length).toBe(21);
    expect(manquantes.length).toBe(21);
  });
});

describe("registre de dette — les réserves de lecture", () => {
  it("le compte des réserves ouvertes", () => {
    // 98 → 89 le 2026-09-20 : dix réserves entièrement closes sont passées
    // dans `historique`, qui ne se compte pas (sept relevées par le lot, trois
    // par sa contre-lecture : `R. 4223-11`, `PE 33`, `GC 22`), et UNE est née —
    // celle de `R. 4222-21`, encodée ce jour-là, dont l'avis du médecin du
    // travail et du CSE reste hors du produit.
    const n = CORPUS.flatMap((c) => c.articles).filter(
      (a) => a.statut === "retenu" && a.reserve,
    ).length;
    // 89 → 90 le 2026-09-21 : `PE 27`, encodé pour ses § 4 et § 5, garde
    // dehors ses § 1, § 2, § 3 — et son § 6, que la première écriture de cette
    // réserve avait oublié (l'article a SIX paragraphes, pas cinq).
    // 90 → 92 le 2026-10-07 (relecture du préventeur, lot 1) : `MS 39` entre
    // au corpus et `PE 26` passe de `sans_objet` à `retenu` pour
    // l'identification des extincteurs ; chacun garde dehors la dotation
    // (MS 39 § 2, PE 26 § 1), et PE 26 son § 2 (colonnes sèches).
    // 90 → 88 le 2026-10-07 (lot 5, compté depuis 90) : `GH 5` et `GH 61` cessent d'être retenus (IGH
    // retiré, relecture préventeur du 30/09, décision de la propriétaire du
    // 07/10). Leurs réserves passent dans `historique`, barrées ; le manque
    // est désormais `non_couvert`, compté ailleurs.
    // 88 → 87 le même jour : `R. 4323-1` cesse d'être retenu avec
    // `esp-personnel-formation` ; sa réserve passe dans `historique`.
    // 87 → 83 le même jour : `C. env. L. 512-7`, `L. 512-8`, l'arrêté du
    // 1er juin 2015 art. 22 et `R. 4412-11` cessent d'être retenus (stockage
    // « sauf 3 derniers points ») ; leurs réserves passent dans `historique`.
    // 90 → 91 le 2026-10-07 (compté depuis 90) (lot 3, C59) : `R. 4322-1` passe de `sans_objet` à
    // `retenu` pour les seuls EPI ; les équipements de travail et moyens de
    // protection collective qu'il vise aussi restent dehors.
    // Intégration des cinq lots (2026-10-07) : 90 + 2 (lot 1) − 7 (lot 5)
    // + 1 (lot 3) = 86.
    // 86 → 87 le même jour (C60, revue indépendante de la relecture) :
    // `MS 15` entre au corpus, retenu pour son § 4 (armoires de RIA
    // signalées) ; ses § 1 à § 3, règles d'implantation, restent dehors.
    // 86 + 1 − 0 = 87.
    // 87 → 89 le 2026-10-08 (C64) : `PO 1` et `PO 8` restent retenus (le
    // contrôle électrique annuel de l'hôtel) et gagnent chacun une réserve —
    // le renvoi à AS 9, question posée au préventeur, qui borne AS 9 aux
    // N1–N4 ; les deux lignes N5/O sont supprimées. 87 + 2 − 0 = 89.
    // 89 → 91 le 2026-10-14 (livre II, titre II, décision de la propriétaire) :
    // `M 29` (le SSIAP au-delà de 4 000 personnes) et `N 20` (le rappel
    // « fréquemment », sans rythme) entrent retenus avec une réserve. `CH 39`
    // garde la sienne — sa première branche, le livret, est encodée, les
    // deux autres restent. 89 + 2 − 0 = 91.
    // 91 → 93 le même jour, revue indépendante : `MS 47` (même écrit que la
    // consigne du Code du travail, champ différent) et `MS 48` (§ 2 SSIAP
    // dehors) entrent retenus en contexte, chacun avec sa réserve. 91 + 2 = 93.
    expect(n).toBe(93);
    expect(reservesDeLecture().length).toBe(n);
  });
});
