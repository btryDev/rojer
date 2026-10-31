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
/**
 * Identité (le `User` de Better Auth, sur cc) : hors compte comme les autres
 * tables d'authentification, mais des lignes du compte y pointent ; une
 * relation vers elle ne désigne que le compte de la portée (borne.ts).
 */
export type Identite = { identite: string };

export type Classement = Racine | Rattachement | HorsCompte | Identite;

import type { Prisma } from "@prisma/client";

export const CORRESPONDANCE = {
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
} satisfies Record<Prisma.ModelName, Classement>;

/** Hors compte au sens du client borné : il ne lit ni n'écrit ces modèles. */
export function estHorsCompte(c: Classement): c is HorsCompte | Identite {
  return "horsCompte" in c || "identite" in c;
}
export function estRacine(c: Classement): c is Racine {
  return "racine" in c;
}

/**
 * Les clés d'identité SANS relation au schéma : sur `main`, il n'y a pas de
 * modèle `User` (l'identité vit chez Supabase), et `Signature.userId`,
 * `AccessToken.createdByUserId` sont de simples colonnes. Leur valeur ne peut
 * être que l'utilisateur du compte, ou `null` (seconde lecture du 2026-10-31).
 * Sur `cc`, elles deviennent des relations vers `User`, bornées comme telles :
 * l'entrée doit alors partir — `borne.ts` refuse au chargement une entrée qui
 * désigne la clé d'une relation.
 */
export const IDENTITES_SCALAIRES: Partial<Record<Prisma.ModelName, readonly string[]>> = {
  Signature: ["userId"],
  AccessToken: ["createdByUserId"],
};
