// Le README du ZIP de contrôle — `00_README.txt`.
//
// SORTI DE LA ROUTE LE 2026-09-26, et pour la même raison que
// `checklist-controle.ts` l'avait été : une route Next n'exporte que ses
// verbes HTTP, aucun test ne l'importe, et ce texte part chez un tiers. Le
// fait « aucun équipement déclaré » (`docs/chantiers-ouverts.md` § 15) y est
// entré ce jour-là ; laissé dans la route, il n'aurait été tenu par rien.
// Déplacement à l'identique, hors ce fait.
//
// Module **pur** : la route lui passe ce qu'elle a lu.

import { MARQUAGE_CONTRACTUEL } from "@/lib/prescriptions/sources";
import {
  R4512_7_1_SEUIL,
  R4512_7_2_DUREE,
  R4512_7_2_LISTE,
  R4512_7_ECRIT,
} from "@/lib/plan-prevention/annonces-plan";
import type { evaluerEtatDuerp } from "@/lib/dashboard/duerp";
import type { ManqueCouverture } from "@/lib/perimetre/couverture";
import { ligneDuerp, ligneVerifsEnRetard } from "./checklist-controle";

/**
 * Coupe un paragraphe en lignes d'au plus `largeur` caractères, sans couper un
 * mot. Le README est un `.txt` lu dans un bloc-notes, sans retour à la ligne
 * automatique garanti : une phrase de trois cents caractères y devient une
 * ligne que le lecteur ne voit pas en entier.
 */
function decouper(texte: string, largeur: number): string[] {
  const lignes: string[] = [];
  let courante = "";
  for (const mot of texte.split(" ")) {
    if (courante === "") courante = mot;
    else if (courante.length + 1 + mot.length <= largeur) courante += ` ${mot}`;
    else {
      lignes.push(courante);
      courante = mot;
    }
  }
  if (courante !== "") lignes.push(courante);
  return lignes;
}

