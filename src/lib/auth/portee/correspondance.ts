// Table de correspondance de l'isolation des comptes (ADR-051 § 1).
//
// Pour chaque modèle Prisma : la relation qui mène à son parent, jusqu'à
// `Entreprise.compteId` — ou le motif qui le met hors compte. Écrite une fois,
// ici ; `correspondance.test.ts` lit la liste des modèles dans le schéma
// (pas une liste recopiée) et échoue si un modèle n'y est pas classé, ou si un
// chemin ne suit pas une relation obligatoire du schéma.

/** Racine d'un compte : la colonne qui porte l'identifiant du compte (ADR-054). */
export type Racine = { racine: "compteId" };
/** Rattachement : la relation (obligatoire) vers le modèle parent. */
export type Rattachement = { parent: string };
/** Hors compte : jamais servi par le client borné. */
export type HorsCompte = { horsCompte: string };
/**
 * Identité : hors compte comme les autres tables d'authentification, mais des
 * lignes du compte y pointent. Une relation vers elle ne désigne que la valeur
 * de la portée nommée par `porteePar` (borne.ts) : `Compte` le compte,
 * `User` la personne qui agit (ADR-054 § 3).
 */
export type Identite = { identite: string; porteePar: "userId" | "compteId" };

export type Classement = Racine | Rattachement | HorsCompte | Identite;

import type { Prisma } from "@prisma/client";

export const CORRESPONDANCE = {
  // Racines (ADR-054 : le compte, plus l'utilisateur)
  Entreprise: { racine: "compteId" },
  // Posée par l'action d'un membre connecté, qui en est l'auteur (`userId`) ;
  // son `etablissementId` est facultatif (ADR-050).
  DemandeAssistance: { racine: "compteId" },
  AcceptationConditions: { racine: "compteId" },
  ConsommationQuota: { racine: "compteId" },
  FichierStocke: { racine: "compteId" },
  // L'abonnement du compte (ADR-053) : écrit depuis un webhook signé, par le
  // client borné au compte que désigne l'objet Stripe relu.
  Abonnement: { racine: "compteId" },

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
  PieceEtatPermanent: { parent: "etablissement" }, // ADR-056
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
  EssaiEntreprise: {
    horsCompte: "un essai par entreprise (ADR-053 § 8) : le SIREN déjà essayé, lu à travers les comptes par `abonnements/essai-entreprise.ts`",
  },
  EvenementStripe: {
    horsCompte: "événement Stripe reçu (ADR-053) : dédoublonnage des livraisons, écrit avant toute identité",
  },

  // Better Auth (ADR-052) : lues et écrites par son adaptateur, avec le client
  // hors compte (`auth/better-auth.ts`), avant toute identité.
  User: { identite: "l'utilisateur de Better Auth : les auteurs (signature, lien, demande) y pointent", porteePar: "userId" },

  // Comptes et membres (ADR-054) : le plugin `organization` de Better Auth.
  Compte: { identite: "le compte : les racines y pointent", porteePar: "compteId" },
  Membre: {
    horsCompte: "appartenance d'une personne à un compte : relue par `auth/membres.ts` avant de construire la portée",
  },
  InvitationCompte: {
    horsCompte: "invitation à rejoindre un compte : lue et écrite par le plugin `organization`, avant l'appartenance",
  },
  Session: { horsCompte: "session Better Auth : lue pour établir l'identité" },
  Account: { horsCompte: "moyen d'authentification Better Auth (mot de passe haché)" },
  AuthVerification: {
    horsCompte: "jeton de vérification Better Auth (e-mail, réinitialisation, défi et appareil de confiance de la double authentification)",
  },
  TwoFactor: { horsCompte: "second facteur Better Auth (secret TOTP et codes de secours, chiffrés), lu à la connexion" },
} satisfies Record<Prisma.ModelName, Classement>;

/** Hors compte au sens du client borné : il ne lit ni n'écrit ces modèles. */
export function estHorsCompte(c: Classement): c is HorsCompte | Identite {
  return "horsCompte" in c || "identite" in c;
}
export function estRacine(c: Classement): c is Racine {
  return "racine" in c;
}

/**
 * Les clés d'identité SANS relation au schéma. Sur `main` (pas de modèle
 * `User`), `Signature.userId` et `AccessToken.createdByUserId` y figurent :
 * leur valeur ne peut être que l'utilisateur du compte, ou `null`. Sur `cc`,
 * ce sont des relations vers `User`, bornées comme l'identité : la table est
 * vide (`borne.ts` refuse au chargement une entrée qui serait la clé d'une
 * relation).
 */
export const IDENTITES_SCALAIRES: Partial<Record<Prisma.ModelName, readonly string[]>> = {};
