// Les pièces du ZIP « Préparer un contrôle », nommées UNE fois.
//
// LE DÉFAUT (audit du 2026-10-12). L'écran « Préparer un contrôle » listait
// six « Pièces incluses » ; le ZIP qu'il fait télécharger en contient onze —
// permis de feu, plans de prévention, carnet sanitaire, rapports de
// laboratoire et fichiers des rapports (`Rapports/`) n'étaient pas annoncés.
// Deux listes écrites à la main, l'une dans la route, l'autre dans la page :
// la seconde avait cessé de suivre la première.
//
// Désormais la route écrit ses fichiers sous ces noms, le README les décrit
// sous ces noms, et l'écran parcourt `PIECES_A_L_ECRAN`, que
// `pieces-zip.test.ts` tient égale à ces clés (hors README) et dont il
// vérifie que la route n'écrit aucun nom en dur.
//
// Module pur : il se charge dans la route, la page et les tests. Les filtres
// de lecture partagés par la route et l'écran (fenêtre de douze mois, rapports
// hors salariés, cinq dernières analyses) sont ici pour la même raison : un
// écran qui annonce une pièce doit compter ce que le ZIP compte.

import { MOIS_FENETRE_HISTORIQUE, ajouterMois, debutDuJour } from "@/lib/dates";

/** Les noms, tels qu'ils figurent dans l'archive. Un dossier finit par « / ». */
export const PIECES_ZIP = {
  readme: "00_README.txt",
  dossier: "01_Dossier_conformite.pdf",
  /** Préfixe : le fichier est `02_DUERP_v<n>.pdf` (`fichierDuerp`). */
  duerp: "02_DUERP",
  registre: "03_Registre_securite.pdf",
  rapports: "Rapports/",
  plan: "04_Plan_actions.pdf",
  accessibilite: "05_Accessibilite_URL.txt",
  permisFeu: "06_Permis_de_feu.txt",
  plansPrevention: "07_Plans_de_prevention.txt",
  carnet: "08_Carnet_sanitaire.txt",
  analyses: "08_Carnet_sanitaire_analyses/",
  prestataires: "Prestataires/",
} as const;

export type ClePiece = keyof typeof PIECES_ZIP;

export function fichierDuerp(numero: number): string {
  return `${PIECES_ZIP.duerp}_v${numero}.pdf`;
}

/** Le nom d'un dossier de l'archive sans sa barre finale (`zip.folder`). */
export function nomDeDossier(nom: `${string}/`): string {
  return nom.slice(0, -1);
}

/** Les pièces que l'écran annonce, dans l'ordre du ZIP. Le README n'en est
 *  pas une : l'écran le nomme dans sa phrase d'en-tête. */
export const PIECES_A_L_ECRAN: readonly {
  cle: Exclude<ClePiece, "readme">;
  titre: string;
}[] = [
  { cle: "dossier", titre: "Dossier de conformité consolidé" },
  { cle: "duerp", titre: "DUERP versionné" },
  { cle: "registre", titre: "Registre de sécurité" },
  { cle: "rapports", titre: "Fichiers des rapports de vérification" },
  { cle: "plan", titre: "Plan d'actions correctives" },
  { cle: "accessibilite", titre: "Registre d'accessibilité ERP" },
  { cle: "permisFeu", titre: "Permis de feu (12 derniers mois)" },
  { cle: "plansPrevention", titre: "Plans de prévention (12 derniers mois)" },
  { cle: "carnet", titre: "Carnet sanitaire" },
  { cle: "analyses", titre: "Rapports de laboratoire des analyses légionelles" },
  { cle: "prestataires", titre: "Attestations prestataires" },
];

/* ─── Ce que la route et l'écran comptent de la même façon ─────────────── */

/**
 * Le début de la fenêtre des permis de feu et des plans de prévention, en
 * mois calendaires et ramené à minuit (voir la route : une borne qui garde
 * l'heure courante fait disparaître l'après-midi une pièce présente le matin).
 */
export function debutFenetreDossier(maintenant: Date): Date {
  return debutDuJour(ajouterMois(maintenant, -MOIS_FENETRE_HISTORIQUE));
}

/** Permis de feu et plans de prévention qui entrent au dossier. */
export function filtreActesDuDossier(etablissementId: string, maintenant: Date) {
  return {
    etablissementId,
    dateDebut: { gte: debutFenetreDossier(maintenant) },
    statut: { notIn: ["brouillon" as const, "annule" as const] },
  };
}

/** Les rapports dont le fichier entre au dossier : jamais ceux d'une ligne de
 *  salarié, documents nominatifs (contre-lecture du 2026-09-27, M1). */
export function filtreRapportsDuDossier(etablissementId: string) {
  return { etablissementId, verification: { salarieId: null } };
}

/** Le carnet sanitaire ne porte au dossier que ses cinq dernières analyses. */
export const NB_ANALYSES_DU_DOSSIER = 5;
