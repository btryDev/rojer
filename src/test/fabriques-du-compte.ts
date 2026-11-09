// Une ligne de chaque modèle d'un compte, pour les tests d'intégration qui
// éprouvent l'isolation (matrice d'isolation, portée d'établissement).
// Déplacé de `portee/matrice-isolation.integration.test.ts` le 2026-11-09 :
// deux tests s'en servent, une seule définition.

import { randomUUID } from "node:crypto";

export type Ligne = Record<string, unknown>;
/** Les identifiants d'un compte semé, par nom de modèle (sa première ligne), plus `compte`, `user` et `etab2`. */
export type Graine = Record<string, string>;
/** Les données d'une ligne, à partir des lignes déjà semées ; `n` rend unique ce qui doit l'être. */
export type Fabrique = (g: Graine, n: number) => Ligne;

const JOUR = new Date("2026-11-09T08:00:00Z");
const PLUS_TARD = new Date("2026-11-09T18:00:00Z");
const DANS_UN_AN = new Date("2027-11-09T00:00:00Z");

/**
 * Une ou plusieurs lignes par modèle d'un compte, dans l'ordre où elles se
 * sèment. Plusieurs variantes quand une contrainte interdit de remplir toutes
 * les clés sur une seule ligne (`Action_origine_xor`, `Verification_porteur_xor`)
 * ou qu'une clé d'identité n'est portée que par une forme (`Signature.user`) :
 * chaque clé du schéma doit être remplie par au moins une variante (vérifié
 * plus bas).
 */
