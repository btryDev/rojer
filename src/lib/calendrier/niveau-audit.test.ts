import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EtablissementFaux, LigneFausse } from "./faux-prisma";
import { lireEntrees, planifier, type ClientPasse } from "./passe";
import { obligationsConformite } from "@/lib/referentiels/conformite";

// ADR-042 — ce que la passe de régénération fait des lignes DÉJÀ POSÉES d'une
// obligation passée au niveau audit : elle les traite comme une obligation
// qui cesse de s'appliquer. Archivées si elles portent une trace (rapport,
// action, réalisation), supprimées sinon — jamais rouvertes, jamais créées.
// La passe entière (lecture → matching → génération → réconciliation), sur le
// faux client, pas le réconciliateur seul : c'est le chemin que prend la
// production au premier passage du référentiel `2026-10-08.4`.

const h = vi.hoisted(async () => {
  const { fauxPrisma, magasinVide } = await import("./faux-prisma");
  const db = magasinVide();
  return { db, prisma: fauxPrisma(db) };
});

vi.mock("@/lib/prisma", async () => ({ prisma: (await h).prisma }));

// Les obligations marquées au niveau audit POUR L'OCCASION. Aucun titre
// salarié n'y est aujourd'hui : sans ce marquage, le `!estNiveauAudit(o)` de
// la boucle des titres de `passe.ts` ne serait couvert par rien (C67,
// 2026-10-09). `obligationParId` est la seule lecture que la passe fait d'une
// obligation de titre ; on la double, le reste du module est le vrai.
const marquees = vi.hoisted(() => new Set<string>());
vi.mock("@/lib/referentiels/conformite", async (importOriginal) => {
  const vrai = await importOriginal<typeof import("@/lib/referentiels/conformite")>();
  return {
    ...vrai,
    obligationParId: (id: string) => {
      const o = vrai.obligationParId(id);
      return o && marquees.has(id) ? { ...o, niveau: "audit" as const } : o;
    },
  };
});

const USER_ID = "user-1";
const ETAB_ID = "etab-1";
const ANCIEN = "epi-verification-generale-periodique";
const CHIFFONS = "incendie-travail-chiffons-impregnes-recipients-clos";
const AUDIT_EPI = [
  "epi-verification-generale-periodique-respiratoire",
  "epi-verification-generale-periodique-gilet-sauvetage",
];
const MAINTENANT = new Date("2026-10-09T08:00:00Z");

const { db, prisma } = await h;
const client = prisma as unknown as ClientPasse;

function poserEtablissement(): EtablissementFaux {
  const etab: EtablissementFaux = {
    id: ETAB_ID,
    userId: USER_ID,
    effectifSurSite: 5,
    effectifEntreprise: 5,
    estEtablissementTravail: true,
    estERP: false,
    estIGH: false,
    estHabitation: false,
    typeErp: null,
    typesErpAutres: [],
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    referentielVersionCalendrier: "2026-10-08.2+ancien",
    prescriptionsParticulieres: [],
    equipements: [
      { id: "eq-masque", libelle: "Masque", categorie: "EPI_RESPIRATOIRE", actif: true },
      { id: "eq-gilet", libelle: "Gilet", categorie: "EPI_GILET_SAUVETAGE", actif: true },
      { id: "eq-harnais", libelle: "Harnais", categorie: "EPI_ANTICHUTE", actif: true },
    ],
  };
  db.etablissements = [etab];
  return etab;
}

function ligne(partiel: Partial<LigneFausse> & { id: string }): LigneFausse {
  return {
    etablissementId: ETAB_ID,
    equipementId: null,
    salarieId: null,
    obligationId: ANCIEN,
    libelleObligation: "Vérification générale périodique des équipements de protection individuelle",
    periodicite: "annuelle",
    realisateurRequis: ["personne_qualifiee"],
    datePrevue: new Date("2027-03-01T00:00:00Z"),
    statut: "planifiee",
    suiviDepuis: new Date("2026-03-01T09:30:00Z"),
    nbRapports: 0,
    nbActions: 0,
    ...partiel,
  };
}

beforeEach(() => {
  marquees.clear();
  db.etablissements = [];
  db.salaries = [];
  db.titres = [];
  db.verifications = [];
  db.faireEchouer = null;
  db.apresLecture = null;
  db.journal = [];
});

