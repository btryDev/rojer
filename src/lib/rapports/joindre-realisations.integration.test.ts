// La « dernière réalisation » lue par la base (`DISTINCT ON`) contre un VRAI
// PostgreSQL : elle doit rendre, pour chaque ligne, exactement ce que rend le
// départage du moteur (`indexerDernieresRealisations`) sur la liste complète
// des rapports — ex æquo du même jour compris. Un faux client ne dirait rien
// d'une requête SQL.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `REALISATIONS_INTEGRATION_URL` pointe
// une base LOCALE migrée qui porte au moins une ligne (par ex. une base de
// mesure du plan performance) :
//   REALISATIONS_INTEGRATION_URL=postgresql://duerp:<mdp>@localhost:5433/duerp_perf_gros \
//     pnpm exec vitest run joindre-realisations.integration
// Il ajoute deux rapports `test-integration` à une ligne existante, et les efface.

import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// La requête porte la portée au propriétaire : l'utilisateur est celui du
// dossier lu, posé avant chaque test.
const session = vi.hoisted(() => ({ userId: "" }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: session.userId, email: null }),
}));

const URL_BASE = process.env.REALISATIONS_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("dernière réalisation — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const {
    joindreDernieresRealisations,
    dernieresRealisationsDeLEtablissement,
    derniersRapportsDeLEtablissement,
  } = await import("./joindre-realisations");
  const { indexerDernieresRealisations, WHERE_RAPPORT_REALISE } = await import(
    "./derniere-realisation"
  );
  const MARQUE = "test-integration-realisations";

  const nettoyer = () =>
    prisma.rapportVerification.deleteMany({ where: { fichierCle: { startsWith: MARQUE } } });
  afterAll(async () => {
    await nettoyer();
    await prisma.$disconnect();
  });

  /** Ce que rend le moteur sur la liste complète : la référence. */
  async function reference(ids: string[]) {
    return indexerDernieresRealisations(
      await prisma.rapportVerification.findMany({
        where: { verificationId: { in: ids }, ...WHERE_RAPPORT_REALISE },
        select: { verificationId: true, dateRapport: true, createdAt: true, resultat: true },
      }),
    );
  }

  async function comparer(etablissementId: string, ids: string[]) {
    const index = await reference(ids);
    const joint = await joindreDernieresRealisations(etablissementId, ids.map((id) => ({ id })));
    for (const l of joint) {
      const attendu = index.get(l.id) ?? null;
      expect({ id: l.id, date: l.derniereRealisation, resultat: l.dernierResultat }).toEqual({
        id: l.id,
        date: attendu?.dateRapport ?? null,
        resultat: attendu?.resultat ?? null,
      });
    }
    return joint;
  }

  /** Le dossier le plus fourni, et son propriétaire comme session. */
  async function dossier() {
    const etab = await prisma.etablissement.findFirstOrThrow({
      orderBy: { verifications: { _count: "desc" } },
      select: { id: true, entreprise: { select: { userId: true } } },
    });
    if (!etab.entreprise.userId) throw new Error("dossier sans propriétaire");
    session.userId = etab.entreprise.userId;
    const ids = (
      await prisma.verification.findMany({ where: { etablissementId: etab.id }, select: { id: true } })
    ).map((v) => v.id);
    return { etablissementId: etab.id, ids };
  }

  it("rend, ligne par ligne, le départage du moteur sur tout un dossier", async () => {
    const { etablissementId, ids } = await dossier();
    expect(ids.length).toBeGreaterThan(0);
    const joint = await comparer(etablissementId, ids);
    // Lignes sans rapport : présentes, à `null` — jamais retirées.
    expect(joint).toHaveLength(ids.length);
  });

  it("le dernier rapport tout résultat confondu : le départage du moteur sans filtre", async () => {
    const { etablissementId, ids } = await dossier();
    const attendu = indexerDernieresRealisations(
      await prisma.rapportVerification.findMany({
        where: { verificationId: { in: ids } },
        select: { verificationId: true, dateRapport: true, createdAt: true, resultat: true },
      }),
    );
    const index = await derniersRapportsDeLEtablissement(etablissementId);
    for (const id of ids) {
      const d = index.get(id);
      expect(d ? { dateRapport: d.dateRapport, resultat: d.resultat } : null).toEqual(attendu.get(id) ?? null);
    }
  });

  it("un autre compte ne lit rien, même avec les bons identifiants", async () => {
    const { etablissementId, ids } = await dossier();
    expect([...(await reference(ids)).keys()].length).toBeGreaterThan(0);
    session.userId = "00000000-0000-4000-8000-0000000000aa";
    expect(
      (await joindreDernieresRealisations(etablissementId, ids.map((id) => ({ id })))).every(
        (l) => l.derniereRealisation === null,
      ),
    ).toBe(true);
    expect((await dernieresRealisationsDeLEtablissement(etablissementId)).size).toBe(0);
  });

  it("deux rapports du même jour : l'instant de dépôt départage, résultat compris", async () => {
    await nettoyer();
    const { ids } = await dossier();
    const ligne = await prisma.verification.findUniqueOrThrow({
      where: { id: ids[0] },
      select: { id: true, etablissementId: true },
    });
    const jour = new Date(Date.UTC(2099, 0, 15));
    const commun = {
      etablissementId: ligne.etablissementId,
      verificationId: ligne.id,
      dateRapport: jour,
      fichierNomOriginal: "r.pdf",
      fichierMime: "application/pdf",
      fichierTaille: 1,
    };
    // Le premier déposé porte un écart, le second est conforme : le dernier
    // est le second, et son résultat doit être lu.
    await prisma.rapportVerification.create({
      data: { ...commun, resultat: "ecart_majeur", fichierCle: `${MARQUE}/1`, createdAt: new Date(Date.UTC(2099, 0, 15, 8)) },
    });
    await prisma.rapportVerification.create({
      data: { ...commun, resultat: "conforme", fichierCle: `${MARQUE}/2`, createdAt: new Date(Date.UTC(2099, 0, 15, 9)) },
    });
    const [l] = await comparer(ligne.etablissementId, [ligne.id]);
    expect(l.derniereRealisation).toEqual(jour);
    expect(l.dernierResultat).toBe("conforme");
  });

  it("un rapport non réalisé ne compte pas", async () => {
    await nettoyer();
    const { ids } = await dossier();
    const ligne = await prisma.verification.findUniqueOrThrow({
      where: { id: ids[0] },
      select: { id: true, etablissementId: true },
    });
    const avant = (await joindreDernieresRealisations(ligne.etablissementId, [{ id: ligne.id }]))[0];
    await prisma.rapportVerification.create({
      data: {
        etablissementId: ligne.etablissementId,
        verificationId: ligne.id,
        dateRapport: new Date(Date.UTC(2099, 5, 1)),
        resultat: "non_verifiable",
        fichierCle: `${MARQUE}/nv`,
        fichierNomOriginal: "r.pdf",
        fichierMime: "application/pdf",
        fichierTaille: 1,
      },
    });
    const apres = (await joindreDernieresRealisations(ligne.etablissementId, [{ id: ligne.id }]))[0];
    expect(apres.derniereRealisation).toEqual(avant.derniereRealisation);
    expect(apres.dernierResultat).toBe(avant.dernierResultat);
  });
});
