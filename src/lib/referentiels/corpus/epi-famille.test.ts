// « EPI » est une famille, pas un régime — et l'obligation ne vise que la
// moitié que l'arrêté nomme.
//
// ── CE QUE CETTE GARDE INTERDIT ────────────────────────────────────────────
//
// L'arrêté du 19 mars 1993 soumet à vérification générale périodique — moins
// de douze mois au moment de l'utilisation, par personne qualifiée, en service
// ou en stock — CINQ familles d'équipements de protection individuelle
// nommément désignées, et cinq seulement. La catégorie `CategorieEquipement.EPI`
// en couvre bien davantage : son libellé d'aide annonce « harnais antichute et
// sa longe, casque, gants, chaussures de sécurité, protections auditives,
// masque ». Une obligation posée sur cette catégorie réclamerait le rendez-vous
// annuel du harnais au commerçant qui a déclaré une boîte de gants.
//
// Ce n'est pas une inquiétude théorique : c'est le défaut exact que le nom de
// `COMPACTEUR_PRESSE_DECHETS_MOTORISE` a été écrit pour éviter — « une
// catégorie de ce nom attirerait le pétrin, le laminoir, la trancheuse — que
// l'arrêté ne vise pas —, et leur réclamerait tous les trois mois une
// vérification de criticité 5 ».
//
// ── CE QUE LA PREMIÈRE VERSION TENAIT, ET POURQUOI ELLE A ÉTÉ RÉÉCRITE ──────
//
// Écrite le 2026-09-04 au matin, elle tenait une IMPLICATION : tant que le
// corpus déclarait `obligation_manquante` la vérification des EPI, aucune
// obligation ne pouvait viser `EPI`. Elle prévoyait sa propre fin — « si la
// vérification a été encodée, c'est normal, mais alors ce fichier entier est à
// relire, pas à réparer ». La scission a été décidée l'après-midi même,
// l'obligation encodée, l'article passé à `retenu` : la condition est tombée,
// et le fichier a été relu.
//
// ── CE QU'ELLE TIENT MAINTENANT ────────────────────────────────────────────
//
// Deux propriétés, et aucune n'est une liste recopiée :
//
//   1. L'ARRÊTÉ NOMME CINQ FAMILLES. Le compte se RELÈVE dans le verbatim de
//      l'article, pas ici. Le jour où une sixième y apparaît — parce que le
//      texte a changé, ou parce que quelqu'un a corrigé une omission de
//      lecture —, ce test tombe et force à décider où elle se range. Une liste
//      écrite ici se serait réparée en la recopiant, donc aurait cessé de
//      mesurer.
//
//   2. CHAQUE FAMILLE A UNE CATÉGORIE, ET `EPI` N'EN EST JAMAIS UNE. Le
//      rangement est déclaré — cinq entrées de texte vers trois catégories —
//      et chaque clé doit se retrouver TELLE QUELLE dans le verbatim : une
//      reformulation de l'arrêté fait tomber le test au lieu de laisser un
//      rangement pointer dans le vide.
//
// La troisième propriété est la conséquence des deux premières et se vérifie
// à part : aucune obligation portée par équipement ne cite `EPI`.

import { describe, expect, it } from "vitest";
import { CORPUS } from "./index";
import { obligationsConformite } from "../conformite";
import { estPorteeParEquipement } from "../conformite/types";
import type { CategorieEquipement } from "../types-communs";

/** La ref de l'article qui porte la liste et les douze mois. */
const ARTICLE_DE_LA_LISTE = "Arrêté 1993-03-19 (EPI) art. 1er";

/** L'obligation qui en découle depuis le 2026-09-04. */
const OBLIGATION = "epi-verification-generale-periodique";

/**
 * La catégorie qui reste du côté NON vérifiable de la liste.
 *
 * Écrite en `CategorieEquipement` et non en `string` : le jour où cette valeur
 * disparaîtrait de l'enum, ce fichier NE COMPILE PLUS. C'est voulu — la garde
 * doit être rouverte par quelqu'un qui sait ce qu'il fait, pas contournée par
 * un `filter` qui ne trouve plus rien.
 */
const FAMILLE_NON_VERIFIABLE: CategorieEquipement = "EPI";

/**
 * Où se range chacune des cinq entrées de l'arrêté.
 *
 * Les clés sont des FRAGMENTS DU VERBATIM, et le test exige de chacune qu'elle
 * s'y retrouve mot pour mot : c'est ce qui empêche ce rangement de survivre à
 * une reformulation du texte. Trois catégories pour cinq entrées — les deux
 * appareils respiratoires et les cartouches qui les alimentent partagent acte,
 * rythme, réalisateur et détenteur.
 */