describe("passe de régénération — une obligation passée au niveau audit cesse de s'appliquer", () => {
  it("lignes avec trace archivées, sans trace supprimées ; l'antichute reste ; rien n'est créé au niveau audit", async () => {
    poserEtablissement();
    db.verifications = [
      // Le masque : contrôlé, un rapport au registre — la trace se garde.
      ligne({ id: "v-masque", equipementId: "eq-masque", nbRapports: 1 }),
      // Le gilet : jamais contrôlé, aucune trace — la ligne ne dit plus rien.
      ligne({ id: "v-gilet", equipementId: "eq-gilet" }),
      // Le harnais : même identifiant, servi — la ligne vit.
      ligne({ id: "v-harnais", equipementId: "eq-harnais", nbRapports: 1 }),
      // Les chiffons : une action posée sur la ligne d'établissement.
      ligne({
        id: "v-chiffons",
        obligationId: CHIFFONS,
        periodicite: "autre",
        realisateurRequis: ["exploitant"],
        nbActions: 1,
      }),
    ];

    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);

    expect(plan.aArchiver.map((a) => a.id).sort()).toEqual(["v-chiffons", "v-masque"]);
    expect(plan.aSupprimer).toEqual(["v-gilet"]);
    expect(plan.aDesarchiver.map((a) => a.id)).toEqual([]);
    // Le harnais garde sa ligne et son identifiant : réaligné au besoin
    // (date tirée de ses faits), jamais archivé ni supprimé.
    expect([...plan.aArchiver.map((a) => a.id), ...plan.aSupprimer]).not.toContain(
      "v-harnais",
    );
    for (const m of plan.aMettreAJour.filter((x) => x.id === "v-harnais")) {
      expect(m.obligationId).toBe(ANCIEN);
    }
    expect(
      plan.aCreer.filter((c) => [...AUDIT_EPI, CHIFFONS].includes(c.obligationId)),
    ).toEqual([]);
    // L'adoption par `succedeA` ne joue pas : une obligation audit n'engendre
    // aucune ligne, donc aucune ligne ne reprend celle du masque.
    expect(plan.aMettreAJour.map((m) => m.obligationId)).not.toEqual(
      expect.arrayContaining(AUDIT_EPI),
    );
  });

  it("idempotente : la ligne archivée du masque ne revient pas à la passe suivante", async () => {
    poserEtablissement();
    db.verifications = [
      ligne({
        id: "v-masque",
        equipementId: "eq-masque",
        nbRapports: 1,
        archiveLe: new Date("2026-10-09T08:00:00Z"),
      }),
    ];
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    expect(plan.aDesarchiver.map((a) => a.id)).toEqual([]);
    expect(plan.aMettreAJour.map((m) => m.id)).not.toContain("v-masque");
    expect(plan.aSupprimer).not.toContain("v-masque");
  });
});

describe("passe de régénération — un titre salarié au niveau audit ne garde pas sa ligne", () => {
  // Une obligation salarié réelle, servie aujourd'hui, marquée pour l'occasion.
  const TITRE = obligationsConformite.find(
    (o) => o.porteur === "salarie" && o.niveau !== "audit",
  )!.id;

  function poserTitre() {
    poserEtablissement();
    db.salaries = [
      { id: "s-1", etablissementId: ETAB_ID, actif: true, nom: "Durand", prenom: "Ana" },
    ];
    db.titres = [
      {
        obligationId: TITRE,
        salarieId: "s-1",
        delivreLe: new Date("2025-01-01T00:00:00Z"),
        echeanceLe: new Date("2027-06-01T00:00:00Z"),
      },
    ];
    db.verifications = [
      ligne({
        id: "v-titre",
        obligationId: TITRE,
        salarieId: "s-1",
        datePrevue: new Date("2027-06-01T00:00:00Z"),
        nbRapports: 1,
      }),
    ];
  }

  it("témoin : servi, le titre en vigueur garde sa ligne", async () => {
    poserTitre();
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    expect([...plan.aArchiver.map((a) => a.id), ...plan.aSupprimer]).not.toContain(
      "v-titre",
    );
  });

  it("marqué au niveau audit, le titre en vigueur ne la garde plus : archivée avec sa trace", async () => {
    poserTitre();
    marquees.add(TITRE);
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    expect(plan.aArchiver.map((a) => a.id)).toContain("v-titre");
    expect(plan.aCreer.filter((c) => c.obligationId === TITRE)).toEqual([]);
  });
});
