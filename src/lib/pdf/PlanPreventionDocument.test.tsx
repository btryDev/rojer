// Le PDF du plan de prévention (2026-11-19, ADR-061 § 7) : il se rend, porte
// les sections de la fiche, signale une rubrique de R. 4512-8 vide, n'imprime
// que les signatures en vigueur, et se dit « document de travail » tant
// qu'une partie n'a pas signé.

import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { elementsDansLOrdre, texteDirect } from "./arbre-rendu.test-utils";
import {
  MENTION_DOCUMENT_DE_TRAVAIL,
  MENTION_NON_SCELLE,
  PlanPreventionDocument,
  adresseDeVerification,
  nomFichierPlanPrevention,
  type PlanPreventionData,
  type SignaturePlanPdf,
} from "./PlanPreventionDocument";

const HASH_EU = "a".repeat(64);
const HASH_EE = "b".repeat(64);
const HASH_REVOQUEE = "c".repeat(64);

const sigEU: SignaturePlanPdf = {
  id: "sig_eu",
  partie: "entreprise_utilisatrice",
  signataireNom: "Claire Martin",
  signataireRole: "Gérante",
  horodatageIso: new Date("2026-11-18T09:30:00Z"),
  methode: "compte_connecte",
  hashDocument: HASH_EU,
  active: true,
};
const sigEE: SignaturePlanPdf = {
  id: "sig_ee",
  partie: "entreprise_exterieure",
  signataireNom: "Paul Durand",
  signataireRole: null,
  horodatageIso: new Date("2026-11-18T10:00:00Z"),
  methode: "otp_email",
  hashDocument: HASH_EE,
  active: true,
};
const sigRevoquee: SignaturePlanPdf = {
  ...sigEE,
  id: "sig_revoquee",
  signataireNom: "Ancien Signataire",
  hashDocument: HASH_REVOQUEE,
  active: null,
};

function donnees(over: Partial<PlanPreventionData> = {}): PlanPreventionData {
  return {
    numero: 3,
    statut: "valide",
    entreprise: "Btry SAS",
    etablissement: "Le Comptoir",
    adresse: "1 rue des Lilas, 75011 Paris",
    siretEtablissement: "12345678900012",
    genereLe: new Date("2026-11-19T10:00:00Z"),
    urlPublique: "https://rojer.example",
    raisonsEcrit: ["Durée estimée : 450 h"],
    plan: {
      entrepriseExterieureRaison: "Clim Services",
      entrepriseExterieureSiret: null,
      efChefNom: "Paul Durand",
      efEffectifIntervenant: 2,
      euChefNom: "Claire Martin",
      euChefFonction: "Gérante",
      dateDebut: new Date("2026-11-20T07:00:00Z"),
      dateFin: new Date("2026-11-21T16:00:00Z"),
      dureeHeuresEstimee: 450,
      heuresPrevisiblesRevisees: null,
      heuresPrevisiblesReviseesLe: null,
      lieux: "Cuisine, toiture",
      naturesTravaux: "Remplacement du groupe froid",
      travauxDangereux: true,
      inspectionDate: new Date("2026-11-15T09:00:00Z"),
      inspectionParticipants: "C. Martin, P. Durand",
      lignes: [
        {
          risque: "Chute d'objets en zone de passage",
          mesureEntrepriseUtilisatrice: "Balisage de la zone",
          mesureEntrepriseExterieure: null,
        },
      ],
      phasesDangereuses: [{ phase: "Levage du groupe", moyensPrevention: "Grue et chef de manœuvre" }],
      adaptationMateriels: "Matériel vérifié",
      instructionsTravailleurs: null,
      organisationSecours: "SST présent en cuisine",
      participationCroisee: "Chef de chantier EE",
    },
    signatures: [sigEU, sigEE],
    ...over,
  };
}

/** Tout le texte de l'arbre : contenu direct, et clés des lignes « clé / valeur ». */
function textes(d: PlanPreventionData): string[] {
  return elementsDansLOrdre(PlanPreventionDocument({ data: d })).flatMap((n) => {
    const t = texteDirect(n);
    const cle = typeof n.props.cle === "string" ? [n.props.cle] : [];
    return [...cle, ...(t ? [t] : [])];
  });
}

const contient = (t: string[], motif: RegExp) => t.some((x) => motif.test(x));