export function genererReadme(args: {
  raisonSociale: string;
  etablissement: string;
  adresse: string;
  dateNow: string;
  duerpNumeroVersion: number | null;
  aDuerpPdf: boolean;
  aRegistreAccessibilite: boolean;
  nbPrestataires: number;
  nbPermisFeu: number;
  nbPlansPrevention: number;
  aCarnetSanitaire: boolean;
  /** Échéances nées d'une demande d'assureur et imprimées dans ce dossier
   *  (ADR-032). Zéro = rien à annoncer, et rien n'est écrit. */
  nbEcheancesContractuelles: number;
  /** L'état du DUERP tel que `evaluerEtatDuerp` le rend — la seule règle du
   *  dépôt qui connaisse le seuil d'effectif de R. 4121-2. `null` quand aucune
   *  version n'est figée, ou que sa lecture a échoué. */
  etatDuerp: ReturnType<typeof evaluerEtatDuerp> | null;
  /** Vérifications dépassées à la date d'édition, telles que le dossier de
   *  conformité les compte — même source, pour que les deux pièces du ZIP ne
   *  divergent pas. `null` = NON DÉTERMINÉ : la brique a échoué, ou le dossier
   *  est introuvable. Ne jamais rabattre sur `0` : zéro retard est une bonne
   *  nouvelle, ne pas savoir n'en est pas une. */
  nbVerifsEnRetard: number | null;
  /** Ce qu'il faut savoir de l'âge du calendrier, ou `null` s'il est à jour.
   *  En tête du README plutôt qu'en pied : un lecteur qui s'arrête à la
   *  première page doit l'avoir vu, et c'est lui qui décide ensuite comment
   *  lire les sections d'échéances. */
  avertissementCalendrier: string | null;
  /** « Aucun équipement en service n'est déclaré », ou `null`. Au même
   *  endroit que l'avertissement, et pour la même raison : sans lui, des
   *  sections d'échéances vides se lisent comme « rien à signaler ». */
  inventaire: ManqueCouverture | null;
}): string {
  const lignes: string[] = [];
  lignes.push(
    `DOSSIER DE CONFORMITÉ — ${args.raisonSociale}`,
    `Établissement : ${args.etablissement}`,
    `Adresse : ${args.adresse}`,
    `Généré le : ${args.dateNow}`,
    "",
    ...(args.avertissementCalendrier || args.inventaire
      ? [
          "────────────────────────────────────────────────────────────",
          " À LIRE AVANT LE RESTE",
          "────────────────────────────────────────────────────────────",
          "",
          ...(args.avertissementCalendrier
            ? [
                ...decouper(args.avertissementCalendrier, 60).map((l) => ` ${l}`),
                "",
              ]
            : []),
          ...(args.inventaire
            ? [
                ...decouper(args.inventaire.motif, 60).map((l) => ` ${l}`),
                ...decouper(args.inventaire.consequence, 60).map((l) => ` ${l}`),
                "",
              ]
            : []),
        ]
      : []),
    "────────────────────────────────────────────────────────────",
    " CONTENU DU DOSSIER",
    "────────────────────────────────────────────────────────────",
    "",
    " 01_Dossier_conformite.pdf     Synthèse globale (à présenter en premier)",
    args.aDuerpPdf
      ? ` 02_DUERP_v${args.duerpNumeroVersion}.pdf           Document unique d'évaluation des risques`
      : " 02_DUERP.pdf                  Non inclus (aucune version validée)",
    " 03_Registre_securite.pdf      Rapports de vérifications périodiques",
    " 04_Plan_actions.pdf           Écarts ouverts priorisés",
    args.aRegistreAccessibilite
      ? " 05_Accessibilite_URL.txt      URL publique du registre d'accessibilité"
      : " 05_Accessibilite_URL.txt      Non inclus (registre non publié)",
    args.nbPermisFeu > 0
      ? ` 06_Permis_de_feu.txt          ${args.nbPermisFeu} permis sur 12 mois (INRS ED 6030)`
      : " 06_Permis_de_feu.txt          Aucun permis émis sur 12 mois",
    args.nbPlansPrevention > 0
      ? ` 07_Plans_de_prevention.txt    ${args.nbPlansPrevention} plan(s) (art. R. 4512-6 CT)`
      : " 07_Plans_de_prevention.txt    Aucun plan actif",
    args.aCarnetSanitaire
      ? " 08_Carnet_sanitaire.txt       Relevés ECS + analyses légionelles (arrêté 01-02-2010)"
      : " 08_Carnet_sanitaire.txt       Non configuré",
    args.nbPrestataires > 0
      ? ` Prestataires/                 Attestations URSSAF, RC Pro, Kbis (${args.nbPrestataires})`
      : " Prestataires/                 Aucun prestataire déclaré",
    "",
    "────────────────────────────────────────────────────────────",
    " CHECKLIST AVANT LE CONTRÔLE",
    "────────────────────────────────────────────────────────────",
    "",
    // DEUX CASES QUE LE PRODUIT SAIT REMPLIR, ET QUI RESTAIENT VIDES. Le
    // dossier connaît l'âge de la dernière version de DUERP et le nombre de
    // vérifications en retard : les laisser à cocher à la main faisait relire
    // au dirigeant ce que le ZIP venait de calculer, et lui faisait cocher de
    // confiance. Les autres cases restent vides — elles portent sur des faits
    // que le produit n'observe pas (une lecture, un affichage en entrée, une
    // signature avant travaux).
    " [ ] Dossier de conformité lu en entier (10 min)",
    ligneDuerp(args.etatDuerp),
    ligneVerifsEnRetard(args.nbVerifsEnRetard),
    " [ ] Plan d'actions : tous écarts majeurs ont une date d'échéance",
    " [ ] Attestations URSSAF prestataires < 6 mois",
    " [ ] Registre d'accessibilité affiché (ERP) — QR code en entrée",
    " [ ] Formation sécurité du personnel à jour",
    " [ ] Permis de feu signés avant tout travail par point chaud",
    // Les DEUX cas de R. 4512-7 : « EE ≥ 400 h » taisait le 2°, les travaux
    // dangereux, « quelle que soit la durée prévisible de l'opération »
    // (contre-lecture du 2026-09-26). « Signés » n'était pas dans le texte :
    // l'article dit « établi par écrit et arrêté ».
    ` [ ] Plans de prévention « ${R4512_7_ECRIT} » (art. R. 4512-7) : 1° opération « ${R4512_7_1_SEUIL} » ; 2° « ${R4512_7_2_LISTE} » par arrêté, « ${R4512_7_2_DUREE.charAt(0).toLowerCase()}${R4512_7_2_DUREE.slice(1)} »`,
    " [ ] Carnet sanitaire renseigné, si votre eau chaude collective alimente des points d'usage à risque accessibles au public — température mensuelle, légionelles annuelles au minimum",
    "",
    "────────────────────────────────────────────────────────────",
    " CADRE LÉGAL DES OBLIGATIONS",
    "────────────────────────────────────────────────────────────",
    "",
    " DUERP :                    art. R. 4121-1 à R. 4121-4 Code du travail",
    " Vérifications :            art. R. 4226-16 et s. Code du travail",
    " Registre de sécurité :     art. R. 4323-25 et R. 4323-26 Code du travail",
    "                            (conservation : art. D. 4711-3, cinq ans)",
    " Accessibilité ERP :        art. R. 164-6 CCH · arrêté 19-04-2017",
    " Vigilance donneur d'ordre : art. L. 8222-1 Code du travail",
    // ~~« Permis de feu : art. R. 4224-17 Code du travail »~~ — retiré le
    // 2026-09-20. R. 4224-17 impose l'entretien et la vérification des
    // INSTALLATIONS ET DISPOSITIFS techniques et de sécurité des lieux de
    // travail (verbatim au corpus `code-travail-portes`) ; il ne dit rien d'un
    // permis de travail par point chaud. Et ce même README écrit dix lignes
    // plus bas que l'INRS ED 6030 et la règle APSAD R43 ne sont « ni article
    // de code, ni arrêté » : lui donner un article de code au-dessus le
    // contredisait dans le même document, celui qu'on remet à un inspecteur.
    " Permis de feu :            voir « ni code, ni arrêté » ci-dessous",
    " Plan de prévention :       art. R. 4512-6 à R. 4512-12 CT",
    // ~~« · art. R. 1321-23 CSP »~~ — retiré le 2026-09-20. Le corpus a
    // établi le 2026-09-02 que son destinataire est « la personne responsable
    // de la production ou de la distribution d'eau », c'est-à-dire
    // l'exploitant du réseau PUBLIC, et non l'établissement raccordé. Le
    // badge a été retiré de l'écran ce jour-là ; il était resté dans le ZIP.
    " Carnet sanitaire eau :     arrêté du 1er février 2010 (ERP, eau chaude collective, points d'usage à risque)",
    " Maintien en conformité :   art. R. 4224-17 Code du travail",
    "",
    // APSAD R43 et l'INRS ED 6030 figuraient dans la liste ci-dessus, entre
    // deux articles de code, sous le titre « CADRE LÉGAL ». Ce document est
    // remis à un inspecteur, un assureur, un bailleur ou un acquéreur : y
    // présenter une règle de la profession de l'assurance comme du droit est
    // une affirmation que le produit ne peut pas soutenir. Les deux
    // référentiels restent nommés — ils fondent réellement la pratique — mais
    // sous leur propre titre, et en disant ce qu'ils opposent.
    "────────────────────────────────────────────────────────────",
    " RÉFÉRENTIELS CITÉS DANS CE DOSSIER — NI CODE, NI ARRÊTÉ",
    "────────────────────────────────────────────────────────────",
    "",
    " INRS ED 6030 :             recommandation de l'Institut national de",
    "                            recherche et de sécurité. Ni article de",
    "                            code, ni arrêté.",
    " Règle APSAD R43 :          référentiel de la profession de l'assurance",
    "                            (travaux par points chauds). Ni article de",
    "                            code, ni arrêté ; un contrat d'assurance",
    "                            peut y renvoyer.",
    "",
  );
  // Le même titre que ci-dessus vaudrait pour ces lignes, mais elles ne sont
  // pas de même nature : un référentiel privé est cité, une échéance
  // contractuelle est PLANIFIÉE et figure dans les tableaux. Le lecteur du
  // dossier doit savoir que certaines des lignes qu'il vient de lire
  // n'engagent pas l'employeur devant l'administration (ADR-032).
  //
  // Rien n'est écrit quand il n'y en a pas : une mention rassurante sur un
  // dossier qui n'en contient aucune apprendrait au lecteur une distinction
  // dont il n'a que faire, et ferait chercher ce qui n'existe pas.
  if (args.nbEcheancesContractuelles > 0) {
    const n = args.nbEcheancesContractuelles;
    lignes.push(
      "────────────────────────────────────────────────────────────",
      " ÉCHÉANCES CONTRACTUELLES FIGURANT DANS CE DOSSIER",
      "────────────────────────────────────────────────────────────",
      "",
      ` ${n} échéance${n > 1 ? "s" : ""} de ce dossier ${n > 1 ? "naissent" : "naît"} d'une demande de`,
      " votre assureur, et non d'un texte. Chacune porte la mention",
      ` « ${MARQUAGE_CONTRACTUEL} »`,
      " là où elle apparaît. Aucune référence légale ne leur est",
      " attachée.",
      "",
    );
  }
  lignes.push(
    "────────────────────────────────────────────────────────────",
    "",
    "Document généré automatiquement par Rojer.",
    "Ne remplace pas un conseil juridique. Responsabilité finale : employeur.",
    "",
  );
  return lignes.join("\n");
}
