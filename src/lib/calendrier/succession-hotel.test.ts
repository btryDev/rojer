import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EtablissementFaux, LigneFausse } from "./faux-prisma";
import { lireEntrees, planifier, type ClientPasse } from "./passe";

// 2026-10-13 — l'hôtel de 5ᵉ catégorie quitte la ligne triennale de PE 4 § 2
// (`typesExclus: ["O"]`) pour la ligne biennale de PO 1 § 3, qui la déclare
// en `succedeA`. Ce que la passe fait de la rangée déjà posée : elle est
// REPRISE — même identifiant, nouvelle obligation —, ni archivée ni supprimée,
// et aucune ligne biennale neuve ne naît à côté. Relevé par la revue de
// sécurité du même jour : sans la succession, l'hôtel perdait sa rangée et la
// ligne neuve naissait « à planifier » sans le dernier contrôle déposé.
// Un établissement de 5ᵉ catégorie d'un autre type garde la triennale.

const h = vi.hoisted(async () => {
  const { fauxPrisma, magasinVide } = await import("./faux-prisma");
  const db = magasinVide();
  return { db, prisma: fauxPrisma(db) };
});

vi.mock("@/lib/prisma", async () => ({ prisma: (await h).prisma }));

const ETAB_ID = "etab-1";
const TRIENNALE = "incendie-erp-pe4-entretien-installations-techniques";
const BIENNALE = "incendie-hotel-po-controle-biennal-installations";
const MAINTENANT = new Date("2026-10-13T08:00:00Z");

const { db, prisma } = await h;
const client = prisma as unknown as ClientPasse;

function poserEtablissement(typeErp: "O" | "N"): EtablissementFaux {
  const etab: EtablissementFaux = {
    id: ETAB_ID,
    userId: "user-1",
    effectifSurSite: 6,
    effectifEntreprise: 6,
    estEtablissementTravail: true,
    estERP: true,
    estIGH: false,
    estHabitation: false,
    typeErp,
    typesErpAutres: [],
    categorieErp: "N5",
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: 30,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    referentielVersionCalendrier: "2026-10-12.1+ancien",
    prescriptionsParticulieres: [],
    equipements: [],
  };
  db.etablissements = [etab];
  return etab;
}

function ligneTriennale(partiel: Partial<LigneFausse> = {}): LigneFausse {
  return {
    id: "v-pe4",
    etablissementId: ETAB_ID,
    equipementId: null,
    salarieId: null,
    obligationId: TRIENNALE,
    libelleObligation:
      "Entretien et vérification de l'ensemble des installations techniques (ERP 5ᵉ catégorie)",
    periodicite: "triennale",
    realisateurRequis: ["personne_qualifiee", "organisme_agree"],
    datePrevue: new Date("2028-04-01T00:00:00Z"),
    statut: "planifiee",
    suiviDepuis: new Date("2026-03-01T09:30:00Z"),
    nbRapports: 1,
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

describe("hôtel de 5ᵉ catégorie : la ligne triennale est reprise par la biennale", () => {
  for (const trace of [
    { nom: "avec un rapport", nbRapports: 1 },
    { nom: "sans trace", nbRapports: 0 },
  ]) {
    it(trace.nom, async () => {
      poserEtablissement("O");
      db.verifications = [ligneTriennale({ nbRapports: trace.nbRapports })];

      const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);

      expect(plan.aArchiver.map((a) => a.id)).not.toContain("v-pe4");
      expect(plan.aSupprimer).not.toContain("v-pe4");
      expect(
        plan.aMettreAJour.filter((m) => m.id === "v-pe4").map((m) => m.obligationId),
      ).toEqual([BIENNALE]);
      expect(plan.aCreer.filter((c) => c.obligationId === BIENNALE)).toEqual([]);
    });
  }
});

describe("témoin : un ERP de 5ᵉ catégorie d'un autre type garde la triennale", () => {
  it("type N", async () => {
    poserEtablissement("N");
    db.verifications = [ligneTriennale()];

    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);

    expect(plan.aArchiver.map((a) => a.id)).not.toContain("v-pe4");
    expect(plan.aSupprimer).not.toContain("v-pe4");
    for (const m of plan.aMettreAJour.filter((x) => x.id === "v-pe4")) {
      expect(m.obligationId).toBe(TRIENNALE);
    }
    expect(plan.aCreer.filter((c) => c.obligationId === BIENNALE)).toEqual([]);
  });
});
