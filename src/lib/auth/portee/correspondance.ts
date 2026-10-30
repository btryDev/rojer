// Table de correspondance de l'isolation des comptes (ADR-051 § 1).
//
// Pour chaque modèle Prisma : la relation qui mène à son parent, jusqu'à
// `Entreprise.userId` — ou le motif qui le met hors compte. Écrite une fois,
// ici ; `correspondance.test.ts` lit la liste des modèles dans le schéma
// (pas une liste recopiée) et échoue si un modèle n'y est pas classé, ou si un
// chemin ne suit pas une relation obligatoire du schéma.

/** Racine d'un compte : la colonne qui porte l'identifiant de l'utilisateur. */
export type Racine = { racine: "userId" };
/** Rattachement : la relation (obligatoire) vers le modèle parent. */
export type Rattachement = { parent: string };
/** Hors compte : jamais servi par le client borné. */
export type HorsCompte = { horsCompte: string };

export type Classement = Racine | Rattachement | HorsCompte;

export const CORRESPONDANCE: Record<string, Classement> = {
  // Racines
  Entreprise: { racine: "userId" },
  // `DemandeAssistance.userId` est posé par l'action d'un compte connecté ;
  // son `etablissementId` est facultatif (ADR-050).
  DemandeAssistance: { racine: "userId" },

  Etablissement: { parent: "entreprise" },

  // Par l'établissement
  Duerp: { parent: "etablissement" },
  Batiment: { parent: "etablissement" },
  Equipement: { parent: "etablissement" },
  Verification: { parent: "etablissement" },
  PrescriptionParticuliere: { parent: "etablissement" },
  RapportVerification: { parent: "etablissement" },
  Action: { parent: "etablissement" },
  Prestataire: { parent: "etablissement" },
  Signature: { parent: "etablissement" },
  AccessToken: { parent: "etablissement" },
  RegistreAccessibilite: { parent: "etablissement" },
  PermisFeu: { parent: "etablissement" },
  PlanPrevention: { parent: "etablissement" },
  CarnetSanitaire: { parent: "etablissement" },
  FicheRegistre: { parent: "etablissement" },
  Salarie: { parent: "etablissement" },
  DeclarationEtatPermanent: { parent: "etablissement" },
  Intervention: { parent: "etablissement" }, // module retiré (ADR-018), table encore là

  // Un cran plus loin
  DuerpVersion: { parent: "duerp" },
  UniteTravail: { parent: "duerp" },
  Risque: { parent: "unite" },
  PiecePrestataire: { parent: "prestataire" },
  LignePlanPrevention: { parent: "plan" },
  PhaseDangereuse: { parent: "plan" },
  PointReleve: { parent: "carnet" },
  ReleveTemperature: { parent: "pointReleve" },
  AnalyseLegionelle: { parent: "carnet" },
  TitreSalarie: { parent: "salarie" },
  CommentaireIntervention: { parent: "intervention" },

  // Hors compte
  QuotaEnvoiOtp: {
    horsCompte: "quota d'envoi d'OTP par jeton : compteur technique, lu et écrit avant toute identité (accès prestataire)",
  },
  LimiteDebit: {
    horsCompte: "limitation de débit par clé (IP, jeton) : compteur technique, lu avant toute identité",
  },
};

export function estHorsCompte(c: Classement): c is HorsCompte {
  return "horsCompte" in c;
}
export function estRacine(c: Classement): c is Racine {
  return "racine" in c;
}
