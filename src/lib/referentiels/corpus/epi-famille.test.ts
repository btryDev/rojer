// « EPI » est une famille, pas un régime — et tant que le corpus le dit,
// aucune obligation ne s'y attache.
//
// ── LE DÉFAUT QUE CETTE GARDE INTERDIT ─────────────────────────────────────
//
// L'arrêté du 19 mars 1993 soumet à vérification générale périodique — douze
// mois, par personne qualifiée — CINQ familles d'équipements de protection
// individuelle nommément désignées, et cinq seulement. La catégorie
// `CategorieEquipement.EPI` en couvre bien davantage : son propre libellé
// d'aide, dans `equipements/labels.ts`, annonce « harnais antichute et sa
// longe, casque, gants, chaussures de sécurité, protections auditives,
// masque ». Une obligation posée sur cette catégorie réclamerait donc le
// rendez-vous annuel du harnais au commerçant qui a déclaré une boîte de
// gants.
//
// Ce n'est pas une inquiétude théorique : c'est le défaut exact que le nom de
// `COMPACTEUR_PRESSE_DECHETS_MOTORISE` a été écrit pour éviter, et son
// commentaire le raconte — « une catégorie de ce nom attirerait le pétrin, le
// laminoir, la trancheuse — que l'arrêté ne vise pas —, et leur réclamerait
// tous les trois mois une vérification de criticité 5 ».
//
// ── CE QUE LA GARDE VÉRIFIE, ET POURQUOI ELLE NE SE RÉPARE PAS EN RECOPIANT ─
//
// Elle ne tient AUCUNE liste d'équipements vérifiables ou non vérifiables :
// une telle liste se réparerait en y ajoutant une ligne, donc cesserait de
// vérifier. Elle tient une IMPLICATION entre deux endroits du dépôt qui ne se
// parlent pas :
//
//   tant que le corpus déclare `obligation_manquante` la vérification
//   périodique des EPI, aucune obligation portée par équipement ne peut viser
//   la catégorie `EPI`.
//
// Les deux moitiés viennent de sources différentes — le dépouillement d'un
// côté, le référentiel de l'autre — et il n'y a qu'une façon de les faire
// s'accorder : décider. Soit on scinde la catégorie et on encode la
// vérification sur la moitié que l'arrêté nomme, auquel cas l'entrée de corpus
// passe à `retenu` et cette garde s'ouvre d'elle-même ; soit on n'encode rien.
// Retirer la garde serait la troisième voie, et c'est celle qu'elle rend
// visible.
//
// LA DÉCISION EST UNE MIGRATION, ET ELLE N'EST PAS PRISE. Les termes du choix
// sont dans le `bloquePar` de `Arrêté 1993-03-19 (EPI) art. 1er` et au journal
// des vérifications, à la date du 2026-09-04.

import { describe, expect, it } from "vitest";
import { CORPUS, type Corpus } from "./index";
import { obligationsConformite } from "../conformite";
import {
  estPorteeParEquipement,
  type Obligation,
} from "../conformite/types";
import type { CategorieEquipement } from "../types-communs";

/** La ref de l'article qui porte la liste et les douze mois. */
const ARTICLE_DE_LA_LISTE = "Arrêté 1993-03-19 (EPI) art. 1er";

/**
 * La catégorie du modèle qui mélange les deux côtés de cette liste.
 *
 * Écrite en `CategorieEquipement` et non en `string` : le jour où la scission
 * est décidée et où cette valeur disparaît de l'enum, ce fichier NE COMPILE
 * PLUS. C'est voulu — la garde doit être rouverte par quelqu'un qui sait ce
 * qu'il fait, pas contournée par un `filter` qui ne trouve plus rien.
 */
const FAMILLE_NON_SCINDEE: CategorieEquipement = "EPI";

