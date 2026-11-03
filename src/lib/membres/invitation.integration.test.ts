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

  /** Le motif d'un refus : le code du plugin, sinon le message (nos crochets). */
  async function motif(p: Promise<unknown>): Promise<string> {
    try {
      await p;
    } catch (e) {
      const corps = (e as { body?: { code?: string; message?: string } }).body;
      return corps?.code ?? corps?.message ?? (e as Error).message;
    }
    throw new Error("le geste devait être refusé");
  }

  const inviter = (qui: keyof typeof adresses, email: string, role: string) =>
    auth.api.createInvitation({ headers: cookies[qui], body: { email, role: role as "member", organizationId: compteA } });

  it("un rôle multiple ou inconnu est refusé à l'invitation", async () => {
    expect(await motif(inviter("a", adresses.b, "member,lecture"))).toMatch(/rôle|ROLE/i);
    expect(await motif(inviter("a", adresses.b, "admin"))).toMatch(/rôle|ROLE/i);
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
    expect(await motif(auth.api.acceptInvitation({ headers: cookies.c, body: { invitationId: invitation.id } }))).toBe(
      "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION",
    );
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
    expect(await motif(inviter("b", adresses.c, "member"))).toBe("YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION");
    const proprio = await prisma.membre.findFirstOrThrow({ where: { compteId: compteA, userId: ids.a } });
    expect(
      await motif(auth.api.removeMember({ headers: cookies.b, body: { memberIdOrEmail: proprio.id, organizationId: compteA } })),
    ).toMatch(/YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER|YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER/);
    expect(
      await motif(
        auth.api.updateMemberRole({ headers: cookies.b, body: { memberId: proprio.id, role: "lecture", organizationId: compteA } }),
      ),
    ).toBe("YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER");
    expect((await appartenanceCourante(ids.a, compteA))?.role).toBe("owner");
  });

  it("la dernière propriétaire ne peut ni partir, ni se rétrograder elle-même", async () => {
    expect(await motif(auth.api.leaveOrganization({ headers: cookies.a, body: { organizationId: compteA } }))).toBe(
      "YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER",
    );
    const elle = await prisma.membre.findFirstOrThrow({ where: { compteId: compteA, userId: ids.a } });
    expect(
      await motif(
        auth.api.updateMemberRole({ headers: cookies.a, body: { memberId: elle.id, role: "member", organizationId: compteA } }),
      ),
    ).toMatch(/OWNER|propriétaire/i);
    const membre = await prisma.membre.findFirstOrThrow({ where: { compteId: compteA, userId: ids.b } });
    expect(
      await motif(
        auth.api.updateMemberRole({ headers: cookies.a, body: { memberId: membre.id, role: "member,owner", organizationId: compteA } }),
      ),
    ).toMatch(/rôle|ROLE/i);
    expect((await appartenanceCourante(ids.a, compteA))?.role).toBe("owner");
  });

  it("une invitation ne vaut plus quand son auteur n'est plus propriétaire, même sans passer par le plugin", async () => {
    // B devient propriétaire et invite C ; puis B perd le rôle (en base,
    // sans crochet) : l'acceptation relit l'invitant et refuse.
    const membre = await prisma.membre.findFirstOrThrow({ where: { compteId: compteA, userId: ids.b } });
    await auth.api.updateMemberRole({ headers: cookies.a, body: { memberId: membre.id, role: "owner", organizationId: compteA } });
    await inviter("b", adresses.c, "owner");
    const [invitation] = await invitationsPourAdresse(adresses.c);
    await prisma.membre.update({ where: { id: membre.id }, data: { role: "member" } });
    expect(await motif(auth.api.acceptInvitation({ headers: cookies.c, body: { invitationId: invitation.id } }))).toMatch(
      /plus propriétaire/,
    );
    expect(await appartenanceCourante(ids.c, compteA)).toBeNull();
    // Et rétrogradé par le plugin, ses invitations en attente tombent.
    await prisma.membre.update({ where: { id: membre.id }, data: { role: "owner" } });
    await auth.api.updateMemberRole({ headers: cookies.a, body: { memberId: membre.id, role: "member", organizationId: compteA } });
    expect(await invitationsPourAdresse(adresses.c)).toEqual([]);
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
