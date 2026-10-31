// Les lectures en SQL brut (`requireLectureSqlProprietaire`, ADR-051 § 5)
// contre un VRAI PostgreSQL : connecté comme B, l'établissement de A ne rend
// RIEN ; connecté comme A, il rend tout (témoin).
//
// Pourquoi ce test : le helper vérifie que le prédicat propriétaire est
// PRÉSENT dans la requête, pas qu'il filtre (un `OR ${proprietaire}`, ou une
// sous-requête qui l'omet, passeraient). Ici c'est le RÉSULTAT qui est
// vérifié : chaque sous-requête a une ligne de A à compter, donc un prédicat
// qui ne filtre pas se voit dans les nombres que B reçoit.
//
// SAUTÉ PAR DÉFAUT, comme `portee/client.integration` : il ne tourne que si
// `ISOLATION_INTEGRATION_URL` pointe une base LOCALE migrée, qu'il VIDE
// (`TRUNCATE "Entreprise" CASCADE`, et sur cc `TRUNCATE "User" CASCADE`).

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/portee/client");

// La session : le compte « connecté » se choisit par test.
const session = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: session.userId, email: `${session.userId}@exemple.invalid` }),
  getOptionalUser: async () => ({ id: session.userId, email: `${session.userId}@exemple.invalid` }),
}));

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("SQL brut borné au propriétaire — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { Prisma } = await import("@prisma/client");
  const { anneesDuRegistre } = await import("@/lib/rapports/queries");
  const { derniersRapportsDeLEtablissement } = await import("@/lib/rapports/joindre-realisations");
  const { comptesModulesDuRendu } = await import("@/lib/etablissements/modules");

  const A = "00000000-0000-0000-0000-0000000005aa";
  const B = "00000000-0000-0000-0000-0000000005bb";
  const PASSE = new Date("2024-03-15T10:00:00Z");
  const AUJOURDHUI = Date.UTC(2026, 9, 31);

  const avecUtilisateurs = Prisma.dmmf.datamodel.models.some((m) => m.name === "User");
  async function utilisateur(id: string) {
    if (!avecUtilisateurs) return;
    const u = (prisma as unknown as Record<string, { upsert(a: object): Promise<unknown> }>).user;
    await u.upsert({ where: { id }, create: { id, name: id, email: `${id}@exemple.invalid` }, update: {} });
  }

  /** Un dossier où chaque sous-requête des trois lectures a une ligne à compter. */
  async function semer(userId: string, nom: string) {
    await utilisateur(userId);
    const ent = await prisma.entreprise.create({ data: { userId, raisonSociale: nom, effectif: 5, adresse: "1 rue" } });
    const etab = await prisma.etablissement.create({
      data: { entrepriseId: ent.id, raisonDisplay: nom, adresse: "1 rue", codeNaf: "56.10A", effectifSurSite: 5 },
    });
    const verif = await prisma.verification.create({
      data: {
        etablissementId: etab.id,
        obligationId: "validation-sql",
        libelleObligation: "Vérification de validation",
        periodicite: "annuelle",
        datePrevue: PASSE,
      },
    });
    await prisma.rapportVerification.create({
      data: {
        etablissementId: etab.id,
        verificationId: verif.id,
        dateRapport: PASSE,
        resultat: "conforme",
        fichierCle: `validation/${nom}.pdf`,
        fichierNomOriginal: "rapport.pdf",
        fichierMime: "application/pdf",
        fichierTaille: 9,
      },
    });
    // Échu et non clos : compté par « total » ET par « échus ».
    await prisma.permisFeu.create({
      data: {
        etablissementId: etab.id,
        numero: 1,
        prestataireRaison: "Soudure SARL",
        prestataireContact: "M. Martin",
        prestataireEmail: "contact@exemple.invalid",
        donneurOrdreNom: "Mme Durand",
        dateDebut: PASSE,
        dateFin: PASSE,
        descriptionTravaux: "Soudure",
        lieu: "Cuisine",
        naturesTravaux: ["soudage_arc"],
        statut: "valide",
      },
    });
    // Échu, non clos, sans inspection : compté par les trois sous-requêtes des plans.
    await prisma.planPrevention.create({
      data: {
        etablissementId: etab.id,
        numero: 1,
        entrepriseExterieureRaison: "Nettoyage SAS",
        efChefNom: "M. Petit",
        efChefEmail: "chef@exemple.invalid",
        efEffectifIntervenant: 2,
        euChefNom: "Mme Durand",
        dateDebut: PASSE,
        dateFin: PASSE,
        lieux: "Cuisine",
        naturesTravaux: "Nettoyage",
        statut: "valide",
      },
    });
    return { etab, verif };
  }

  let a: Awaited<ReturnType<typeof semer>>;

  beforeAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Entreprise" CASCADE');
    if (avecUtilisateurs) await prisma.$executeRawUnsafe('TRUNCATE "User" CASCADE');
    a = await semer(A, "A");
    await semer(B, "B");
  });
  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "Entreprise" CASCADE');
    if (avecUtilisateurs) await prisma.$executeRawUnsafe('TRUNCATE "User" CASCADE');
    await prisma.$disconnect();
  });

  const comme = (userId: string) => {
    session.userId = userId;
  };

  it("registre par année : B ne voit pas les années de A", async () => {
    comme(A);
    expect(await anneesDuRegistre(a.etab.id, 2026)).toEqual([2026, 2024]);
    comme(B);
    expect(await anneesDuRegistre(a.etab.id, 2026)).toEqual([2026]);
  });

  it("dernière réalisation : B ne lit aucun rapport de A", async () => {
    comme(A);
    expect([...(await derniersRapportsDeLEtablissement(a.etab.id)).keys()]).toEqual([a.verif.id]);
    comme(B);
    expect((await derniersRapportsDeLEtablissement(a.etab.id)).size).toBe(0);
  });

  it("compteurs des modules : chacune des cinq sous-requêtes rend 0 à B", async () => {
    comme(A);
    const pourA = await comptesModulesDuRendu(a.etab.id, AUJOURDHUI);
    expect({ permis: pourA.permisFeu, plans: pourA.plansPrevention }).toEqual({
      permis: { total: 1, echusNonClos: 1 },
      plans: { total: 1, sansInspection: 1, echusNonClos: 1 },
    });
    comme(B);
    const pourB = await comptesModulesDuRendu(a.etab.id, AUJOURDHUI);
    expect({ permis: pourB.permisFeu, plans: pourB.plansPrevention }).toEqual({
      permis: { total: 0, echusNonClos: 0 },
      plans: { total: 0, sansInspection: 0, echusNonClos: 0 },
    });
  });
});
