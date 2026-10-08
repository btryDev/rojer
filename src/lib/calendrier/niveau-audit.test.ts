import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EtablissementFaux, LigneFausse } from "./faux-prisma";
import { lireEntrees, planifier, type ClientLecture } from "./passe";

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
const client = prisma as unknown as ClientLecture;

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