/**
 * La contradiction, s'il y en a une, entre le dépouillement et le référentiel.
 *
 * Extraite pour que la garantie et sa contre-épreuve emploient **le même**
 * prédicat — c'est la leçon de `lecturesSansTexteModificateur` dans
 * `corpus.test.ts` et de `renvoisMorts` dans `transmission.test.ts` : une
 * contre-épreuve qui recopie la logique reste verte quand on neutralise la
 * garantie, puisqu'elles ne partagent plus rien.
 *
 * Rend les identifiants des obligations fautives. Vide si le corpus a cessé de
 * déclarer le manque — auquel cas la vérification a été encodée, et viser la
 * catégorie n'est plus une faute mais une conséquence.
 */
export function obligationsSurUneFamilleNonScindee(
  corpus: readonly Corpus[],
  obligations: readonly Obligation[],
  categorie: CategorieEquipement,
  refArticle: string,
): string[] {
  const manqueEncoreDeclare = corpus.some((c) =>
    c.articles.some(
      (a) => a.ref === refArticle && a.statut === "obligation_manquante",
    ),
  );
  if (!manqueEncoreDeclare) return [];

  return obligations
    .filter(estPorteeParEquipement)
    .filter((o) => o.categoriesEquipement.includes(categorie))
    .map((o) => o.id);
}

