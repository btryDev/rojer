import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EquipementFaux, EtablissementFaux, LigneFausse } from "./faux-prisma";
import { lireEntrees, planifier, type ClientPasse } from "./passe";

// 2026-11-05 (ADR-057) — PE 4 § 2 et PO 1 § 3 passent de l'établissement à
// l'appareil, SOUS LE MÊME IDENTIFIANT. Ce que la passe fait de la ligne
// d'établissement déjà posée et de son dernier rapport :
//
//  · la ligne d'établissement n'est plus engendrée : archivée si elle porte
//    une trace, supprimée sinon (la règle ordinaire) ;
//  · chaque appareil visé reprend son dernier rapport réalisé, s'il était
//    DÉCLARÉ dans Rojer à la date de ce rapport (`realisationDispersee`) —
//    le rapport visait « l'ensemble des installations » ;
//  · un appareil déclaré après n'en hérite pas : sa ligne naît « à planifier ».
//
// Remplace `succession-hotel.test.ts` (2026-10-13), qui tenait la reprise de
// la ligne triennale par la biennale À L'ÉTABLISSEMENT : il n'y a plus de
// ligne d'établissement à reprendre.

const h = vi.hoisted(async () => {
  const { fauxPrisma, magasinVide } = await import("./faux-prisma");
  const db = magasinVide();
  return { db, prisma: fauxPrisma(db) };
});

vi.mock("@/lib/prisma", async () => ({ prisma: (await h).prisma }));

const ETAB_ID = "etab-1";
const TRIENNALE = "incendie-erp-pe4-entretien-installations-techniques";
const BIENNALE = "incendie-hotel-po-controle-biennal-installations";
const MAINTENANT = new Date("2026-11-06T08:00:00Z");
const RAPPORT = new Date("2026-03-10T00:00:00Z");

const { db, prisma } = await h;
const client = prisma as unknown as ClientPasse;

function poserEtablissement(
  typeErp: "O" | "N" | "L",
  equipements: EquipementFaux[],
  categorieErp: "N3" | "N5" = "N5",
): EtablissementFaux {
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
    categorieErp,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: 30,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
    referentielVersionCalendrier: "2026-11-04.1+ancien",
    prescriptionsParticulieres: [],
    equipements,
  };
  db.etablissements = [etab];
  return etab;
}

/** Une installation de gaz : seuls PE 4 § 2 et PO 1 § 3 la visent en 5ᵉ. */
const gaz = (id: string, createdAt: Date): EquipementFaux => ({
  id,
  libelle: `Gaz ${id}`,
  categorie: "INSTALLATION_GAZ",
  caracteristiques: null,
  actif: true,
  createdAt,
});

