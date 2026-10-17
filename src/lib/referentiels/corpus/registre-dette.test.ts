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
    //
    // [] → treize le 2026-10-16 : la lecture des chapitres de types du titre II
    // (catégories 1 à 4) et du chapitre V du livre III. Rien ne les bloque —
    // dix sont des rattachements à une ligne existante (personnel désigné,
    // interdiction de fumer affichée, schéma d'organisation, instruction du
    // personnel de 5ᵉ), les autres des lignes d'établissement bornées N1–N4 et
    // au type (exercices de J, R et U, consignes de J et U). Rien n'est encodé :
    // la propriétaire décide, et la liste se vide à l'encodage. Le plan :
    // `propositions/lecture-chapitres-types-erp-2026-10-16.md`.
    expect(parCause("libre").map((a) => a.ref)).toEqual([
      // Seconde relecture du 2026-10-17 : `PE 18`, ligne de partage 10.
      // ~~"PE 18"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      "PU 6",
      // 2026-10-17, revue indépendante : ~~six~~ quatre articles du titre Ier ouverts
      // en suivant les renvois des chapitres de types, au corpus
      // `arrete-1980-livre-2` [seconde revue, même jour : `MS 41` et `MS 70 § 5`
      // passent `a_trancher`, classe GN 10 / A6].
      // ~~"MS 58 § 3 et § 4 — contrat d'entretien de la détection, annexé au registre"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"EC 13 — notice annexée au registre et entretiens consignés"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"GE 5"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"CO 48 § 3 e) — contrat d'entretien des portes automatiques"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // 2026-10-17, `lot/ref-a-corpus-titre-1` : le titre Ier lu en entier,
      // quinze actes que rien ne bloque — rattachements à une ligne existante
      // (registre, exercices, personnel désigné, visites, désenfumage) ou
      // lignes proposées au plan du 2026-10-17 (§ 4). Transitoires : le
      // sous-lot C les rattache ou les encode.
      // Revue du même jour : ~~"CH 23"~~, ~~"CH 24"~~ (annonces décidées,
      // `non_couvert`) sortent ; `CH 17`, `EL 17`, `GC 15`, `MS 66` entrent.
      // ~~"GE 3"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"GE 10"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // Seconde relecture du 2026-10-17 (ligne de partage 11, affichages) :
      // ~~"CO 45 § 5 — inscription « sans issue » des portes en cul-de-sac"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"CO 47 § 2 — avertissement porté par les portes coupe-feu maintenues ouvertes"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"CO 59 — g) consignes affichées dans l'espace d'attente sécurisé"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"DF 9"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"CH 17"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"CH 38 — 6° avertissement affiché aux accès des filtres"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"CH 52"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"EL 17"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"AS 11"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"GC 4"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"GC 15"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"MS 51"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"MS 52"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"MS 57"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"MS 66"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"MS 67"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"MS 68"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"MS 72"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"MS 74"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"MS 75"~~ — 2026-10-17, sous-lot C : retenu ou annoncé.
      // ~~"P 21"~~ — 2026-10-17, sous-lot D : retenu (rattachement).
      "R 33",
      // ~~"S 15"~~ — 2026-10-17, sous-lot D : retenu (rattachement).
      // ~~"T 52"~~ — 2026-10-17, sous-lot D : retenu (rattachement).
      "U 41",
      "U 43",
      "U 47",
      "U 48",
      // ~~"Y 19"~~ — 2026-10-17, sous-lot D : retenu (rattachement).
      "J 35",
      "J 39",
      "J 40",
    ]);
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
      // [0, 0] → [13, 0] le 2026-10-16 : lecture des chapitres de types (titre II,
      // et PU 6 au livre III), 0 + 13 − 0 ; voir le test des « libres ».
      // [13, 0] → [19, 0] le 2026-10-17 (revue indépendante) : six articles du
      // titre Ier ouverts par les renvois, 13 + 6 − 0.
      // [19, 0] → [17, 0] le 2026-10-17 (seconde revue) : `MS 41` et `MS 70 § 5`
      // passent `a_trancher`, politique sœur de PE 27 § 6 (GN 10, décision A6).
      // [17, 0] → [32, 0] le 2026-10-17 (`lot/ref-a-corpus-titre-1`, titre Ier
      // lu en entier) : 17 + 15 − 0, voir le test des « libres ».
      // [32, 0] → [34, 0] après la revue du même jour : 32 − 2 + 4 — `CH 23`,
      // `CH 24` annoncés ; `CH 17`, `EL 17`, `GC 15`, `MS 66` entrent.
      // [34, 0] → [40, 0] après la seconde relecture : 34 + 6 — `CO 45 § 5`,
      // `CO 47 § 2`, `CO 59 — g)`, `CH 38 — 6°`, `CH 52` (affichages, ligne de
      // partage 11) et `PE 18` (présence, ligne de partage 10).
      // [40, 0] → [13, 0] le 2026-10-17 (sous-lot C, `lot/ref-c-incendie-n1-n4`) :
      // 40 − 27 + 0 — vingt retenus (lignes nouvelles ou rattachements), sept
      // annoncés (`non_couvert`) ; voir le test des « libres ».
      // [13, 0] → [9, 0] le 2026-10-17 (sous-lot D) : `P 21`, `S 15`, `Y 19`,
      // `T 52` retenus (rattachements).
      libre: [9, 0],
      // 9 → 6 le 2026-09-21 : les trois de la chaleur intense (`R. 4463-4`,
      // `-5`, `-7`) sont encodées sur la page « Quand ça arrive ».
      // 6 → 0 le même jour : cinq relues à la source et encodées ; la sixième,
      // `L. 8222-5`, passe en `a_trancher` — ce qui la retient est la décision
      // sur le module de vigilance, plus l'absence de surface.
      // [0, 1] → [1, 0] le 2026-10-12 (cible redéfinie le 2026-10-12) : arrêté 1986 art. 102.
      // [1, 0] → [0, 0] le 2026-10-13 : arrêté 1986 art. 102 annoncé (`non_couvert`).
      // [0, 0] → [1, 0] le 2026-10-17 : `EL 23 § 2`, la vérification des
      // installations semi-permanentes à chaque montage.
      // [1, 0] → [2, 0] le 2026-10-17 (`lot/ref-a-corpus-titre-1`) : `MS 42`
      // § 2, les plans fournis à la demande des sapeurs-pompiers.
      // [2, 0] → [1, 0] le même jour : `MS 42` passe `non_couvert` (décision de c6).
      // [1, 0] → [0, 0] le 2026-10-17 (sous-lot C) : `EL 23 § 2` annoncé.
      evenement: [0, 0],
      // [5, 6] → [11, 0] le 2026-10-12 (cible redéfinie le 2026-10-12) : `GZ 13`, `GZ 14`, `CO 61`,
      // `AS 10`, `GC 18`, arrêté 2018-02-23 art. 26 § 3.
      // [11, 0] → [7, 0] le 2026-10-13 (décision de la propriétaire) : `GZ 13`,
      // `GZ 14`, `AS 10` et l'arrêté 2018-02-23 art. 26 § 3 annoncés
      // (`non_couvert`). Restent HORS CADRE `CO 61`, `GC 18`.
      // [7, 0] → [11, 0] le 2026-10-16 : les gaz médicaux, `J 33`, `U 62`,
      // `U 64` (titre II) et `PU 5` (livre III), 7 + 4 − 0 ; à évaluer, rien
      // d'encodé.
      // [11, 0] → [16, 0] le 2026-10-17 (`lot/ref-a-corpus-titre-1`, titre Ier
      // lu en entier) : 11 + 5 − 0 — `CO 10` (dispositif de franchissement),
      // `AM 18` (sièges rembourrés), `CH 35` (fluide frigorigène inflammable,
      // une propriété que la catégorie ne porte pas), `AS 5` (ascenseur
      // d'évacuation), `AS 8` (escalier mécanique, matériel non couvert).
      // [16, 0] → [13, 0] le même jour (décision de c6) : `CO 10`, `AM 18`,
      // `CH 35` passent `non_couvert`.
      // [13, 0] → [11, 0] après la revue : `AS 5`, `AS 8` annoncés (`non_couvert`).
      // [11, 0] → [12, 0] le 2026-10-17 (sous-lot B) : `X annexe`, venu
      // d'`a_trancher`, hors cadre — aucune catégorie de désinfection des eaux.
      categorie_equipement: [12, 0],
      // 4 → 1 le 2026-09-27 (C45) : `R. 4227-23`, `R. 4227-24` et l'art. 8 de
      // l'arrêté du 10 septembre 2021 passent `non_couvert`, annoncés.
      // [1, 2] → [3, 0] le 2026-10-12 (cible redéfinie le 2026-10-12) : `MS 71`, arrêté 1986 art. 60.
      // [3, 0] → [5, 0] le 2026-10-17 (`lot/ref-a-corpus-titre-1`) : `T 29` § 3
      // et `T 33` § 2, la puissance installée que Rojer ne connaît pas.
      // [5, 0] → [3, 0] après la revue : `T 29`, `T 33` annoncés (`non_couvert`).
      // [3, 0] → [4, 0] le 2026-10-17 (sous-lot B) : `X 1 § 2`, venu
      // d'`a_trancher`, hors cadre — aucun attribut de piscine transformable.
      attribut_etablissement: [4, 0],
      // 5 → 0 le 2026-09-27 (C45) : `R. 1321-60` et les art. 4, 9, 10, 12 de
      // l'arrêté du 10 septembre 2021, annoncés (`non_couvert`).
      // [0, 1] → [1, 0] le 2026-10-12 (cible redéfinie le 2026-10-12) : arrêté 1986 art. 78-1.
      // [1, 0] → [0, 0] le 2026-10-13 : arrêté 1986 art. 78-1 annoncé (`non_couvert`).
      destinataire: [0, 0],
      // 6 → 4 le 2026-09-27 (C45) : `R. 4227-26` encodé (retenu), `R. 4225-3`
      // annoncé. Restent quatre HORS CADRE (`R. 4323-61`, `-69`, arrêté 1993
      // art. 8 et annexe III).
      // [4, 1] → [5, 0] le 2026-10-12 (cible redéfinie le 2026-10-12) : `R. 4323-89`.
      // [5, 0] → [6, 0] le 2026-10-17 (revue de `lot/ref-a-corpus-titre-1`) :
      // `M 35`, machines-outils mises à la disposition du public.
      // [6, 0] → [5, 0] le 2026-10-17 (sous-lot D) : `M 35` annoncé dans
      // l'aide du type M (`non_couvert`).
      activite_exercee: [5, 0],
      // 3 → 0 le 2026-09-27 (C45) : `L. 8222-1`, `D. 8222-5`, `D. 8222-7`
      // annoncés.
      // [0, 0] → [1, 0] le 2026-10-17 : `MS 46 § 3`, la convention avec un
      // organisateur annexée au registre.
      // [1, 0] → [0, 0] le 2026-10-17 (sous-lot C) : `MS 46 § 3` annoncé.
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
      // [4, 0] → [5, 0] le 2026-10-15 : « M 40 § 3 e) — contrat d'entretien
      // des machines de nettoyage à sec », HORS CADRE (décision de la
      // propriétaire, une condition d'activité).
      // [5, 0] → [6, 0] le 2026-10-16 : `X 25`, l'interdiction de fumer
      // signalée en salle de sport couverte, contre l'exclusion
      // `risque_specialise` (« équipements sportifs »), à évaluer. [2026-10-17,
      // sous-lot B : les équipements sportifs sont sortis de l'exclusion.]
      // [6, 0] → [8, 0] le 2026-10-17 (revue indépendante) : `X annexe` et
      // `X 1 § 2`, les actes « piscines » du type X sortis de l'exclusion.
      // [8, 0] → [10, 0] le 2026-10-17 (seconde revue) : `MS 41` et `MS 70 § 5`,
      // venus de `libre` — la classe GN 10 / A6 de PE 27 § 6.
      // [10, 0] → [8, 0] le 2026-10-17 (sous-lot B) : `X annexe` et `X 1 § 2`
      // tranchés hors cadre (piscines), vers `categorie_equipement` et
      // `attribut_etablissement`.
      // [8, 0] → [6, 0] le 2026-10-17 (sous-lot C) : `MS 41` et `MS 70 § 5`
      // retenus — la classe GN 10 / A6 tranchée pour eux par la propriétaire
      // (servis N1–N4, phrase GN 10).
      // [6, 0] → [5, 0] le 2026-10-17 (sous-lot D) : `X 25` retenu (décision
      // Q1 de la propriétaire).
      a_trancher: [5, 0],
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
    // 21 → 22 le 2026-10-15 : le contrat d'entretien de `M 40 § 3 e)`, hors
    // cadre (§ 7), une condition d'activité. 21 + 1 − 0 = 22.
    // 22 → 40 le 2026-10-16 : 22 + 18 − 0 — seize articles du titre II
    // (`P 21`, `R 33`, `S 15`, `T 52`, `U 41`, `U 43`, `U 47`, `U 48`, `U 62`,
    // `U 64`, `X 25`, `Y 19`, `J 33`, `J 35`, `J 39`, `J 40`) et deux du
    // livre III (`PU 5`, `PU 6`). Toutes dans la cible ; aucune hors cadre :
    // elles sont au § 9 (à évaluer), pas au § 7.
    // 40 → 48 le 2026-10-17 (revue indépendante) : 40 + 8 − 0 — les huit
    // articles du titre Ier ouverts en suivant les renvois (`MS 41`,
    // `MS 58 § 3 et § 4`, `EC 13`, `MS 70 § 5`, `GE 5`, `MS 46 § 3`,
    // `EL 23 § 2`, `CO 48 § 3 e)`), au § 9.
    // 48 → 50 le 2026-10-17 : 48 + 2 − 0 — `X annexe` et `X 1 § 2`.
    // 50 → 71 le 2026-10-17 (`lot/ref-a-corpus-titre-1`) : 50 + 21 − 0 — les
    // vingt et un actes du titre Ier lu en entier, tous dans la cible.
    // 71 → 69 le même jour : 71 − 4 + 2 (décision de c6 : `CO 10`, `AM 18`,
    // `CH 35`, `MS 42` annoncés ou muets ; `T 29`, `T 33` entrent).
    // 69 → 68 après la revue : 69 − 6 + 5 (annonces décidées sorties ; CH 17,
    // EL 17, GC 15, MS 66, M 35 entrés).
    // 68 → 74 après la seconde relecture : 68 + 6 − 0.
    // 74 → 43 le 2026-10-17 (sous-lot C, `lot/ref-c-incendie-n1-n4`), mesuré
    // en appelant : 74 − 31 + 0 — vingt-deux retenus (douze entrées fondent
    // les dix lignes nouvelles, dix sont rattachées), neuf annoncés (`non_couvert`).
    // 43 → 37 le 2026-10-17 (sous-lot D, `lot/ref-d-types`), mesuré en
    // appelant : 43 − 6 + 0 — `P 21`, `S 15`, `Y 19`, `T 52`, `X 25` retenus
    // (rattachements), `M 35` annoncé (`non_couvert`).
    expect(manquantes.filter((a) => a.toucheLaCible).length).toBe(37);
    expect(manquantes.length).toBe(37);
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
    // 89 → 90 le 2026-10-14 (`lot/dae`) : `CCH R. 157-1` entre au corpus,
    // retenu pour son 1° (ERP 1 à 4) ; le 2° (5ᵉ catégorie, arrêté du seuil non
    // publié) reste en réserve. 89 + 1 − 0 = 90.
    // 90 → 92 le 2026-10-14 (livre II, titre II, décision de la propriétaire) :
    // `M 29` (le SSIAP au-delà de 4 000 personnes) et `N 20` (le rappel
    // « fréquemment », sans rythme) entrent retenus avec une réserve. `CH 39`
    // garde la sienne — sa première branche, le livret, est encodée, les
    // deux autres restent. 90 + 2 − 0 = 92.
    // 92 → 94 le même jour, revue indépendante : `MS 47` (même écrit que la
    // consigne du Code du travail, champ différent) et `MS 48` (§ 2 SSIAP
    // dehors) entrent retenus en contexte, chacun avec sa réserve. 92 + 2 = 94.
    // 94 → 96 le 2026-10-17 (sous-lot F, légionelles au matériel) : l'art. 3
    // de l'arrêté du 1er février 2010 (remise en service, surveillance
    // renforcée, fichier sanitaire complet) et son art. 4 (mesures correctives)
    // passent `retenu` avec une réserve ; l'annexe 2 passe `retenu` sans
    // réserve. 94 + 2 − 0 = 96.
    // 96 → 110 le 2026-10-17 (sous-lot C, `lot/ref-c-incendie-n1-n4`),
    // mesuré en appelant : 96 + 14 − 0 — quatorze articles du titre Ier
    // retenus avec ce qu'ils imposent encore (`MS 57`, `MS 66`, `EL 17`,
    // `MS 68`, `EC 13`, `GC 4`, `MS 52`, `GE 3`, `CH 17`, `MS 51`, `MS 67`,
    // `MS 72`, `DF 9`, `AS 11`).
    // 110 → 111 le 2026-10-17 (sous-lot D) : `X 25` retenu avec sa réserve —
    // la 5ᵉ catégorie par PX 1, non étendue (décision de c6). 110 + 1 − 0.
    expect(n).toBe(111);
    expect(reservesDeLecture().length).toBe(n);
  });
});
