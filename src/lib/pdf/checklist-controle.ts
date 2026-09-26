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

import type { evaluerEtatDuerp } from "@/lib/dashboard/duerp";
import { faitRetards, type LectureRetards } from "./fait-retards";

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
export function ligneDuerp(etat: EtatDuerpLu | null): string {
  if (etat === null || !etat.aVersionValidee) {
    return " [ ] DUERP : aucune version figée — à créer avant le contrôle";
  }
  if (!etat.soumisMajAnnuelle) {
    return etat.versionRecente
      ? " [x] DUERP : version de moins de 12 mois"
      : " [ ] DUERP : version de plus de 12 mois — la mise à jour annuelle" +
          " ne vous est pas exigée (moins de 11 salariés)";
  }
  return etat.estAJour
    ? " [x] DUERP à jour depuis moins de 12 mois"
    : " [!] DUERP : mise à jour annuelle échue (art. R. 4121-2)";
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
export function ligneVerifsEnRetard(l: LectureRetards): string {
  const f = faitRetards(l);
  return f.coche === "!"
    ? ` [!] ${f.texte} — voir 01_Dossier_conformite.pdf`
    : ` [${f.coche}] ${f.texte}`;
}
