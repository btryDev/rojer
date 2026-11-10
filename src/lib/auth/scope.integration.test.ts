// La matrice inter-comptes, à plusieurs membres (ADR-051, ADR-054), contre un
// VRAI PostgreSQL : chaque garde de `scope.ts` est appelée sur les
// identifiants du compte A par chaque profil.
//
// - Le propriétaire, un membre et un lecteur de A reçoivent la ligne de A, et
//   un client borné à A (il rend les établissements de A, aucun de B).
// - Le propriétaire de B reçoit « introuvable », même avec A pour compte actif
//   forgé dans sa session.
// - Un membre retiré de A n'ouvre plus rien à l'appel suivant, sa session
//   gardant A pour compte actif : sans autre compte, il est renvoyé à
//   l'onboarding ; membre d'un autre compte, il y retombe et reçoit
//   « introuvable ».
//
// La liste des gardes se lit dans les exports de `scope.ts`, jamais recopiée :
// toute fonction exportée a son cas ou un motif écrit hors matrice, sinon le
// test d'exhaustivité tombe, quel que soit son préfixe. Deux
// témoins, gardes volontairement cassées et définies ICI, prouvent que la
// matrice voit une fuite.
//
// Le niveau est celui des gardes, pas un rejeu HTTP des routes :
// `tenancy-routes` impose déjà que chaque route passe par elles.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe
// une base LOCALE migrée. Il n'efface que ce qu'il crée.

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/portee/client");
vi.unmock("@/lib/auth/membres");
vi.unmock("@/lib/abonnements/saisie");
// `better-auth.ts` n'est lu que pour créer un compte, éprouvé à part
// (`creer-compte.integration`).
vi.mock("@/lib/auth/better-auth", () => ({ auth: {} }));