describe("PlanPreventionDocument — contenu", () => {
  it("porte l'en-tête, les parties, les travaux, l'inspection et l'interférence", () => {
    const t = textes(donnees());
    expect(contient(t, /^Plan de prévention PP-003$/)).toBe(true);
    expect(contient(t, /Le Comptoir — 1 rue des Lilas/)).toBe(true);
    expect(contient(t, /Btry SAS — Claire Martin, Gérante/)).toBe(true);
    expect(contient(t, /^Clim Services — Paul Durand$/)).toBe(true);
    expect(contient(t, /^Du \d\d\/\d\d\/2026 \d\d:\d\d au .*heure de Paris/)).toBe(true);
    expect(contient(t, /^Cuisine, toiture$/)).toBe(true);
    expect(contient(t, /arrêté du 19 mars 1993/)).toBe(true);
    expect(contient(t, /^Durée estimée : 450 h$/)).toBe(true);
    expect(contient(t, /^Inspection commune préalable/)).toBe(true);
    expect(contient(t, /^1\. Chute d'objets/)).toBe(true);
    expect(contient(t, /^Balisage de la zone$/)).toBe(true);
    // La mesure de l'entreprise extérieure manque : elle se dit.
    expect(contient(t, /^À compléter$/)).toBe(true);
  });

  it("imprime les heures révisées en cours de chantier, dans les mots de la fiche", () => {
    const d = donnees();
    d.plan.heuresPrevisiblesRevisees = 420;
    d.plan.heuresPrevisiblesReviseesLe = new Date("2026-11-20T12:00:00Z");
    expect(contient(textes(d), /^Heures prévisibles revues : 420 h, seuil de 400 h noté le 20\/11\/2026$/)).toBe(true);
  });

  it("les cinq rubriques de R. 4512-8 ; une rubrique vide se signale comme manquante", () => {
    const t = textes(donnees());
    for (const n of [1, 2, 3, 4, 5]) expect(contient(t, new RegExp(`^${n}° `))).toBe(true);
    expect(contient(t, /^1 rubrique sur 5 non renseignée : 3°\.$/)).toBe(true);
    expect(contient(t, /^Non renseignée$/)).toBe(true);
    expect(contient(t, /^Levage du groupe$/)).toBe(true);
    expect(contient(t, /Grue et chef de manœuvre/)).toBe(true);
  });

  it("toutes les rubriques remplies : aucune n'est dite manquante", () => {
    const d = donnees();
    d.plan.instructionsTravailleurs = "Consignes remises";
    const t = textes(d);
    expect(contient(t, /non renseignée/i)).toBe(false);
  });

  it("cite les textes, dit que le fichier n'est pas l'original scellé, et ne qualifie rien", () => {
    const t = textes(donnees());
    expect(contient(t, /art\. R\. 4512-6 à R\. 4512-12 du Code du travail/)).toBe(true);
    expect(contient(t, /^Art\. R\. 4512-8 : Les mesures prévues/)).toBe(true);
    expect(t).toContain(MENTION_NON_SCELLE);
    expect(MENTION_NON_SCELLE).toMatch(/pas un original scellé/);
    // Règle 8 : jamais « vous êtes conforme ».
    expect(contient(t, /vous êtes conforme|est conforme|plan conforme/i)).toBe(false);
  });

  it("n'imprime aucune adresse électronique", () => {
    expect(contient(textes(donnees()), /@/)).toBe(false);
  });
});

describe("PlanPreventionDocument — signatures", () => {
  it("pour chaque signature active : partie, nom, date, méthode en français, empreinte, identifiant, adresse de vérification", () => {
    const t = textes(donnees());
    expect(contient(t, /^Entreprise utilisatrice — Claire Martin, Gérante$/)).toBe(true);
    expect(contient(t, /^Entreprise extérieure — Paul Durand$/)).toBe(true);
    expect(contient(t, /^Signé le 18\/11\/2026 10:30 \(heure de Paris\), depuis le compte Rojer/)).toBe(true);
    expect(contient(t, /par lien personnel, confirmé par un code à usage unique\.$/)).toBe(true);
    expect(t).toContain(HASH_EU);
    expect(t).toContain(HASH_EE);
    expect(contient(t, /^Empreinte SHA-256 des données signées :$/)).toBe(true);
    expect(contient(t, /^Identifiant de la signature : sig_eu$/)).toBe(true);
    expect(contient(t, /^Vérifier cette signature : https:\/\/rojer\.example\/verifier\/sig_ee$/)).toBe(true);
  });

  it("n'imprime jamais une signature révoquée", () => {
    const t = textes(donnees({ signatures: [sigEU, sigRevoquee] }));
    expect(t).not.toContain(HASH_REVOQUEE);
    expect(contient(t, /Ancien Signataire/)).toBe(false);
    expect(contient(t, /sig_revoquee/)).toBe(false);
    expect(contient(t, /^Entreprise extérieure : signature non recueillie\.$/)).toBe(true);
  });

  it("toutes les parties ont signé : pas de mention « document de travail »", () => {
    expect(textes(donnees())).not.toContain(MENTION_DOCUMENT_DE_TRAVAIL);
  });

  it("une partie manque : la mention « document de travail » et la partie attendue", () => {
    const t = textes(donnees({ statut: "attente_signatures", signatures: [sigEU] }));
    expect(t).toContain(MENTION_DOCUMENT_DE_TRAVAIL);
    expect(contient(t, /^Signature attendue : entreprise extérieure\.$/)).toBe(true);
  });

  it("aucune signature : la mention, et les deux parties attendues", () => {
    const t = textes(donnees({ statut: "brouillon", signatures: [] }));
    expect(t).toContain(MENTION_DOCUMENT_DE_TRAVAIL);
    expect(contient(t, /^Aucune signature en vigueur\.$/)).toBe(true);
    expect(contient(t, /^Signature attendue : entreprise utilisatrice, entreprise extérieure\.$/)).toBe(true);
  });

  it("sans adresse publique configurée : le chemin de vérification, sans hôte inventé", () => {
    expect(adresseDeVerification(null, "sig_x")).toBe("page /verifier/sig_x de l'application Rojer");
    expect(adresseDeVerification("https://a.b", "sig_x")).toBe("https://a.b/verifier/sig_x");
  });
});

describe("PlanPreventionDocument — fichier", () => {
  it("un seul point dans le nom (Mailpace le refuse sinon)", () => {
    const nom = nomFichierPlanPrevention(3, "Le Comptoir d'à côté");
    expect(nom).toBe("Plan_prevention_PP-003_Le_Comptoir_d_a_cote.pdf");
    expect(nom.split(".")).toHaveLength(2);
  });

  it("se rend en PDF, signé comme en document de travail", async () => {
    for (const d of [donnees(), donnees({ statut: "brouillon", signatures: [] })]) {
      const pdf = await renderToBuffer(PlanPreventionDocument({ data: d }));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(1000);
    }
  }, 30_000);
});
