// Le parcours d'un membre contre un VRAI PostgreSQL et le vrai Better Auth
// (ADR-054 § 5 et § 6), avec de vraies sessions : une propriétaire invite, la
// personne invitée accepte et voit les dossiers du compte ; retirée, elle perd
// l'accès. Les refus que le plugin et nos crochets doivent tenir y sont
// éprouvés un à un.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe
// une base LOCALE migrée. Il n'efface que ce qu'il crée.

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/membres");
vi.unmock("@/lib/auth/portee/client");
// `nextCookies` écrit les cookies de la réponse : hors requête Next, un magasin vide.
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: () => undefined, get: () => undefined, getAll: () => [], toString: () => "" }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/auth/require-user", () => ({ lireSessionCourante: async () => null }));

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("membres et invitations — PostgreSQL et Better Auth réels", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  process.env.BETTER_AUTH_SECRET ??= "secret-de-test-integration-0123456789abcdef";
  process.env.PUBLIC_APP_URL ??= "http://localhost:3000";
  const { prisma } = await import("@/lib/prisma");
  const { auth } = await import("@/lib/auth/better-auth");
  const { compteDOnboarding, appartenanceCourante, invitationsPourAdresse } = await import("@/lib/auth/membres");
  const { clientBorne } = await import("@/lib/auth/portee/client");

  const suffixe = randomUUID().slice(0, 8);
  const MOT_DE_PASSE = "un-mot-de-passe-solide-42";
  const adresses = { a: `proprio-${suffixe}@exemple.test`, b: `invite-${suffixe}@exemple.test`, c: `autre-${suffixe}@exemple.test` };
  const ids: Record<string, string> = {};
  const cookies: Record<string, Headers> = {};
  let compteA = "";
  let etabA = "";
  const entreprises: string[] = [];

  /** Une personne inscrite, adresse confirmée, connectée : ses en-têtes de session. */
  async function personne(cle: keyof typeof adresses) {
    const email = adresses[cle];
    const inscrite = await auth.api.signUpEmail({ body: { email, password: MOT_DE_PASSE, name: cle.toUpperCase() } });
    ids[cle] = inscrite.user.id;
    await prisma.user.update({ where: { id: ids[cle] }, data: { emailVerified: true } });
    const { headers } = await auth.api.signInEmail({ body: { email, password: MOT_DE_PASSE }, returnHeaders: true });
    const jar = headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    cookies[cle] = new Headers({ cookie: jar });
  }

  beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const c of ["a", "b", "c"] as const) await personne(c);
    compteA = (await compteDOnboarding(ids.a, "Café du Port")).compteId;
    const ent = await prisma.entreprise.create({
      data: {
        compteId: compteA,
        raisonSociale: "Café du Port",
        effectif: 4,
        adresse: "1 quai",
        etablissements: { create: { raisonDisplay: "Café", adresse: "1 quai", codeNaf: "56.10A", effectifSurSite: 4 } },
      },
      include: { etablissements: true },
    });
    entreprises.push(ent.id);
    etabA = ent.etablissements[0].id;
  });

  afterAll(async () => {
    await prisma.entreprise.deleteMany({ where: { id: { in: entreprises } } });
    await prisma.compte.deleteMany({ where: { id: compteA } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await prisma.$disconnect();
  });

  const inviter = (qui: keyof typeof adresses, email: string, role: string) =>
    auth.api.createInvitation({ headers: cookies[qui], body: { email, role: role as "member", organizationId: compteA } });

  it("un rôle multiple ou inconnu est refusé à l'invitation", async () => {
    await expect(inviter("a", adresses.b, "member,lecture")).rejects.toThrow();
    await expect(inviter("a", adresses.b, "admin")).rejects.toThrow();
    expect(await invitationsPourAdresse(adresses.b)).toEqual([]);
  });

  it("la propriétaire invite ; la personne invitée voit l'invitation, une autre adresse non", async () => {
    await inviter("a", adresses.b, "member");
    const recues = await invitationsPourAdresse(adresses.b);
    expect(recues.map((i) => [i.compte, i.role])).toEqual([["Café du Port", "member"]]);
    expect(await invitationsPourAdresse(adresses.c)).toEqual([]);
  });

  it("une autre personne ne peut pas accepter l'invitation d'une autre adresse", async () => {
    const [invitation] = await invitationsPourAdresse(adresses.b);
    await expect(
      auth.api.acceptInvitation({ headers: cookies.c, body: { invitationId: invitation.id } }),
    ).rejects.toThrow();
    expect(await appartenanceCourante(ids.c, compteA)).toBeNull();
  });

  it("acceptée, l'invitation fait un membre qui lit les dossiers du compte", async () => {
    const [invitation] = await invitationsPourAdresse(adresses.b);
    await auth.api.acceptInvitation({ headers: cookies.b, body: { invitationId: invitation.id } });
    const a = await appartenanceCourante(ids.b, null);
    expect(a).toEqual({ compteId: compteA, role: "member" });
    const db = clientBorne({ type: "compte", compteId: a!.compteId, userId: ids.b });
    expect((await db.etablissement.findMany({ select: { id: true } })).map((e) => e.id)).toEqual([etabA]);
    expect(await invitationsPourAdresse(adresses.b)).toEqual([]);
  });

  it("un membre ne peut ni inviter, ni retirer, ni changer un rôle", async () => {
    await expect(inviter("b", adresses.c, "member")).rejects.toThrow();
    const proprio = await prisma.membre.findFirstOrThrow({ where: { compteId: compteA, userId: ids.a } });
    await expect(
      auth.api.removeMember({ headers: cookies.b, body: { memberIdOrEmail: proprio.id, organizationId: compteA } }),
    ).rejects.toThrow();
    await expect(
      auth.api.updateMemberRole({ headers: cookies.b, body: { memberId: proprio.id, role: "lecture", organizationId: compteA } }),
    ).rejects.toThrow();
    expect((await appartenanceCourante(ids.a, compteA))?.role).toBe("owner");
  });

  it("la dernière propriétaire ne peut ni partir ni être rétrogradée à un rôle multiple", async () => {
    await expect(
      auth.api.leaveOrganization({ headers: cookies.a, body: { organizationId: compteA } }),
    ).rejects.toThrow();
    const membre = await prisma.membre.findFirstOrThrow({ where: { compteId: compteA, userId: ids.b } });
    await expect(
      auth.api.updateMemberRole({ headers: cookies.a, body: { memberId: membre.id, role: "member,owner", organizationId: compteA } }),
    ).rejects.toThrow();
    expect((await appartenanceCourante(ids.a, compteA))?.role).toBe("owner");
  });

  it("la propriétaire passe le membre en lecture seule : son client n'écrit plus", async () => {
    const membre = await prisma.membre.findFirstOrThrow({ where: { compteId: compteA, userId: ids.b } });
    await auth.api.updateMemberRole({ headers: cookies.a, body: { memberId: membre.id, role: "lecture", organizationId: compteA } });
    const a = await appartenanceCourante(ids.b, null);
    expect(a?.role).toBe("lecture");
    const db = clientBorne({ type: "compte", compteId: compteA, userId: ids.b, lectureSeule: a?.role === "lecture" });
    await expect(db.etablissement.update({ where: { id: etabA }, data: { raisonDisplay: "x" } })).rejects.toThrow(
      /lecture seule/,
    );
  });

  it("retiré, le membre perd l'accès, et ses sessions oublient le compte", async () => {
    await prisma.session.updateMany({ where: { userId: ids.b }, data: { compteActifId: compteA } });
    const membre = await prisma.membre.findFirstOrThrow({ where: { compteId: compteA, userId: ids.b } });
    await auth.api.removeMember({ headers: cookies.a, body: { memberIdOrEmail: membre.id, organizationId: compteA } });
    expect(await appartenanceCourante(ids.b, compteA)).toBeNull();
    expect(await prisma.session.count({ where: { userId: ids.b, compteActifId: compteA } })).toBe(0);
  });
});