const RANGEMENT: Record<string, CategorieEquipement> = {
  "appareils de protection respiratoire autonomes destinés à l'évacuation":
    "EPI_RESPIRATOIRE",
  "appareils de protection respiratoire et équipements complets destinés à des interventions accidentelles en milieu hostile":
    "EPI_RESPIRATOIRE",
  "gilets de sauvetage gonflables": "EPI_GILET_SAUVETAGE",
  "systèmes de protection individuelle contre les chutes de hauteur":
    "EPI_ANTICHUTE",
  "stocks de cartouches filtrantes antigaz pour appareils de protection respiratoire":
    "EPI_RESPIRATOIRE",
};

function articleDeLaListe() {
  const article = CORPUS.flatMap((c) => c.articles).find(
    (a) => a.ref === ARTICLE_DE_LA_LISTE,
  );
  if (!article) {
    throw new Error(
      `${ARTICLE_DE_LA_LISTE} a disparu du corpus. C'est lui qui porte la ` +
        "liste des équipements soumis à vérification et les douze mois : sans " +
        "lui, l'obligation encodée ne repose sur aucun texte lu.",
    );
  }
  return article;
}

/** Les familles énumérées par le verbatim, relevées et non recopiées. */
function famillesDeLArrete(): string[] {
  const verbatim = articleDeLaListe().citationCle ?? "";
  const apresLeDeuxPoints = verbatim.slice(verbatim.indexOf(" : ") + 3);
  return apresLeDeuxPoints
    .split(";")
    .map((f) => f.replace(/^\s*[-–—]\s*/, "").replace(/\s*\.\s*$/, "").trim())
    .filter((f) => f.length > 0);
}

describe("EPI — une famille, pas un régime", () => {
  it("l'arrêté énumère cinq familles, et le compte se lit dans le texte", () => {
    const familles = famillesDeLArrete();
    expect(
      familles,
      "Le verbatim de l'arrêté n'énumère plus cinq familles. Si le texte a " +
        "changé, ou si une omission de lecture a été corrigée, il faut " +
        "décider où la nouvelle famille se range — `RANGEMENT` ci-dessus — et " +
        "non ajuster ce compte.",
    ).toHaveLength(5);
  });

  it("chaque entrée du rangement se retrouve mot pour mot dans le verbatim", () => {
    // Ce qui empêche le rangement de pointer dans le vide après une
    // reformulation : il n'est pas une copie du texte, il s'y raccroche.
    const familles = famillesDeLArrete();
    const orphelines = Object.keys(RANGEMENT).filter(
      (cle) => !familles.some((f) => f === cle),
    );
    expect(
      orphelines,
      "Ces clés de rangement ne correspondent à aucune famille du verbatim : " +
        "le texte a été reformulé, ou la clé a été écrite de mémoire.",
    ).toEqual([]);
    expect(
      familles.filter((f) => !(f in RANGEMENT)),
      "Ces familles de l'arrêté ne sont rangées nulle part.",
    ).toEqual([]);
  });

  it("l'obligation vise exactement les catégories du rangement", () => {
    const obligation = obligationsConformite.find((o) => o.id === OBLIGATION);
    expect(obligation, `${OBLIGATION} a disparu du référentiel.`).toBeDefined();
    if (!obligation || !estPorteeParEquipement(obligation)) {
      throw new Error(`${OBLIGATION} n'est plus portée par un équipement.`);
    }
    const attendues = [...new Set(Object.values(RANGEMENT))].sort();
    expect(
      [...obligation.categoriesEquipement].sort(),
      "Les catégories visées par l'obligation ne sont plus celles où les " +
        "familles de l'arrêté se rangent.",
    ).toEqual(attendues);
  });

  it("aucune obligation ne vise la famille non vérifiable", () => {
    // La propriété qui protège le dirigeant : le casque, les gants et les
    // chaussures restent en `EPI`, et rien ne leur réclame de rendez-vous.
    const fautives = obligationsConformite
      .filter(estPorteeParEquipement)
      .filter((o) =>
        (o.categoriesEquipement as readonly string[]).includes(
          FAMILLE_NON_VERIFIABLE,
        ),
      )
      .map((o) => o.id);
    expect(
      fautives,
      `Ces obligations visent \`${FAMILLE_NON_VERIFIABLE}\`, qui couvre le ` +
        "casque, les gants et les chaussures de sécurité — que l'arrêté du " +
        "19 mars 1993 ne soumet à aucune vérification. Visez les catégories " +
        "que l'arrêté nomme, ou n'encodez rien.",
    ).toEqual([]);
  });

  it("l'article est retenu, et il nomme l'obligation qui en découle", () => {
    // La moitié qui empêche les deux endroits de dériver : le corpus dit d'où
    // vient l'obligation, le référentiel dit ce qu'elle exige, et chacun
    // nomme l'autre.
    const article = articleDeLaListe();
    expect(article.statut).toBe("retenu");
    if (article.statut !== "retenu") return;
    expect(article.obligations).toContain(OBLIGATION);
  });
});