function ligneEtablissement(
  obligationId: string,
  partiel: Partial<LigneFausse> = {},
): LigneFausse {
  return {
    id: "v-etab",
    etablissementId: ETAB_ID,
    equipementId: null,
    salarieId: null,
    obligationId,
    libelleObligation: "Entretien et vérification de l'ensemble des installations techniques",
    periodicite: "triennale",
    realisateurRequis: ["personne_qualifiee", "organisme_agree"],
    datePrevue: new Date("2029-03-10T00:00:00Z"),
    statut: "planifiee",
    suiviDepuis: new Date("2026-01-05T09:30:00Z"),
    rapports: [{ dateRapport: RAPPORT, resultat: "conforme" }],
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

const lignesDe = (plan: ReturnType<typeof planifier>, obligationId: string) =>
  plan.aCreer.filter((c) => c.obligationId === obligationId);

describe("ERP de 5ᵉ catégorie : la ligne PE 4 d'établissement se disperse sur les appareils", () => {
  it("la ligne d'établissement, qui porte un rapport, est archivée", async () => {
    poserEtablissement("N", [gaz("g1", new Date("2026-01-01T10:00:00Z"))]);
    db.verifications = [ligneEtablissement(TRIENNALE)];
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    expect(plan.aArchiver.map((a) => a.id)).toContain("v-etab");
  });

  it("sans trace, elle est supprimée", async () => {
    poserEtablissement("N", [gaz("g1", new Date("2026-01-01T10:00:00Z"))]);
    db.verifications = [ligneEtablissement(TRIENNALE, { rapports: [], nbRapports: 0 })];
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    expect(plan.aSupprimer).toContain("v-etab");
  });

  it("un appareil déclaré AVANT le rapport le reprend : sa ligne naît datée de lui", async () => {
    poserEtablissement("N", [gaz("g1", new Date("2026-01-01T10:00:00Z"))]);
    db.verifications = [ligneEtablissement(TRIENNALE)];
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    const [ligne] = lignesDe(plan, TRIENNALE);
    expect(ligne.equipementId).toBe("g1");
    expect(ligne.statut).toBe("planifiee");
    expect(ligne.datePrevue.toISOString().slice(0, 10)).toBe("2029-03-10");
  });

  it("le jour même du rapport compte comme « avant »", async () => {
    poserEtablissement("N", [gaz("g1", new Date("2026-03-10T16:00:00Z"))]);
    db.verifications = [ligneEtablissement(TRIENNALE)];
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    expect(lignesDe(plan, TRIENNALE)[0].statut).toBe("planifiee");
  });

  it("un appareil déclaré APRÈS le rapport n'en hérite pas : sa ligne naît à planifier", async () => {
    poserEtablissement("N", [
      gaz("avant", new Date("2026-01-01T10:00:00Z")),
      gaz("apres", new Date("2026-06-01T10:00:00Z")),
    ]);
    db.verifications = [ligneEtablissement(TRIENNALE)];
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    const parAppareil = new Map(
      lignesDe(plan, TRIENNALE).map((l) => [l.equipementId, l.statut]),
    );
    expect(parAppareil.get("avant")).toBe("planifiee");
    expect(parAppareil.get("apres")).toBe("a_planifier");
  });
});

describe("hôtel de 5ᵉ catégorie : la ligne PO 1 d'établissement se disperse de même", () => {
  it("la ligne biennale de l'appareil reprend le dernier rapport", async () => {
    poserEtablissement("O", [gaz("g1", new Date("2026-01-01T10:00:00Z"))]);
    db.verifications = [
      ligneEtablissement(BIENNALE, {
        periodicite: "biennale",
        datePrevue: new Date("2028-03-10T00:00:00Z"),
      }),
    ];
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    expect(plan.aArchiver.map((a) => a.id)).toContain("v-etab");
    expect(lignesDe(plan, TRIENNALE)).toEqual([]);
    const [ligne] = lignesDe(plan, BIENNALE);
    expect(ligne.equipementId).toBe("g1");
    expect(ligne.datePrevue.toISOString().slice(0, 10)).toBe("2028-03-10");
  });
});

describe("relecture du 2026-11-06 : le rapport le plus récent du même acte date la ligne", () => {
  it("un fragment retiré adopté sur la VMC ne fait pas oublier le rapport plus récent de la ligne d'établissement", async () => {
    // Le fragment « VMC/CTA » (`aeration-travail-entretien-annuel`, retiré au
    // profit de R. 4222-20) a laissé une ligne archivée sur la VMC, rapport de
    // 2025-09 ; la ligne d'établissement de R. 4222-20 a un rapport de
    // 2026-10. La ligne de la VMC adopte la rangée du fragment — et se date du
    // rapport de 2026-10, pas de celui de 2025-09.
    const etab = poserEtablissement("N", []);
    etab.estERP = false;
    etab.typeErp = null;
    etab.categorieErp = null;
    etab.equipements = [
      {
        id: "vmc",
        libelle: "VMC",
        categorie: "VENTILATION",
        caracteristiques: null,
        actif: true,
        createdAt: new Date("2025-01-01T10:00:00Z"),
      },
    ];
    db.verifications = [
      ligneEtablissement("aeration-travail-entretien-annuel", {
        id: "v-fragment",
        equipementId: "vmc",
        periodicite: "annuelle",
        archiveLe: new Date("2026-08-27T00:00:00Z"),
        rapports: [{ dateRapport: new Date("2025-09-01T00:00:00Z"), resultat: "conforme" }],
      }),
      ligneEtablissement("aeration-controle-installations-r4222-20", {
        id: "v-r4222",
        periodicite: "annuelle",
        rapports: [{ dateRapport: new Date("2026-10-01T00:00:00Z"), resultat: "conforme" }],
      }),
    ];
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    const ligne =
      plan.aMettreAJour.find((m) => m.id === "v-fragment") ??
      plan.aCreer.find((c) => c.equipementId === "vmc");
    expect(ligne?.obligationId).toBe("aeration-controle-installations-r4222-20");
    expect(ligne?.datePrevue.toISOString().slice(0, 10)).toBe("2027-10-01");
  });
});

// 2026-11-13 (ADR-057, § « À trancher ») — L 57 § 1 a et L 13 § 5 passent de
// l'établissement à la scène, sous le même identifiant : même chemin.
describe("salle L de 3ᵉ catégorie : la triennale de scène d'établissement se disperse sur les scènes", () => {
  const TRIENNALE_SCENE = "scene-erp-verifications-triennales-organisme-agree";
  const scene = (id: string, createdAt: Date): EquipementFaux => ({
    id,
    libelle: `Scène ${id}`,
    categorie: "SCENE",
    caracteristiques: null,
    actif: true,
    createdAt,
  });

  it("chaque scène déclarée avant le rapport le reprend ; la ligne d'établissement est archivée", async () => {
    poserEtablissement(
      "L",
      [scene("s1", new Date("2026-01-01T10:00:00Z")), scene("s2", new Date("2026-02-01T10:00:00Z"))],
      "N3",
    );
    db.verifications = [
      ligneEtablissement(TRIENNALE_SCENE, { realisateurRequis: ["organisme_agree"] }),
    ];
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    expect(plan.aArchiver.map((a) => a.id)).toContain("v-etab");
    const lignes = lignesDe(plan, TRIENNALE_SCENE);
    expect(lignes.map((l) => l.equipementId).sort()).toEqual(["s1", "s2"]);
    for (const l of lignes) expect(l.datePrevue.toISOString().slice(0, 10)).toBe("2029-03-10");
  });

  it("une scène déclarée après le rapport n'en hérite pas (limite écrite dans `realisationDispersee`)", async () => {
    poserEtablissement("L", [scene("tard", new Date("2026-06-01T10:00:00Z"))], "N3");
    db.verifications = [
      ligneEtablissement(TRIENNALE_SCENE, { realisateurRequis: ["organisme_agree"] }),
    ];
    const plan = planifier(await lireEntrees(client, ETAB_ID), MAINTENANT);
    expect(lignesDe(plan, TRIENNALE_SCENE)[0].statut).toBe("a_planifier");
  });
});
