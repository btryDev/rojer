// La fiche du plan RENDUE (2026-11-19, lots 3 et 4) : le statut affiché, le
// panneau Signatures selon l'état de chaque partie, le bandeau de la
// proposition et celui de la correction en cours.
// [2026-11-21, maquette V3] Deux onglets, choisis par l'adresse : le plan
// d'un seul tenant, et le suivi (action requise, signatures, historique).

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => "/",
  notFound: () => {
    throw new Error("notFound");
  },
  unstable_rethrow: () => {},
}));
vi.mock("@/lib/plan-prevention/actions", () => ({
  cloturerPlan: async () => {},
  supprimerPlan: async () => {},
  noterInformationInspection: async () => ({ status: "idle" }),
  noterHeuresRevisees: async () => ({ status: "idle" }),
}));
vi.mock("@/lib/plan-prevention/signature-fiche-actions", () => ({
  demanderCodeSignaturePlan: async () => ({ ok: false, message: "" }),
  signerEtEnvoyerPlan: async () => ({ status: "idle" }),
  renvoyerLienPlan: async () => ({ status: "idle" }),
  envoyerLienEntrepriseExterieure: async () => ({ status: "idle" }),
}));
vi.mock("@/lib/plan-prevention/contre-signature-actions", () => ({
  traiterProposition: async () => ({ status: "idle" }),
  revoquerSignaturesPlan: async () => ({ status: "idle" }),
}));
vi.mock("@/components/plan-prevention/PlanActionsButtons", () => ({
  BoutonCloturer: () => null,
  BoutonSupprimerPlan: () => null,
}));
const planCourant: { valeur: Record<string, unknown> | null } = { valeur: null };
vi.mock("@/lib/plan-prevention/queries", () => ({
  getPlanPrevention: async () => planCourant.valeur,
}));

const PLUS_TARD = new Date(Date.now() + 5 * 86_400_000);

function plan(extra: Record<string, unknown> = {}) {
  return {
    id: "p1",
    numero: 2,
    statut: "attente_signatures",
    entrepriseExterieureRaison: "Nettoyage Pro SARL",
    entrepriseExterieureSiret: null,
    efChefNom: "Paul Testeur",
    efChefEmail: "paul@nettoyage.fr",
    efEffectifIntervenant: 1,
    euChefNom: "Paloma Sanchez",
    euChefFonction: null,
    dateDebut: new Date("2026-11-27T07:00:00Z"),
    dateFin: new Date("2026-11-27T16:00:00Z"),
    dureeHeuresEstimee: 8,
    travauxDangereux: false,
    lieux: "Cuisine",
    naturesTravaux: "Dégraissage de la hotte",
    inspectionDate: null,
    inspectionParticipants: null,
    lignes: [{ id: "l1", risque: "Graisses chaudes", mesureEntrepriseUtilisatrice: "Hors service", mesureEntrepriseExterieure: "Gants" }],
    phasesDangereuses: [],
    adaptationMateriels: null,
    instructionsTravailleurs: null,
    organisationSecours: null,
    participationCroisee: null,
    signatures: [],
    signaturesRevoquees: [],
    propositionEnAttente: null,
    liens: [],
    propositions: [],
    raisonEU: "Test Paiement SARL",
    vous: { nom: "Paloma Sanchez", email: "paloma@exemple.fr" },
    ...extra,
  };
}