export const FABRIQUES: Record<string, Fabrique[]> = {
  Entreprise: [(g, n) => ({ compteId: g.compte, raisonSociale: `E${n}`, effectif: 5, adresse: "1 rue" })],
  Etablissement: [
    (g, n) => ({ entrepriseId: g.Entreprise, raisonDisplay: `Et${n}`, adresse: "1 rue", codeNaf: "56.10A", effectifSurSite: 5 }),
  ],
  Batiment: [(g, n) => ({ etablissementId: g.Etablissement, nom: `Bat${n}` })],
  Equipement: [
    (g, n) => ({ etablissementId: g.Etablissement, batimentId: g.Batiment, categorie: "EXTINCTEUR", libelle: `Eq${n}` }),
  ],
  Salarie: [(g, n) => ({ etablissementId: g.Etablissement, nom: `N${n}`, prenom: "P" })],
  Prestataire: [
    (g, n) => ({ etablissementId: g.Etablissement, raisonSociale: `P${n}`, contactNom: "C", contactEmail: "c@exemple.invalid", domaines: [] }),
  ],
  PrescriptionParticuliere: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      source: "autre",
      effet: "obligation_sur_mesure",
      reference: `R${n}`,
      dateDocument: JOUR,
      periodicite: "annuelle",
      libelle: `L${n}`,
      equipementId: g.Equipement,
    }),
  ],
  Verification: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      obligationId: `o-eq-${n}`,
      libelleObligation: "V",
      periodicite: "annuelle",
      datePrevue: DANS_UN_AN,
      equipementId: g.Equipement,
      prestataireId: g.Prestataire,
      prescriptionId: g.PrescriptionParticuliere,
    }),
    // L'équipement XOR le salarié (`Verification_porteur_xor`).
    (g, n) => ({
      etablissementId: g.Etablissement,
      obligationId: `o-sal-${n}`,
      libelleObligation: "V",
      periodicite: "annuelle",
      datePrevue: DANS_UN_AN,
      salarieId: g.Salarie,
    }),
  ],
  RapportVerification: [
    (g) => ({ etablissementId: g.Etablissement, verificationId: g.Verification, dateRapport: JOUR, resultat: "conforme", realiseEnInterne: true }),
  ],
  Duerp: [(g) => ({ etablissementId: g.Etablissement })],
  DuerpVersion: [(g, n) => ({ duerpId: g.Duerp, numero: n, snapshot: {} })],
  UniteTravail: [(g, n) => ({ duerpId: g.Duerp, nom: `U${n}` })],
  Risque: [(g, n) => ({ uniteId: g.UniteTravail, libelle: `R${n}`, gravite: 2, probabilite: 2, maitrise: 2, criticite: 4 })],
  Action: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      libelle: `A${n}`,
      type: "suppression",
      verificationId: g.Verification,
      equipementId: g.Equipement,
      rapportOrigineId: g.RapportVerification,
    }),
    // Le risque XOR la vérification (`Action_origine_xor`).
    (g, n) => ({ etablissementId: g.Etablissement, libelle: `Ar${n}`, type: "suppression", risqueId: g.Risque }),
  ],
  PiecePrestataire: [(g, n) => ({ prestataireId: g.Prestataire, type: "kbis", fichierCle: `k${n}` })],
  PermisFeu: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      numero: n,
      prestataireRaison: "x",
      prestataireContact: "x",
      prestataireEmail: "x@exemple.invalid",
      donneurOrdreNom: "x",
      dateDebut: JOUR,
      dateFin: PLUS_TARD,
      lieu: "x",
      descriptionTravaux: "x",
      naturesTravaux: [],
      prestataireId: g.Prestataire,
      batimentId: g.Batiment,
    }),
  ],
  Signature: [
    (g) => ({
      etablissementId: g.Etablissement,
      objetType: "permis_feu",
      objetId: g.PermisFeu,
      signataireNom: "S",
      signataireEmail: "s@exemple.invalid",
      hashDocument: "0".repeat(64),
      methode: "otp_email",
    }),
    // Signée depuis un compte connecté : l'auteur est une personne (`Signature.user`).
    (g) => ({
      etablissementId: g.Etablissement,
      objetType: "permis_feu",
      objetId: g.PermisFeu,
      signataireNom: "S",
      signataireEmail: "s@exemple.invalid",
      hashDocument: "0".repeat(64),
      methode: "compte_connecte",
      userId: g.user,
    }),
  ],
  AccessToken: [
    (g) => ({
      tokenHash: randomUUID(),
      etablissementId: g.Etablissement,
      scope: "consultation",
      objetType: "permis_feu",
      objetId: g.PermisFeu,
      prestataireId: g.Prestataire,
      emailDestinataire: "x@exemple.invalid",
      expireLe: DANS_UN_AN,
      createdByUserId: g.user,
    }),
  ],
  RegistreAccessibilite: [(g) => ({ etablissementId: g.Etablissement, slugPublic: randomUUID() })],
  PlanPrevention: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      numero: n,
      entrepriseExterieureRaison: "x",
      efChefNom: "x",
      efChefEmail: "x@exemple.invalid",
      efEffectifIntervenant: 1,
      euChefNom: "x",
      dateDebut: JOUR,
      dateFin: PLUS_TARD,
      lieux: "x",
      naturesTravaux: "x",
      prestataireId: g.Prestataire,
      batimentId: g.Batiment,
    }),
  ],
  LignePlanPrevention: [(g) => ({ planPreventionId: g.PlanPrevention, risque: "x" })],
  PhaseDangereuse: [(g) => ({ planPreventionId: g.PlanPrevention, phase: "x" })],
  CarnetSanitaire: [(g) => ({ etablissementId: g.Etablissement })],
  PointReleve: [
    (g, n) => ({ carnetId: g.CarnetSanitaire, nom: `Pt${n}`, typeReseau: "ECS", seuilMinCelsius: 50, batimentId: g.Batiment }),
  ],
  ReleveTemperature: [(g) => ({ pointReleveId: g.PointReleve, dateReleve: JOUR, temperatureCelsius: 55, conforme: true })],
  AnalyseLegionelle: [(g) => ({ carnetId: g.CarnetSanitaire, dateAnalyse: JOUR, conforme: true })],
  FicheRegistre: [(g, n) => ({ etablissementId: g.Etablissement, sectionId: `s${n}`, contenu: {} })],
  TitreSalarie: [(g, n) => ({ salarieId: g.Salarie, obligationId: `t${n}`, delivreLe: JOUR })],
  DeclarationEtatPermanent: [(g, n) => ({ etablissementId: g.Etablissement, obligationId: `d${n}` })],
  PieceEtatPermanent: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      obligationId: `p${n}`,
      fichierCle: `f${n}`,
      fichierNom: "f.pdf",
      fichierMime: "application/pdf",
      fichierTaille: 1,
    }),
  ],
  Intervention: [
    (g, n) => ({
      etablissementId: g.Etablissement,
      numero: n,
      titre: "x",
      creeParUserId: g.user,
      risqueId: g.Risque,
      uniteTravailId: g.UniteTravail,
      prestataireId: g.Prestataire,
    }),
  ],
  CommentaireIntervention: [(g) => ({ interventionId: g.Intervention, auteurNom: "x", contenu: "x" })],
  DemandeAssistance: [
    (g) => ({ compteId: g.compte, userId: g.user, categorie: "diagnostic", message: "x", page: "/x", etablissementId: g.Etablissement }),
  ],
  AcceptationConditions: [(g) => ({ compteId: g.compte, userId: g.user, version: "v", empreinte: "e", contexte: "c" })],
  ConsommationQuota: [(g) => ({ compteId: g.compte, quota: "q" })],
  FichierStocke: [(g) => ({ cle: `${g.compte}/${randomUUID()}`, compteId: g.compte, octets: 1 })],
  Abonnement: [(g) => ({ compteId: g.compte, stripeCustomerId: `cus_${randomUUID()}` })],
};
