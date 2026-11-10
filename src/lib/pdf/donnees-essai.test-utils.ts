// Des données d'essai pour les documents PDF, partagées par les tests (lot
// pdf-b1) : le processus de rendu doit rendre chaque type comme la mise en page
// sur place, et ses données doivent se cloner sans perte.

import type { DossierData } from "./DossierConformiteDocument";
import type { BlocEtatsPermanents } from "./mentions-etats-permanents";
import type { PlanActionsData } from "./PlanActionsDocument";
import type { PointsACorrigerData } from "./PointsACorrigerDocument";
import type { RegistreData } from "./RegistreDocument";
import type { DuerpSnapshot } from "@/lib/versions/snapshot";

export const VIDE: BlocEtatsPermanents = {
  chapeau: null,
  compteur: null,
  etats: [],
  faits: [],
  noteFaits: null,
  vide: "Aucune obligation de ce type ne s'applique à cet établissement.",
  nonEnPlaceParLesTitres: 0,
};

export function dossier(etatsPermanents: BlocEtatsPermanents): DossierData {
  return {
    entreprise: "Btry",
    siret: "12345678900011",
    etablissement: "Le Comptoir",
    adresse: "1 rue des Lilas",
    effectifSurSite: 6,
    codeNaf: "56.10A",
    regimesTexte: "Établissement de travail, ERP type N cat. 5",
    materielsNonCouverts: [],
    regime: { estERP: true, estIGH: false },
    genereLe: new Date("2026-09-01T10:00:00Z"),
    couverture: null,
    avertissementCalendrier: null,
    calendrier: { etat: "a_jour" },
    score: {
      valeur: 100,
      niveau: "indetermine",
      libelle: "Reste à renseigner",
      indetermines: 12,
      indeterminationsCouverture: 0,
    },
    etatsPermanents,
    duerp: null,
    compteurs: {
      verifsEnRetard: 0,
      verifsPlanifiees: 0,
      verifsRealisees12m: 0,
      actionsOuvertes: 0,
      actionsEnRetard: 0,
      pointsOuverts: 0,
      pointsEnRetard: 0,
    },
    rapportsRecents: [],
    verifsEnRetard: [],
    verifsAConfirmer: [],
    verifsPourInformation: [],
    actionsEnCours: [],
    pointsEnCours: [],
  };
}

/** Un registre de `n` rapports, du plus récent au plus ancien. */
export function registre(n: number): RegistreData {
  return {
    entreprise: "Btry",
    etablissement: "Le Comptoir",
    adresse: "1 rue des Lilas",
    genereLe: new Date("2026-11-10T10:00:00Z"),
    calendrier: { etat: "a_jour" },
    regime: { estERP: true, estIGH: false },
    inventaire: null,
    bilan: { dues: 0, outillees: 0, faites: 0, aRemplir: 0, tenuesAilleurs: 0, nonOutillees: 0 },
    parties: [],
    rapports: Array.from({ length: n }, (_, i) => ({
      id: `r${i}`,
      dateRapport: new Date(Date.UTC(2026, 10, 1) - i * 86_400_000),
      resultat: "conforme",
      realisePar: "Bureau de contrôle",
      libelleObligation: `Vérification périodique des installations électriques ${i}`,
      equipementLibelle: `Tableau ${i % 12}`,
      domaine: "electricite",
      fichierNomOriginal: "r.pdf",
      commentaires: null,
      points:
        i % 9 === 0
          ? [{ id: `p${i}`, libelle: "Prise", etat: "corrige", corrigeLe: new Date(Date.UTC(2026, 10, 2)), justification: "Remplacée", pieceJointe: false }]
          : [],
    })),
    verifsEnAttente: [],
  };
}

export function planActions(): PlanActionsData {
  return {
    entreprise: "Btry",
    etablissement: "Le Comptoir",
    adresse: "1 rue des Lilas",
    genereLe: new Date("2026-11-10T10:00:00Z"),
    totalOuvertes: 0,
    totalEnCours: 0,
    totalLevees: 2,
    actions: [],
  };
}

export function pointsACorriger(): PointsACorrigerData {
  return {
    entreprise: "Btry",
    etablissement: "Le Comptoir",
    adresse: "1 rue des Lilas",
    appareil: "Tableau électrique",
    genereLe: new Date("2026-11-10T10:00:00Z"),
    ouverts: [],
    corriges: [],
  };
}

/** Un DUERP d'une unité, deux risques et leurs mesures. */
export function duerp(): DuerpSnapshot {
  return {
    version: 2,
    genereLe: "2026-10-12T09:00:00.000Z",
    motif: "Mise à jour annuelle",
    referentielSecteurId: "bureau",
    entreprise: {
      raisonSociale: "Cabinet Exemple",
      siret: null,
      codeNaf: "69.20Z",
      effectif: 6,
      adresse: "1 rue des Lilas",
    },
    unites: [
      {
        id: "u1",
        nom: "Bureaux",
        description: null,
        estTransverse: false,
        aucunRisqueJustif: null,
        risques: [1, 2].map((k) => ({
          id: `r${k}`,
          referentielId: null,
          libelle: `Risque ${k}`,
          description: null,
          gravite: 2,
          probabilite: 2,
          maitrise: 1,
          criticite: 4,
          cotationSaisie: true,
          nombreSalariesExposes: null,
          dateMesuresPhysiques: null,
          exposeCMR: false,
          mesures: [
            { id: `m${k}a`, libelle: "Mesure existante", type: "protection_collective", statut: "existante", echeance: null, responsable: null },
            { id: `m${k}b`, libelle: "Mesure prévue", type: "protection_collective", statut: "prevue", echeance: "2027-01-15", responsable: "Gérant" },
          ],
        })),
      },
    ],
  };
}