async function rendre(p: Record<string, unknown>, query: { onglet?: string; openSign?: string } = { onglet: "suivi" }) {
  planCourant.valeur = p;
  const { default: Page } = await import("@/app/etablissements/[id]/plan-prevention/[planId]/page");
  const element = await Page({ params: Promise.resolve({ id: "e1", planId: "p1" }), searchParams: Promise.resolve(query) });
  return renderToStaticMarkup(element)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const lienEE = {
  id: "atk-1",
  partie: "entreprise_exterieure",
  emailDestinataire: "paul@nettoyage.fr",
  nomDestinataire: "Paul Testeur",
  createdAt: new Date("2026-11-19T14:40:00Z"),
  expireLe: PLUS_TARD,
  utiliseLe: null,
  revoqueLe: null,
  revoqueMotif: null,
  otpExpireLe: new Date("2026-11-19T14:50:00Z"),
};
const signatureEU = {
  id: "sig-1",
  partie: "entreprise_utilisatrice",
  signataireNom: "Paloma Sanchez",
  horodatageIso: new Date("2026-11-19T14:26:00Z"),
  methode: "compte_code_email",
  revoqueLe: null,
  revoqueMotif: null,
};

describe("la fiche du plan", () => {
  it("brouillon : l'en-tête, le statut dérivé, la grande action « Signer et envoyer »", async () => {
    const lu = await rendre(plan());
    expect(lu).toContain("Plan de prévention PP-002");
    expect(lu).toContain("Dégraissage de la hotte");
    expect(lu).toContain("Brouillon");
    // Sa signature à poser : l'onglet « Suivi » le compte.
    expect(lu).toContain("Plan de prévention Suivi 1");
    expect(lu).toContain("Action requise Votre signature est attendue");
    expect(lu).toContain("Signatures · 0 sur 2");
    expect(lu).toContain("Signer et envoyer à l'entreprise extérieure");
    expect(lu).toContain("Faire signer un collègue");
    expect(lu).not.toContain("Cycle de vie");
    // L'historique est dans l'onglet ; plus de bouton ni de fenêtre.
    expect(lu).toContain("Ce qui s'est passé");
    expect(lu).not.toMatch(/\bHistorique\b/);
  });

  it("« Plan créé » ouvre l'historique, à la date de création du plan", async () => {
    const lu = await rendre(plan({ createdAt: new Date("2026-11-18T09:05:00Z"), liens: [lienEE] }));
    expect(lu).toMatch(/Plan créé , le 18 novembre 2026 à 10:05/);
    expect(lu.indexOf("Plan créé")).toBeGreaterThan(lu.indexOf("Lien adressé à Nettoyage Pro SARL"));
  });

  it("sans paramètre, l'onglet « Plan de prévention » ; `?openSign=1` ouvre « Suivi »", async () => {
    const planLu = await rendre(plan(), {});
    expect(planLu).toContain("Les parties");
    expect(planLu).toContain("Risques d'interférence et mesures");
    expect(planLu).toContain("Télécharger le PDF");
    expect(planLu).not.toContain("Signatures · 0 sur 2");

    const signe = await rendre(plan(), { openSign: "1" });
    expect(signe).toContain("Signatures · 0 sur 2");
    expect(signe).not.toContain("Les parties");
  });

  it("le plan d'un seul tenant : une rubrique de R. 4512-8 remplie est une section ; les vides, une ligne", async () => {
    const lu = await rendre(plan({ instructionsTravailleurs: "Port des EPI en cuisine" }), {});
    expect(lu).toContain("Instructions à donner aux travailleurs Port des EPI en cuisine");
    expect(lu).toMatch(/À compléter : Phases d'activité dangereuses ; Adaptation des matériels/);
    expect(lu).not.toContain("Contenu minimal");
    expect(lu).not.toMatch(/rubriques? sur 5/);
    expect(lu).not.toContain("Non renseignée");

    // Figé (signé) : plus de ligne « À compléter ».
    const fige = await rendre(
      plan({ statut: "valide", signatures: [signatureEU], instructionsTravailleurs: "Port des EPI en cuisine" }),
      {},
    );
    expect(fige).toContain("Instructions à donner aux travailleurs Port des EPI en cuisine");
    expect(fige).not.toContain("À compléter :");
  });

  it("un lien révoqué par une proposition acceptée : la suite dite au dirigeant, pas celle de l'entreprise extérieure", async () => {
    const lu = await rendre(
      plan({
        liens: [
          {
            ...lienEE,
            revoqueLe: new Date("2026-11-19T15:00:00Z"),
            revoqueMotif:
              "l'entreprise extérieure a proposé une modification du plan ; demandez un nouveau lien à votre interlocuteur",
          },
        ],
      }),
    );
    expect(lu).toContain(
      "lien révoqué : l'entreprise extérieure a proposé une modification du plan · Rojer adresse un nouveau lien quand vous signez",
    );
    expect(lu).not.toContain("demandez un nouveau lien");
  });

  it("votre signature posée, le lien adressé : la ligne de chaque partie, et « Renvoyer le lien »", async () => {
    const lu = await rendre(plan({ signatures: [signatureEU], liens: [lienEE] }));
    expect(lu).toContain("En attente de signatures");
    expect(lu).toContain("Signatures · 1 sur 2");
    // Rien n'attend le dirigeant : pas de nombre sur l'onglet.
    expect(lu).not.toContain("Suivi 1");
    expect(lu).toContain("Il manque l'entreprise extérieure");
    expect(lu).toMatch(/signé le 19\/11 à 15 h 26 · code par e-mail/);
    expect(lu).toMatch(/lien adressé le 19\/11 · ouvert · expire le/);
    expect(lu).toContain("Renvoyer le lien");
    expect(lu).toContain("Révoquer les signatures pour corriger");
    expect(lu).not.toContain("Signer et envoyer");
  });

  it("une proposition en attente : le bandeau et ses trois gestes ; aucune signature ne se recueille", async () => {
    const lu = await rendre(
      plan({
        liens: [lienEE],
        propositionEnAttente: {
          id: "prop-1",
          accessTokenId: "atk-1",
          createdAt: new Date("2026-11-19T14:35:00Z"),
          contenu: {
            fiche: {
              entrepriseExterieureRaison: "Nettoyage Pro SARL",
              entrepriseExterieureSiret: null,
              efChefNom: "Paul Testeur",
              efEffectifIntervenant: 2,
            },
            lignes: [{ id: "l1", risque: "Graisses chaudes", mesureEntrepriseUtilisatrice: "Hors service", mesureEntrepriseExterieure: "Gants" }],
          },
        },
      }),
    );
    expect(lu).toContain("Modification proposée");
    expect(lu).not.toContain("En attente de signatures");
    expect(lu).toContain("Plan de prévention Suivi 1");
    expect(lu).toContain("Action requise · reçue le 19/11 à 15 h 35");
    expect(lu).toContain("Nettoyage Pro SARL propose 1 modification");
    expect(lu).toContain("Paul Testeur, depuis son lien.");
    expect(lu).toMatch(/Refuser.*Corriger.*Accepter sans modifier/);
    // Le lien de l'entreprise extérieure attend la décision.
    expect(lu).toContain("En pause");
    expect(lu).toContain("signera après votre décision");
    expect(lu).not.toContain("Votre signature est attendue");
  });

  it("une proposition en attente, onglet « Plan de prévention » : le rappel mène au suivi", async () => {
    const lu = await rendre(
      plan({
        liens: [lienEE],
        propositionEnAttente: {
          id: "prop-1",
          accessTokenId: "atk-1",
          createdAt: new Date("2026-11-19T14:35:00Z"),
          contenu: {
            fiche: {
              entrepriseExterieureRaison: "Nettoyage Pro SARL",
              entrepriseExterieureSiret: null,
              efChefNom: "Paul Testeur",
              efEffectifIntervenant: 2,
            },
            lignes: [{ id: "l1", risque: "Graisses chaudes", mesureEntrepriseUtilisatrice: "Hors service", mesureEntrepriseExterieure: "Gants" }],
          },
        },
      }),
      {},
    );
    expect(lu).toContain("Nettoyage Pro SARL a proposé 1 modification le 19/11 à 15 h 35.");
    expect(lu).toContain("Voir et décider →");
    expect(lu).not.toMatch(/Refuser.*Corriger/);
  });

  it("après « Corriger » : la correction en cours mène à la fenêtre de signature", async () => {
    const lu = await rendre(
      plan({
        propositions: [
          {
            id: "prop-1",
            accessTokenId: "atk-1",
            statut: "acceptee",
            createdAt: new Date("2026-11-19T14:35:00Z"),
            traiteeLe: new Date("2026-11-19T14:38:00Z"),
            traiteeParEmail: "paloma@exemple.fr",
            corrigeeLe: new Date("2026-11-19T14:38:00Z"),
            finaliseeLe: null,
          },
        ],
      }),
    );
    expect(lu).toContain("Correction en cours");
    expect(lu).toContain("Terminer la correction et signer");
  });

  it("signé des deux parties : « Signé », et plus de grande action", async () => {
    const lu = await rendre(
      plan({
        statut: "valide",
        signatures: [signatureEU, { ...signatureEU, id: "sig-2", partie: "entreprise_exterieure", signataireNom: "Paul Testeur", methode: "otp_email" }],
      }),
    );
    expect(lu).toContain("Signé");
    expect(lu).toContain("Signatures · 2 sur 2");
    expect(lu).toContain("Les deux parties ont signé ce plan.");
  });

  it("les champs repris de RiskBoard : seulement ce qui est rempli (2026-11-21)", async () => {
    const vide = await rendre(
      plan({
        entrepriseExterieureAdresse: null,
        efChefTelephone: null,
        euChefTelephone: null,
        horaires: null,
        cseAssocie: null,
        qualificationsRequises: null,
        moyensFournis: null,
        autresObservations: null,
      }),
      {},
    );
    expect(vide).not.toContain("Compléments");
    expect(vide).not.toContain("CSE associé");
    expect(vide).not.toContain("Horaires de travail");

    const rempli = await rendre(
      plan({
        entrepriseExterieureAdresse: "12 rue des Artisans, Lyon",
        efChefTelephone: "06 00 00 00 00",
        euChefTelephone: "04 00 00 00 00",
        horaires: "8 h – 17 h",
        cseAssocie: false,
        qualificationsRequises: "Habilitation B1V",
        moyensFournis: null,
        autresObservations: "Accès par la cour",
        lignes: [
          {
            id: "l1",
            risque: "Chutes en hauteur",
            mesureEntrepriseUtilisatrice: null,
            mesureEntrepriseExterieure: null,
            famille: "CHUTES_HAUTEUR",
            lieu: "Toiture",
            frequence: "Chaque matin",
          },
        ],
      }),
      {},
    );
    expect(rempli).toContain("12 rue des Artisans, Lyon");
    expect(rempli).toContain("06 00 00 00 00");
    expect(rempli).toContain("04 00 00 00 00");
    expect(rempli).toContain("Horaires de travail 8 h – 17 h");
    expect(rempli).toContain("CSE associé à l'opération Non");
    expect(rempli).toContain("Compléments");
    expect(rempli).toContain("Habilitation B1V");
    expect(rempli).toContain("Accès par la cour");
    expect(rempli).not.toContain("Moyens matériels mis à disposition");
    expect(rempli).toContain("Lieu : Toiture");
    expect(rempli).toContain("Fréquence : Chaque matin");
    // Le risque prérempli par la famille ne la répète pas.
    expect(rempli).not.toContain("Famille : Chutes en hauteur");
  });
});