// La session : la personne, son compte actif (une préférence, jamais une
// preuve d'appartenance) et le cookie de l'établissement actif.
const session = vi.hoisted(() => ({ userId: "", compteActifId: null as string | null, cookie: null as string | null }));
vi.mock("@/lib/auth/require-user", () => {
  const user = () => ({ id: session.userId, email: `${session.userId}@exemple.test`, twoFactorEnabled: false });
  return {
    requireUser: async () => user(),
    getOptionalUser: async () => user(),
    lireSessionCourante: async () => ({ session: { activeOrganizationId: session.compteActifId } }),
  };
});
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nom: string) => (nom === "etablissement-actif" && session.cookie ? { value: session.cookie } : undefined),
  }),
}));
// L'offre, lancée pour un seul cas (la saisie fermée, plus bas) : partout
// ailleurs Stripe reste tel que l'environnement le dit (inactif en CI).
const offre = vi.hoisted(() => ({ lancee: false }));
vi.mock("@/lib/stripe/config", async (reel) => {
  const r = await reel<typeof import("@/lib/stripe/config")>();
  return { ...r, etatStripe: () => (offre.lancee ? { active: true as const, mode: "test" as const } : r.etatStripe()) };
});

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("gardes de scope.ts, d'un compte à l'autre — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { Prisma } = await import("@prisma/client");
  const scope = await import("./scope");
  const { requireCompte } = await import("./compte");
  const { sondeClesCroisees } = await import("./portee/sonde-cles-croisees");
  const { notFound } = await import("next/navigation");
  const { verifierSaisie, verifierRole, verifierProprietaire } = await import("@/lib/abonnements/saisie");
  const { creerCompteDeTest, creerUtilisateurDeTest, effacerUtilisateursDeTest } = await import(
    "@/test/utilisateur-de-test"
  );

  // --- Les personnes ---------------------------------------------------------

  const P = randomUUID(); // propriétaire de A
  const M = randomUUID(); // membre de A
  const L = randomUUID(); // lecteur de A
  const R = randomUUID(); // retiré de A, sans autre compte
  const R2 = randomUUID(); // retiré de A, propriétaire de C
  const R3 = randomUUID(); // retiré de A, membre de D
  const PB = randomUUID(); // propriétaire de B
  const PD = randomUUID(); // propriétaire de D
  const I = randomUUID(); // invitée dans A, sans compte
  const X = randomUUID(); // propriétaire de E, lecteur de F
  const PF = randomUUID(); // propriétaire de F
  const PERSONNES = [P, M, L, R, R2, R3, PB, PD, I, X, PF];

  type Profil = { nom: string; userId: string; compteActifId: () => string | null };
  let A = "";
  let B = "";
  let C = "";
  let D = "";
  let E = "";
  let F = "";
  const PROFILS: Profil[] = [
    { nom: "propriétaire de A", userId: P, compteActifId: () => A },
    { nom: "membre de A", userId: M, compteActifId: () => A },
    { nom: "lecteur de A", userId: L, compteActifId: () => A },
    { nom: "propriétaire de B", userId: PB, compteActifId: () => null },
    { nom: "propriétaire de B, A forgé en compte actif", userId: PB, compteActifId: () => A },
    { nom: "retiré de A, sans autre compte", userId: R, compteActifId: () => A },
    { nom: "retiré de A, propriétaire de C", userId: R2, compteActifId: () => A },
    { nom: "retiré de A, membre de D, sans compte actif", userId: R3, compteActifId: () => null },
    { nom: "invitée dans A, sans compte", userId: I, compteActifId: () => null },
  ];

  /** Ce qu'une garde rend à un profil. */
  type Issue = "ligne de A" | "introuvable" | "onboarding";
  const ATTENDU_PAR_DEFAUT: Record<string, Issue> = {
    "propriétaire de A": "ligne de A",
    "membre de A": "ligne de A",
    "lecteur de A": "ligne de A",
    "propriétaire de B": "introuvable",
    "propriétaire de B, A forgé en compte actif": "introuvable",
    "retiré de A, sans autre compte": "onboarding",
    "retiré de A, propriétaire de C": "introuvable",
    "retiré de A, membre de D, sans compte actif": "introuvable",
    "invitée dans A, sans compte": "onboarding",
  };

  function comme(p: Pick<Profil, "userId" | "compteActifId">, cookie: string | null = null) {
    session.userId = p.userId;
    session.compteActifId = p.compteActifId();
    session.cookie = cookie;
  }

  // --- Le semis : une ligne par entité qu'une garde vise, dans A et dans B ---

  const PASSE = new Date("2024-03-15T10:00:00Z");
  async function semer(compteId: string, nom: string) {
    const entreprise = await prisma.entreprise.create({
      data: { compteId, raisonSociale: nom, effectif: 5, adresse: "1 rue" },
    });
    const etab = await prisma.etablissement.create({
      data: { entrepriseId: entreprise.id, raisonDisplay: nom, adresse: "1 rue", codeNaf: "56.10A", effectifSurSite: 5 },
    });
    const duerp = await prisma.duerp.create({ data: { etablissementId: etab.id } });
    const unite = await prisma.uniteTravail.create({ data: { duerpId: duerp.id, nom: "Cuisine" } });
    const risque = await prisma.risque.create({
      data: { uniteId: unite.id, libelle: "Brûlure", gravite: 2, probabilite: 2, maitrise: 2, criticite: 8 },
    });
    const action = await prisma.action.create({
      data: { etablissementId: etab.id, risqueId: risque.id, libelle: "Gants", type: "protection_individuelle" },
    });
    const verification = await prisma.verification.create({
      data: {
        etablissementId: etab.id,
        obligationId: "matrice-gardes",
        libelleObligation: "Vérification de la matrice",
        periodicite: "annuelle",
        datePrevue: PASSE,
      },
    });
    const rapport = await prisma.rapportVerification.create({
      data: {
        etablissementId: etab.id,
        verificationId: verification.id,
        dateRapport: PASSE,
        resultat: "conforme",
        fichierCle: `matrice/${nom}.pdf`,
        fichierNomOriginal: "rapport.pdf",
        fichierMime: "application/pdf",
        fichierTaille: 9,
      },
    });
    const carnet = await prisma.carnetSanitaire.create({ data: { etablissementId: etab.id } });
    const analyse = await prisma.analyseLegionelle.create({
      data: { carnetId: carnet.id, dateAnalyse: PASSE, conforme: true },
    });
    const prestataire = await prisma.prestataire.create({
      data: { etablissementId: etab.id, raisonSociale: "Contrôles SARL", contactNom: "M. Martin", contactEmail: "c@exemple.test", domaines: [] },
    });
    const piece = await prisma.piecePrestataire.create({
      data: { prestataireId: prestataire.id, type: "kbis", fichierCle: `matrice/${nom}-kbis.pdf` },
    });
    return {
      entreprise: entreprise.id,
      etab: etab.id,
      duerp: duerp.id,
      unite: unite.id,
      risque: risque.id,
      action: action.id,
      verification: verification.id,
      rapport: rapport.id,
      analyse: analyse.id,
      prestataire: prestataire.id,
      piece: piece.id,
    };
  }
  type Semis = Awaited<ReturnType<typeof semer>>;
  let a: Semis;
  let b: Semis;
  let invitation = "";

  beforeAll(async () => {
    for (const u of [M, L, R, R3, I]) await creerUtilisateurDeTest(prisma, u);
    A = await creerCompteDeTest(prisma, P);
    B = await creerCompteDeTest(prisma, PB);
    C = await creerCompteDeTest(prisma, R2);
    D = await creerCompteDeTest(prisma, PD);
    E = await creerCompteDeTest(prisma, X);
    F = await creerCompteDeTest(prisma, PF);
    await prisma.membre.createMany({
      data: [
        { compteId: A, userId: M, role: "member" },
        { compteId: A, userId: L, role: "lecture" },
        { compteId: A, userId: R, role: "member" },
        { compteId: A, userId: R2, role: "member" },
        { compteId: A, userId: R3, role: "member" },
        { compteId: D, userId: R3, role: "member" },
        { compteId: F, userId: X, role: "lecture" },
      ],
    });
    a = await semer(A, "A");
    b = await semer(B, "B");
    invitation = (
      await prisma.invitationCompte.create({
        data: { compteId: A, email: `${I}@exemple.test`, role: "member", expiresAt: new Date(Date.now() + 86_400_000), inviterId: P },
      })
    ).id;
    // Le retrait : les lignes Membre disparaissent, les sessions (simulées)
    // gardent A pour compte actif.
    await prisma.membre.deleteMany({ where: { compteId: A, userId: { in: [R, R2, R3] } } });
  });
  afterAll(async () => {
    await prisma.entreprise.deleteMany({ where: { compteId: { in: [A, B, C, D, E, F] } } });
    await prisma.compte.deleteMany({ where: { id: { in: [A, B, C, D, E, F] } } });
    await effacerUtilisateursDeTest(prisma, PERSONNES);
    await prisma.$disconnect();
  });

  // --- Les cas : comment appeler chaque garde, et ce qu'elle rend ------------

  type Cas = {
    /** L'appel, sur les identifiants de A. */
    appel: () => Promise<unknown>;
    /** L'identifiant de A que le résultat porte, `null` s'il n'en porte aucun. */
    lit: (r: never) => string | null;
    attendu: () => string;
    /** La garde ne rend pas de client (`db`) : rien à vérifier de sa borne. */
    sansDb?: true;
    /** Les profils dont l'issue diffère du défaut. */
    attendus?: Partial<Record<string, Issue>>;
  };

  const CAS: Record<string, Cas> = {
    requireEtablissement: {
      appel: () => scope.requireEtablissement(a.etab),
      lit: (r: { etablissement: { id: string } }) => r.etablissement.id,
      attendu: () => a.etab,
    },
    requireDuerp: {
      appel: () => scope.requireDuerp(a.duerp),
      lit: (r: { duerp: { id: string } }) => r.duerp.id,
      attendu: () => a.duerp,
    },
    requireUnite: {
      appel: () => scope.requireUnite(a.unite),
      lit: (r: { unite: { id: string } }) => r.unite.id,
      attendu: () => a.unite,
    },
    requireRisque: {
      appel: () => scope.requireRisque(a.risque),
      lit: (r: { risque: { id: string } }) => r.risque.id,
      attendu: () => a.risque,
    },
    requireAction: {
      appel: () => scope.requireAction(a.action),
      lit: (r: { action: { id: string } }) => r.action.id,
      attendu: () => a.action,
    },
    requireMesure: {
      appel: () => scope.requireMesure(a.action),
      lit: (r: { action: { id: string } }) => r.action.id,
      attendu: () => a.action,
    },
    requireVerification: {
      appel: () => scope.requireVerification(a.verification),
      lit: (r: { verification: { id: string } }) => r.verification.id,
      attendu: () => a.verification,
    },
    requireRapportVerification: {
      appel: () => scope.requireRapportVerification(a.rapport),
      lit: (r: { rapport: { id: string } }) => r.rapport.id,
      attendu: () => a.rapport,
    },
    requireAnalyseLegionelle: {
      appel: () => scope.requireAnalyseLegionelle(a.analyse),
      lit: (r: { analyse: { id: string } }) => r.analyse.id,
      attendu: () => a.analyse,
    },
    requirePrestataire: {
      appel: () => scope.requirePrestataire(a.prestataire),
      lit: (r: { prestataire: { id: string } }) => r.prestataire.id,
      attendu: () => a.prestataire,
    },
    requirePiecePrestataire: {
      appel: () => scope.requirePiecePrestataire(a.piece, a.prestataire),
      lit: (r: { piece: { id: string } }) => r.piece.id,
      attendu: () => a.piece,
    },
    // Rend des lignes, pas un client ; « introuvable » est une liste vide. Sa
    // couverture fine (chaque appelant) est `sql-proprietaire.integration`.
    requireLectureSqlProprietaire: {
      appel: () =>
        scope.requireLectureSqlProprietaire<{ id: string }>('v."etablissementId"', (proprietaire) =>
          Prisma.sql`SELECT v."id" FROM "Verification" v WHERE v."etablissementId" = ${a.etab} AND ${proprietaire}`,
        ),
      lit: (r: { id: string }[]) => r.map((l) => l.id).join(",") || null,
      attendu: () => a.verification,
      sansDb: true,
    },
    // Ne lit pas le compte : la personne à qui l'invitation est adressée,
    // personne d'autre — les membres de A compris.
    requireInvitationDeLaSession: {
      appel: () => scope.requireInvitationDeLaSession(invitation),
      lit: (r: { invitation: { id: string } }) => r.invitation.id,
      attendu: () => invitation,
      sansDb: true,
      attendus: {
        "propriétaire de A": "introuvable",
        "membre de A": "introuvable",
        "lecteur de A": "introuvable",
        "retiré de A, sans autre compte": "introuvable",
        "invitée dans A, sans compte": "ligne de A",
      },
    },
    assertEtablissementOwnership: {
      appel: () => scope.assertEtablissementOwnership(a.etab),
      lit: () => "passe",
      attendu: () => "passe",
      sansDb: true,
    },
    assertEtablissementDuCompte: {
      appel: () => scope.assertEtablissementDuCompte(a.etab),
      lit: () => "passe",
      attendu: () => "passe",
    },
    assertEntrepriseDuCompte: {
      appel: () => scope.assertEntrepriseDuCompte(a.entreprise),
      lit: () => "passe",
      attendu: () => "passe",
    },
  };

  /**
   * Les fonctions exportées par scope.ts qui ne passent pas par la matrice,
   * chacune avec son motif. Liste FERMÉE : une fonction exportée qui n'est ni
   * ici ni dans `CAS` fait tomber le test d'exhaustivité, quel que soit son
   * préfixe (`getX`, `lireX`…).
   */
  const HORS_MATRICE: Record<string, string> = {
    getOptionalUserEtablissement:
      "ne reçoit aucun identifiant : elle lit le cookie de l'établissement actif, éprouvé par le test du cookie forgé (plus bas)",
  };

  /** Les gardes d'un module : toutes ses fonctions exportées, hors de `HORS_MATRICE`. */
  function gardesDe(exports: Record<string, unknown>): string[] {
    return Object.keys(exports)
      .filter((nom) => typeof exports[nom] === "function" && !(nom in HORS_MATRICE))
      .sort();
  }

  /**
   * Les écarts d'une garde à la matrice, un par profil fautif (vide si tout
   * est conforme). Pour chaque issue « ligne de A », le client rendu doit
   * aussi être borné à A : il lit les établissements de A, aucun de B.
   */
  async function ecarts(cas: Cas): Promise<string[]> {
    const trouves: string[] = [];
    for (const profil of PROFILS) {
      comme(profil);
      const attendu = cas.attendus?.[profil.nom] ?? ATTENDU_PAR_DEFAUT[profil.nom];
      let issue: string;
      let resultat: unknown;
      try {
        resultat = await cas.appel();
        const lu = cas.lit(resultat as never);
        issue = lu === null ? "introuvable" : lu === cas.attendu() ? "ligne de A" : `autre ligne (${lu})`;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        issue =
          message === "NOT_FOUND" ? "introuvable" : message === "REDIRECT /onboarding" ? "onboarding" : `erreur (${message})`;
      }
      if (issue !== attendu) {
        trouves.push(`${profil.nom} : ${issue}, attendu ${attendu}`);
        continue;
      }
      if (issue === "ligne de A" && !cas.sansDb) {
        const db = (resultat as { db?: { etablissement: { findMany(a: object): Promise<{ id: string }[]> } } }).db;
        if (!db) {
          trouves.push(`${profil.nom} : aucun client rendu`);
          continue;
        }
        const ids = (await db.etablissement.findMany({ select: { id: true } })).map((e) => e.id);
        if (ids.length !== 1 || ids[0] !== a.etab)
          trouves.push(`${profil.nom} : client mal borné, il lit [${ids.join(", ")}] au lieu de [${a.etab}]`);
      }
    }
    return trouves;
  }

  // --- La matrice ------------------------------------------------------------

  it("chaque fonction exportée par scope.ts a son cas ou son motif hors matrice, et rien d'autre", () => {
    expect(gardesDe(scope)).toEqual(Object.keys(CAS).sort());
    // Pas de motif pour une fonction qui n'existe plus.
    for (const nom of Object.keys(HORS_MATRICE)) expect(typeof (scope as Record<string, unknown>)[nom], nom).toBe("function");
  });

  it("une fonction exportée non classée, quel que soit son préfixe, fait tomber l'exhaustivité", () => {
    const etendu = { ...scope, lireEtablissementSansGarde: async () => null };
    expect(gardesDe(etendu)).toEqual([...gardesDe(scope), "lireEtablissementSansGarde"].sort());
  });

  describe.each(gardesDe(scope))("%s", (nom) => {
    it("rend la ligne de A aux membres de A, et rien à personne d'autre", async () => {
      const cas = CAS[nom];
      expect(cas, `${nom} n'a pas de cas dans la matrice`).toBeDefined();
      expect(await ecarts(cas)).toEqual([]);
    });
  });

  it("une pièce de A, demandée sous le prestataire de B, est introuvable pour tous", async () => {
    for (const profil of PROFILS.filter((p) => ["propriétaire de A", "propriétaire de B"].includes(p.nom))) {
      comme(profil);
      await expect(scope.requirePiecePrestataire(a.piece, b.prestataire)).rejects.toThrow("NOT_FOUND");
      await expect(scope.requirePiecePrestataire(b.piece, a.prestataire)).rejects.toThrow("NOT_FOUND");
    }
  });

  // --- Les témoins : la matrice voit une garde cassée -------------------------
  // Définis ici et non dans scope.ts : ce ne sont PAS des gardes. Déplacés
  // dans scope.ts, ils y seraient des fonctions non classées, et feraient
  // tomber l'exhaustivité.

  /** Témoin : lit l'action par le client brut, sans la borne au compte. */
  const temoinLigneNonBornee: Cas = {
    appel: async () => {
      const { db } = await requireCompte();
      const action = await prisma.action.findFirst({ where: { id: a.action } });
      if (!action) notFound();
      return { db, action };
    },
    lit: (r: { action: { id: string } }) => r.action.id,
    attendu: () => a.action,
  };

  /** Témoin : vérifie la bonne ligne, mais rend le client brut. */
  const temoinClientNonBorne: Cas = {
    appel: async () => {
      const r = await scope.requireAction(a.action);
      return { ...r, db: prisma };
    },
    lit: (r: { action: { id: string } }) => r.action.id,
    attendu: () => a.action,
  };

  it("témoin : une garde qui lit hors du compte est vue (B reçoit la ligne de A)", async () => {
    expect(await ecarts(temoinLigneNonBornee)).toEqual(
      expect.arrayContaining([
        "propriétaire de B : ligne de A, attendu introuvable",
        "retiré de A, propriétaire de C : ligne de A, attendu introuvable",
      ]),
    );
  });

  it("témoin : une garde qui rend un client non borné est vue", async () => {
    expect(await ecarts(temoinClientNonBorne)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^propriétaire de A : client mal borné/)]),
    );
  });

  // --- Lecture seule et gestes réservés (ADR-054 § 4, § 8) --------------------

  async function issueDe(geste: () => Promise<unknown>): Promise<string> {
    try {
      await geste();
      return "passe";
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }
  const profil = (nom: string) => PROFILS.find((p) => p.nom === nom)!;

  it("verifierSaisie et verifierRole renvoient le lecteur à la page de la lecture seule", async () => {
    for (const [nom, attendu] of [
      ["propriétaire de A", "passe"],
      ["membre de A", "passe"],
      ["lecteur de A", "REDIRECT /compte/lecture-seule"],
    ] as const) {
      comme(profil(nom));
      expect([nom, await issueDe(verifierSaisie)]).toEqual([nom, attendu]);
      expect([nom, await issueDe(verifierRole)]).toEqual([nom, attendu]);
    }
  });

  it("verifierProprietaire ne laisse passer que le propriétaire", async () => {
    for (const [nom, attendu] of [
      ["propriétaire de A", "passe"],
      ["membre de A", "REDIRECT /compte/membres?reserve=proprietaire"],
      ["lecteur de A", "REDIRECT /compte/membres?reserve=proprietaire"],
      ["retiré de A, sans autre compte", "REDIRECT /compte/membres?reserve=proprietaire"],
    ] as const) {
      comme(profil(nom));
      expect([nom, await issueDe(verifierProprietaire)]).toEqual([nom, attendu]);
    }
  });

  it("un geste du propriétaire reste sur le compte vérifié quand un autre onglet change de compte actif", async () => {
    // X est propriétaire de E et lecteur de F (comptes propres à ce cas : la
    // matrice ne les voit pas). La garde passe sur E…
    const f = await semer(F, "F");
    comme({ userId: X, compteActifId: () => E });
    const verifie = await verifierProprietaire();
    expect(verifie.compte).toMatchObject({ compteId: E, role: "owner" });
    // … puis un autre onglet bascule sur F avant que l'action ne lise.
    comme({ userId: X, compteActifId: () => F });
    await expect(scope.assertEntrepriseDuCompte(f.entreprise, verifie)).rejects.toThrow("NOT_FOUND");
    await expect(scope.assertEtablissementDuCompte(f.etab, verifie)).rejects.toThrow("NOT_FOUND");
    // Sans le compte vérifié, la garde relit F et passe : la course que le
    // passage de `verifie` ferme (audit de sécurité du 2026-11-10).
    expect((await scope.assertEntrepriseDuCompte(f.entreprise)).compte).toMatchObject({ compteId: F, role: "lecture" });
  });

  it("le client qu'une garde rend au lecteur refuse l'écriture ; celui du membre écrit", async () => {
    comme(profil("lecteur de A"));
    const { db } = await scope.requireEtablissement(a.etab);
    await expect(db.etablissement.update({ where: { id: a.etab }, data: { raisonDisplay: "L" } })).rejects.toThrow(
      /lecture seule/,
    );
    comme(profil("membre de A"));
    const { db: dbMembre } = await scope.requireEtablissement(a.etab);
    await dbMembre.etablissement.update({ where: { id: a.etab }, data: { raisonDisplay: "A" } });
  });

  // --- L'établissement actif (ADR-028) ----------------------------------------

  it("un cookie qui désigne un établissement de A ne l'ouvre pas au propriétaire de B", async () => {
    comme(profil("propriétaire de B"), a.etab);
    expect((await scope.getOptionalUserEtablissement())?.id).toBe(b.etab);
    comme(profil("propriétaire de B, A forgé en compte actif"), a.etab);
    expect((await scope.getOptionalUserEtablissement())?.id).toBe(b.etab);
    comme(profil("membre de A"), a.etab);
    expect((await scope.getOptionalUserEtablissement())?.id).toBe(a.etab);
  });

  // --- La saisie fermée portée par le client (ADR-053 § 3, amendé ; audit du
  // 2026-11-10, piste 2) : la course des deux onglets ------------------------

  it("la garde de saisie juge un compte qui paie, l'onglet voisin bascule sur un compte impayé : son client refuse l'écriture", async () => {
    // X est propriétaire de E (qui paie) et membre de F (sans abonnement).
    const X = randomUUID();
    const E = randomUUID();
    const F = randomUUID();
    await prisma.user.create({ data: { id: X, name: "X", email: `${X}@exemple.test` } });
    const etab: Record<string, string> = {};
    for (const [compteId, role] of [[E, "owner"], [F, "member"]] as const) {
      await prisma.compte.create({ data: { id: compteId, name: compteId, slug: compteId, membres: { create: { userId: X, role } } } });
      const entreprise = await prisma.entreprise.create({ data: { compteId, raisonSociale: compteId, effectif: 5, adresse: "1 rue" } });
      etab[compteId] = (
        await prisma.etablissement.create({
          data: { entrepriseId: entreprise.id, raisonDisplay: "avant", adresse: "1 rue", codeNaf: "56.10A", effectifSurSite: 5 },
        })
      ).id;
    }
    await prisma.abonnement.create({ data: { compteId: E, stripeCustomerId: `cus_${E}`, statut: "active" } });
    offre.lancee = true;
    vi.stubEnv("ABONNEMENT_EXIGE", "oui");
    try {
      comme({ userId: X, compteActifId: () => E });
      expect(await verifierSaisie()).toBe(E);
      // Un autre onglet change de compte actif avant que l'action ne relise.
      comme({ userId: X, compteActifId: () => F });
      const { compte, db } = await scope.assertEtablissementDuCompte(etab[F]);
      expect(compte.compteId).toBe(F);
      await expect(db.etablissement.update({ where: { id: etab[F] }, data: { raisonDisplay: "écrit" } })).rejects.toThrow(
        "REDIRECT /compte/abonnement?saisie=fermee",
      );
      // La lecture reste ouverte ; rien n'est écrit.
      expect((await db.etablissement.findUnique({ where: { id: etab[F] } }))?.raisonDisplay).toBe("avant");
      // Sur E, qui paie, la même écriture passe.
      comme({ userId: X, compteActifId: () => E });
      const { db: dbE } = await scope.assertEtablissementDuCompte(etab[E]);
      await dbE.etablissement.update({ where: { id: etab[E] }, data: { raisonDisplay: "écrit" } });
      expect((await prisma.etablissement.findUniqueOrThrow({ where: { id: etab[E] } })).raisonDisplay).toBe("écrit");
    } finally {
      offre.lancee = false;
      vi.unstubAllEnvs();
      for (const compteId of [E, F]) {
        await prisma.abonnement.deleteMany({ where: { compteId } });
        await prisma.entreprise.deleteMany({ where: { compteId } });
        await prisma.compte.deleteMany({ where: { id: compteId } });
      }
      await prisma.user.deleteMany({ where: { id: X } });
    }
  });

  // --- La sonde des clés croisées, après toutes les tentatives croisées ------
  // Aucune ligne ne doit pointer vers une ligne d'un autre compte (ni d'un
  // autre établissement), quel que soit le chemin d'écriture.

  it("après la matrice, aucun lien croisé entre comptes", async () => {
    expect(await sondeClesCroisees(prisma)).toEqual([]);
  });
});