describe("EPI — une famille, pas un régime", () => {
  it("le dépouillement déclare toujours la vérification périodique manquante", () => {
    // La moitié qui donne son sens à la garde. Sans elle, l'implication serait
    // vraie par vacuité le jour où quelqu'un supprimerait l'entrée du corpus :
    // plus de manque déclaré, donc plus rien à interdire, et la garde
    // passerait au vert en ayant cessé de mesurer quoi que ce soit.
    const article = CORPUS.flatMap((c) => c.articles).find(
      (a) => a.ref === ARTICLE_DE_LA_LISTE,
    );
    expect(
      article,
      `${ARTICLE_DE_LA_LISTE} a disparu du corpus. Si la vérification des EPI ` +
        `a été encodée, c'est normal — mais alors ce fichier entier est à ` +
        `relire, pas à réparer.`,
    ).toBeDefined();
    expect(article!.statut).toBe("obligation_manquante");
  });

  it("aucune obligation ne vise la catégorie tant qu'elle mélange les deux régimes", () => {
    expect(
      obligationsSurUneFamilleNonScindee(
        CORPUS,
        obligationsConformite,
        FAMILLE_NON_SCINDEE,
        ARTICLE_DE_LA_LISTE,
      ),
      `Une obligation vise « ${FAMILLE_NON_SCINDEE} » alors que le corpus ` +
        `déclare encore la vérification périodique des EPI manquante. La ` +
        `catégorie couvre des équipements que l'arrêté du 19 mars 1993 ne ` +
        `nomme pas — casque, gants, chaussures de sécurité — et leur ` +
        `réclamerait un rendez-vous qu'ils ne doivent pas. Deux remèdes, ` +
        `jamais un troisième : scinder la catégorie et encoder sur la moitié ` +
        `que l'arrêté nomme (l'entrée de corpus passe alors à « retenu » et ` +
        `cette garde s'ouvre seule), ou ne rien encoder. Retirer ce test n'en ` +
        `est pas un.`,
    ).toEqual([]);
  });

  it("la garde mord sur ce qu'elle vise, et sur rien d'autre", () => {
    // CONTRE-ÉPREUVE. Le test ci-dessus est vert parce que le dépôt est en
    // règle, ce qui est indistinguable — sur le seul dépôt — d'une garde qui
    // ne mordrait sur rien. C'est le mode de panne exact de ce genre de garde,
    // et il est arrivé plusieurs fois ici. Les cas fabriqués la font mordre,
    // et exercent les trois frontières qui la définissent : la catégorie
    // visée, l'état du dépouillement, et le porteur.
    const corpusTemoin = (statut: "obligation_manquante" | "retenu"): Corpus[] => [
      {
        id: "temoin",
        intitule: "Corpus témoin",
        url: "https://example.invalid/",
        portee: "Cas fabriqués pour éprouver la garde.",
        etendue: "articles_cites",
        articles: [
          statut === "obligation_manquante"
            ? {
                ref: ARTICLE_DE_LA_LISTE,
                luLe: "2026-09-04",
                lecture: "premiere_main",
                statut: "obligation_manquante",
                motif: "Motif de test, assez long pour tenir les autres contrôles.",
              }
            : {
                ref: ARTICLE_DE_LA_LISTE,
                luLe: "2026-09-04",
                lecture: "premiere_main",
                statut: "retenu",
                obligations: ["epi-temoin"],
              },
        ],
      },
    ];

    const parEquipement = (
      id: string,
      categories: [CategorieEquipement, ...CategorieEquipement[]],
    ) =>
      ({
        id,
        categoriesEquipement: categories,
      }) as unknown as Obligation;

    const etablissement = (id: string, contexte: CategorieEquipement[]) =>
      ({
        id,
        porteur: "etablissement",
        equipementsEnContexte: contexte,
      }) as unknown as Obligation;

    // LE CAS VISÉ : le manque est déclaré, une obligation d'équipement vise la
    // famille. Attrapé, et nommé.
    expect(
      obligationsSurUneFamilleNonScindee(
        corpusTemoin("obligation_manquante"),
        [parEquipement("epi-temoin", ["EPI"])],
        FAMILLE_NON_SCINDEE,
        ARTICLE_DE_LA_LISTE,
      ),
    ).toEqual(["epi-temoin"]);

    // BORNE HAUTE : le jour où la vérification est encodée, l'entrée de corpus
    // cesse d'être « manquante » et la MÊME obligation devient légitime. Sans
    // ce cas, la garde pourrait interdire pour toujours ce qu'elle ne doit
    // interdire que pour l'instant, et le seul moyen de livrer serait de la
    // supprimer.
    expect(
      obligationsSurUneFamilleNonScindee(
        corpusTemoin("retenu"),
        [parEquipement("epi-temoin", ["EPI"])],
        FAMILLE_NON_SCINDEE,
        ARTICLE_DE_LA_LISTE,
      ),
    ).toEqual([]);

    // COUCHE VOISINE, ET C'EST TOUT L'ENJEU DU LOT : une obligation posée sur
    // une catégorie qui ne mélange PAS les deux régimes ne doit rien
    // déclencher. C'est ce que fait déjà `COMPACTEUR_PRESSE_DECHETS_MOTORISE`,
    // dont le nom porte le champ de son arrêté ; c'est ce que ferait une
    // catégorie d'EPI issue de la scission. Sans ce cas, une garde qui
    // crierait sur toute obligation d'équipement passerait pour juste.
    expect(
      obligationsSurUneFamilleNonScindee(
        corpusTemoin("obligation_manquante"),
        [parEquipement("voisine", ["COMPACTEUR_PRESSE_DECHETS_MOTORISE"])],
        FAMILLE_NON_SCINDEE,
        ARTICLE_DE_LA_LISTE,
      ),
    ).toEqual([]);

    // LIMITE ASSUMÉE, PAS UN OUBLI : le porteur. La garde ne regarde que les
    // obligations portées par ÉQUIPEMENT, celles qui produisent une ligne de
    // calendrier par appareil déclaré. `equipementsEnContexte`, sur un porteur
    // établissement, est un affichage indicatif — l'obligation existe même si
    // rien n'est déclaré, et nommer « EPI » à ce titre ne réclame aucun
    // rendez-vous à personne. Le harnais et les gants y figureraient sans
    // dommage. Ce cas fige la frontière : l'élargir serait une décision, pas
    // un effet de bord.
    expect(
      obligationsSurUneFamilleNonScindee(
        corpusTemoin("obligation_manquante"),
        [etablissement("contexte-seul", ["EPI"])],
        FAMILLE_NON_SCINDEE,
        ARTICLE_DE_LA_LISTE,
      ),
    ).toEqual([]);
  });
});
