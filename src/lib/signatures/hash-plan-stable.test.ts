import type { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculerHashObjet } from "./hash-objet";

/**
 * L'EMPREINTE D'UN PLAN DÉJÀ SIGNÉ NE BOUGE PAS QUAND LE MODÈLE GRANDIT
 * (2026-11-21, `lot/plan-prevention-formulaire-riskboard`).
 *
 * Le formulaire du plan gagne des champs repris de RiskBoard — adresse de
 * l'entreprise extérieure, téléphones, horaires, CSE associé, qualifications,
 * moyens fournis, autres observations, et sur chaque ligne de risque la
 * famille, le lieu et la fréquence. Tous entrent dans le sceau QUAND ILS SONT
 * REMPLIS, et seulement alors : un plan qui ne les porte pas — tous ceux
 * signés avant ce lot — doit garder, au caractère près, l'empreinte calculée
 * par le code d'avant. Sinon la vérification dirait « document modifié » d'un
 * plan que personne n'a touché.
 *
 * L'empreinte attendue ci-dessous a été calculée par `calculerHashObjet` SUR
 * LE CODE D'AVANT CE LOT (main 411ee5ff), avec ce même plan. Elle ne se
 * recalcule pas : si ce test casse, c'est le canonique qui a changé.
 */

const PLAN_SANS_LES_CHAMPS_NEUFS = {
  numero: 7,
  entrepriseExterieureRaison: "Toitures du Sud",
  entrepriseExterieureSiret: "12345678901234",
  efChefNom: "Paul Martin",
  efChefEmail: "paul@toitures.test",
  efEffectifIntervenant: 3,
  euChefNom: "Marie Durand",
  euChefFonction: "Gérante",
  dateDebut: new Date("2026-03-02T07:00:00.000Z"),
  dateFin: new Date("2026-03-06T16:00:00.000Z"),
  dureeHeuresEstimee: 120,
  lieux: "Toiture, cuisine",
  naturesTravaux: "Réfection de la membrane d'étanchéité",
  travauxDangereux: true,
  inspectionDate: new Date("2026-02-20T00:00:00.000Z"),
  inspectionParticipants: "La gérante, le chef d'équipe",
  lignes: [
    {
      ordre: 1,
      risque: "Chute d'objets sur la terrasse",
      mesureEntrepriseUtilisatrice: "Terrasse fermée",
      mesureEntrepriseExterieure: null,
    },
    {
      ordre: 0,
      risque: "Chutes de hauteur",
      mesureEntrepriseUtilisatrice: null,
      mesureEntrepriseExterieure: "Garde-corps provisoires",
    },
  ],
  phasesDangereuses: [
    { ordre: 0, phase: "Découpe au chalumeau", moyensPrevention: "Permis de feu" },
  ],
  adaptationMateriels: "Nacelle vérifiée",
  instructionsTravailleurs: null,
  organisationSecours: "Deux SST présents",
  participationCroisee: null,
};

/** Calculée sur main 411ee5ff, avant l'ajout des champs. */
const EMPREINTE_D_AVANT =
  "v2:806a6c409ba026870a53240d067379585294333ec0a4dbf07bb0119de3dc93bb";

/** Les colonnes neuves telles que la base les rend sur un plan d'avant : NULL. */
const COLONNES_NEUVES_VIDES = {
  entrepriseExterieureAdresse: null,
  efChefTelephone: null,
  euChefTelephone: null,
  horaires: null,
  cseAssocie: null,
  qualificationsRequises: null,
  moyensFournis: null,
  autresObservations: null,
};

function dbAvec(plan: unknown): Prisma.TransactionClient {
  return {
    planPrevention: { findFirst: async () => plan },
  } as unknown as Prisma.TransactionClient;
}

async function empreinte(plan: unknown): Promise<string> {
  const r = await calculerHashObjet(dbAvec(plan), "plan_prevention", "pp_1", "e1");
  if (!r.ok) throw new Error(r.raison);
  return r.hash;
}

describe("empreinte d'un plan signé avant les champs repris de RiskBoard", () => {
  it("est celle que calculait le code d'avant", async () => {
    expect(await empreinte(PLAN_SANS_LES_CHAMPS_NEUFS)).toBe(EMPREINTE_D_AVANT);
  });

  it("ne bouge pas quand la base rend les colonnes neuves à NULL", async () => {
    // Le cas réel après la migration : les colonnes existent, et valent NULL
    // sur tout plan d'avant — sur le plan comme sur chaque ligne.
    const relu = {
      ...PLAN_SANS_LES_CHAMPS_NEUFS,
      ...COLONNES_NEUVES_VIDES,
      lignes: PLAN_SANS_LES_CHAMPS_NEUFS.lignes.map((l) => ({
        ...l,
        famille: null,
        lieu: null,
        frequence: null,
      })),
    };
    expect(await empreinte(relu)).toBe(EMPREINTE_D_AVANT);
  });

  it("change dès qu'un champ neuf est rempli : il est scellé", async () => {
    // Un champ que le signataire lit sur la fiche entre dans le sceau.
    const cas: Record<string, unknown>[] = [
      { entrepriseExterieureAdresse: "1 rue des Lilas, Lyon" },
      { efChefTelephone: "06 00 00 00 00" },
      { euChefTelephone: "04 00 00 00 00" },
      { horaires: "8 h – 17 h, hors week-end" },
      { cseAssocie: false },
      { cseAssocie: true },
      { qualificationsRequises: "Habilitation B1V" },
      { moyensFournis: "Local vestiaire" },
      { autresObservations: "Accès par la cour" },
    ];
    for (const champ of cas) {
      const plan = { ...PLAN_SANS_LES_CHAMPS_NEUFS, ...COLONNES_NEUVES_VIDES, ...champ };
      expect(await empreinte(plan), JSON.stringify(champ)).not.toBe(EMPREINTE_D_AVANT);
    }
    const [premiere, seconde] = PLAN_SANS_LES_CHAMPS_NEUFS.lignes;
    for (const champ of [{ famille: "CHUTES_HAUTEUR" }, { lieu: "Toiture" }, { frequence: "Quotidienne" }]) {
      const plan = { ...PLAN_SANS_LES_CHAMPS_NEUFS, lignes: [{ ...premiere, ...champ }, seconde] };
      expect(await empreinte(plan), JSON.stringify(champ)).not.toBe(EMPREINTE_D_AVANT);
    }
  });

  it("distingue « CSE non associé » de « non renseigné »", async () => {
    const non = await empreinte({ ...PLAN_SANS_LES_CHAMPS_NEUFS, cseAssocie: false });
    const oui = await empreinte({ ...PLAN_SANS_LES_CHAMPS_NEUFS, cseAssocie: true });
    expect(non).not.toBe(oui);
    expect(non).not.toBe(EMPREINTE_D_AVANT);
  });
});
