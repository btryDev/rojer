// Les lignes de la « checklist avant le contrôle » que le produit sait remplir.
//
// POURQUOI CE MODULE EXISTE PLUTÔT QU'UNE FONCTION LOCALE. Ces deux lignes
// partent dans le ZIP remis à un inspecteur, et elles ont été écrites FAUSSES
// une première fois, le 2026-09-20, de deux façons opposées :
//
//  · « [x] Aucune vérification en retard à ce jour » se cochait sur un
//    compteur initialisé à `0` hors du `try` — donc sur une brique en échec,
//    un dossier introuvable, ou un calendrier jamais calculé. C'est le faux
//    vert que `calendrier/etat-affiche.ts` a été écrit pour fermer le même
//    jour : « un comptage n'a de sens que sur un ensemble qu'on sait
//    complet » ;
//  · « [!] DUERP : dernière version de plus de 12 mois » s'imprimait sans
//    l'effectif, alors que R. 4121-2 1° réserve la mise à jour annuelle aux
//    entreprises « d'au moins onze salariés ». Un restaurant de six salariés
//    se voyait imputer un manquement que le texte ne lui impose pas — dans le
//    ZIP même dont le PDF applique la bonne règle.
//
// Une route d'API n'est importée par aucun test, et il n'existe pas de
// `route.test.ts` sous `controle-zip/`. Ces deux règles vivent donc ici, où
// elles peuvent être éprouvées.

import { EFFECTIF_MAJ_ANNUELLE, evaluerEtatDuerp } from "@/lib/dashboard/duerp";
import { mentionAConfirmer } from "@/lib/matching/effectif-entreprise";
import { faitRetards, type FaitRetards, type LectureRetards } from "./fait-retards";

export type EtatDuerpLu = ReturnType<typeof evaluerEtatDuerp>;

/**
 * La ligne DUERP de la checklist.
 *
 * TROIS CAS, ET ILS NE DISENT PAS LA MÊME CHOSE. Pas de version figée ; une
 * entreprise soumise à la mise à jour annuelle dont l'échéance est passée ;
 * une entreprise qui n'y est pas soumise, à qui l'on dit l'âge sans en faire
 * un manquement.
 *
 * `null` = l'état n'a pas pu être lu. La case reste alors vide : ne pas savoir
 * n'est ni une bonne ni une mauvaise nouvelle, et la cocher dans un sens
 * l'affirmerait.
 *
 * La règle d'effectif n'est PAS réécrite ici : elle est lue sur l'état que
 * `evaluerEtatDuerp` rend, qui en est le seul domicile dans ce dépôt
 * (`lib/pdf/builders.ts` : « vit dans `evaluerEtatDuerp` et NULLE PART
 * AILLEURS »).
 */
export function ligneDuerp(etat: EtatDuerpLu | null, lu = true): string {
  const f = faitDuerp(etat, lu);
  return ` [${f.coche}] ${f.texte}`;
}

/** Même forme que `FaitRetards` : la coche, et le texte. */
export type FaitDuerp = FaitRetards;

/**
 * Le fait DUERP, avant sa mise en case — la même forme que `faitRetards`.
 *
 * SORTI DE `ligneDuerp` LE 2026-10-12 (audit B3) : l'écran « Préparer un
 * contrôle » disait le DUERP « À jour » dès qu'une version existait, quand le
 * README du ZIP qu'il fait télécharger écrivait « mise à jour annuelle
 * échue » sur le même dossier. L'écran lit désormais ce fait-ci : la coche
 * décide de sa pastille, le texte est le même.
 */
export function faitDuerp(etat: EtatDuerpLu | null, lu = true): FaitDuerp {
  // Une lecture en échec n'est pas « aucune version » (contre-lecture du
  // 2026-09-26) : la case reste vide, et dit pourquoi.
  if (!lu) return { coche: " ", texte: "DUERP : non déterminé (lecture des versions en échec)" };
  if (etat === null || !etat.aVersionValidee) {
    return { coche: " ", texte: "DUERP : aucune version figée — à créer avant le contrôle" };
  }
  if (!etat.soumisMajAnnuelle) {
    return etat.versionRecente
      ? { coche: "x", texte: "DUERP : version de moins de 12 mois" }
      : {
          coche: " ",
          texte:
            "DUERP : version de plus de 12 mois — la mise à jour annuelle" +
            " ne vous est pas exigée (moins de 11 salariés)",
        };
  }
  if (etat.majAnnuelleAConfirmer) {
    // Soumis par la seule prudence commune aux seuils d'entreprise (C37) :
    // la pièce remise au contrôleur n'affirme pas une échéance échue — ni
    // « [!] » ni « [x] » sur un seuil qu'on ne sait pas atteint.
    return etat.estAJour
      ? { coche: "x", texte: "DUERP à jour depuis moins de 12 mois" }
      : {
          coche: " ",
          texte: `DUERP : version de plus de 12 mois — mise à jour annuelle (art. R. 4121-2) ${mentionAConfirmer(EFFECTIF_MAJ_ANNUELLE)}`,
        };
  }
  return etat.estAJour
    ? { coche: "x", texte: "DUERP à jour depuis moins de 12 mois" }
    : { coche: "!", texte: "DUERP : mise à jour annuelle échue (art. R. 4121-2)" };
}

/**
 * La pastille d'écran d'un fait de la checklist : la même lecture que la case
 * qu'il coche — « [x] » à jour, « [!] » en retard, « [ ] » à planifier.
 * « Préparer un contrôle » la lit pour le DUERP (2026-10-12, audit B3).
 */
export function pastilleDuFait(
  f: FaitDuerp,
): "a_jour" | "en_retard" | "a_planifier" {
  return f.coche === "x" ? "a_jour" : f.coche === "!" ? "en_retard" : "a_planifier";
}

/**
 * L'état du DUERP d'un dossier, lu par le ZIP et par l'écran avec les mêmes
 * entrées : la dernière version figée et les deux effectifs déclarés. `null`
 * sans version — `faitDuerp` dit alors « aucune version figée ».
 */
export function etatDuerpDuDossier(
  derniereVersion: { createdAt: Date } | null,
  etablissement: { effectifSurSite: number; entreprise: { effectif: number } },
  maintenant: Date,
): EtatDuerpLu | null {
  if (!derniereVersion) return null;
  return evaluerEtatDuerp(
    {
      ouvert: true,
      dateDerniereVersion: derniereVersion.createdAt,
      effectifs: {
        entreprise: etablissement.entreprise.effectif,
        site: etablissement.effectifSurSite,
      },
    },
    maintenant,
  );
}

/**
 * La ligne des vérifications en retard.
 *
 * `null` ne se rabat JAMAIS sur zéro. Zéro retard est un fait favorable ; ne
 * pas savoir n'en est pas un, et les confondre est exactement ce qui a fait
 * cocher cette case sur un dossier dont le calendrier n'avait jamais été
 * calculé.
 */
//
// ~~Zéro se cochait toujours~~ (relecture du 2026-09-26) : zéro sur un
// calendrier jamais calculé, ou sur un inventaire vide, n'est pas un fait
// favorable. La règle vit dans `fait-retards.ts`, que le dossier de
// conformité et le registre lisent aussi.
//
// Le renvoi à 01 ne se fait que si 01 est dans le ZIP : le compte est lu
// avant le rendu, qui peut échouer (contre-lecture du 2026-09-26).
export function ligneVerifsEnRetard(l: LectureRetards, dossierInclus = true): string {
  const f = faitRetards(l);
  return f.coche === "!"
    ? ` [!] ${f.texte}${dossierInclus ? " — voir 01_Dossier_conformite.pdf" : ""}`
    : ` [${f.coche}] ${f.texte}`;
}
