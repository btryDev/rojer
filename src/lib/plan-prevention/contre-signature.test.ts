import { beforeEach, describe, expect, it, vi } from "vitest";
import { correspond } from "@/test/prisma-where";

/**
 * La contre-signature du plan de prévention (ADR-061) : proposer, révoquer,
 * accepter ou refuser, et la re-signature qui ne compte pas dans la formule.
 *
 * Le faux client applique les clauses qu'il reçoit (`correspond`) et refuse
 * les écritures qu'il ne connaît pas ; il sait remplacer les lignes d'un plan
 * en bloc (`lignes: { deleteMany, create }`), comme le fait l'acceptation.
 */

type Ligne = Record<string, unknown>;

function appliquer(ligne: Ligne, data: Ligne) {
  for (const [clef, v] of Object.entries(data)) {
    if (clef === "lignes" && v && typeof v === "object") {
      const op = v as { create: Ligne[] };
      ligne.lignes = op.create.map((l) => ({ ...l }));
      continue;
    }
    if (v && typeof v === "object" && !(v instanceof Date) && !Array.isArray(v)) {
      throw new Error(`écriture inconnue du faux client : ${clef}`);
    }
    ligne[clef] = v;
  }
}

function table(lignes: Ligne[]) {
  const trouver = async ({ where }: { where: Ligne }) => {
    const l = lignes.find((x) => correspond(x, where));
    return l ? { ...l } : null;
  };
  return {
    lignes,
    findUnique: vi.fn(trouver),
    findFirst: vi.fn(trouver),
    findMany: vi.fn(async ({ where }: { where: Ligne }) =>
      lignes.filter((x) => correspond(x, where)).map((x) => ({ ...x })),
    ),
    count: vi.fn(async ({ where }: { where: Ligne }) => lignes.filter((x) => correspond(x, where)).length),
    create: vi.fn(async ({ data }: { data: Ligne }) => {
      // Les défauts de la base, et la relation jusqu'au compte (`correspond`
      // la traverse pour les lectures bornées au compte).
      const l = {
        enAttente: true,
        statut: "en_attente",
        etablissement: { entreprise: { compteId: "user-1" } },
        ...data,
      };
      lignes.push(l);
      return { ...l };
    }),
    update: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      const l = lignes.find((x) => correspond(x, where));
      if (!l) throw new Error("P2025");
      appliquer(l, data);
      return { ...l };
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      const t = lignes.filter((x) => correspond(x, where));
      t.forEach((l) => appliquer(l, data));
      return { count: t.length };
    }),
  };
}

const { prismaMock, mails, aux, envoiAcces } = vi.hoisted(() => ({
  prismaMock: {} as Record<string, unknown> & {
    accessToken: ReturnType<typeof table>;
    signature: ReturnType<typeof table>;
    planPrevention: ReturnType<typeof table>;
    propositionModificationPlan: ReturnType<typeof table>;
  },
  mails: [] as { to: string; subject: string; text: string; html?: string }[],
  aux: [] as { compteId: string; subject: string; text: string; html?: string }[],
  // Un lien d'accès dont l'envoi part en erreur (fournisseur injoignable).
  envoiAcces: { echoue: false },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/compte-hors-session", async () =>
  (await import("@/test/garde-simulee")).compteHorsSessionSimule(),
);
vi.mock("@/lib/auth/compte", async () => {
  const { clientDuCompteSimule } = await import("@/test/garde-simulee");
  return {
    requireCompte: async () => ({
      user: { id: "user-1", email: "dirigeant@utilisatrice.fr" },
      compte: { compteId: "user-1" },
      db: await clientDuCompteSimule(),
    }),
  };
});
// L'émission du nouveau lien d'un refus passe par la garde de l'établissement.
vi.mock("@/lib/auth/scope", async () => {
  const { clientDuCompteSimule } = await import("@/test/garde-simulee");
  return {
    assertEtablissementDuCompte: async () => ({
      user: { id: "user-1", email: "dirigeant@utilisatrice.fr" },
      compte: { compteId: "user-1", role: "owner" },
      db: await clientDuCompteSimule(),
    }),
  };
});
vi.mock("@/lib/abonnements/saisie", () => ({ verifierSaisie: async () => undefined }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("next/server", () => ({ after: (fn: () => unknown) => void fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/storage", () => ({ getStorage: vi.fn() }));
vi.mock("@/lib/securite/limite-debit", async (orig) => ({
  ...(await orig<typeof import("@/lib/securite/limite-debit")>()),
  consommer: async () => ({ ok: true }),
}));
vi.mock("@/lib/abonnements/rappels", () => ({
  ecrireAuxProprietaires: vi.fn(async (compteId: string, m: { subject: string; text: string; html?: string }) => {
    aux.push({ compteId, ...m });
    return { partis: 1, echec: false };
  }),
}));
vi.mock("@/lib/email", () => ({
  motifErreur: (e: unknown) => (e instanceof Error ? e.message : "erreur inconnue"),
  sendMail: vi.fn(async (m: { to: string; subject: string; text: string; html?: string }) => {
    if (envoiAcces.echoue && m.text.includes("/acces/")) throw new Error("fournisseur injoignable");
    mails.push(m);
  }),
  envoiEnService: () => true,
  publicAppUrl: () => "http://localhost:3000",
  refusUrlPublique: () => null,
}));

import { hashToken } from "@/lib/access-tokens/token";
import { proposerModificationPlan } from "./proposition-actions";
import { revoquerSignaturesPlan, traiterProposition } from "./contre-signature-actions";
import { signatureDejaComptee } from "./resignature";
import { objetEstSignable } from "@/lib/signatures/etat-signable";

const JETON = "jeton-clair-de-test-assez-long-pour-passer-0099";
const COMPTE = { etablissement: { entreprise: { compteId: "user-1" } } };

function jeton(partie: string): Ligne {
  return {
    id: "atk_ee",
    tokenHash: hashToken(JETON),
    etablissementId: "etab-1",
    scope: "signature",
    objetType: "plan_prevention",
    objetId: "pp-1",
    partie,
    emailDestinataire: "chef@exterieure.fr",
    nomDestinataire: "Jean Dupond",
    otpHash: null,
    otpEssaisRestants: 3,
    otpExpireLe: null,
    expireLe: new Date(Date.now() + 24 * 3_600_000),
    createdAt: new Date(),
    utiliseLe: null,
    revoqueLe: null,
    revoqueMotif: null,
    ...COMPTE,
  };
}

function proposer(contenu: unknown) {
  const fd = new FormData();
  fd.set("proposition", typeof contenu === "string" ? contenu : JSON.stringify(contenu));
  return proposerModificationPlan(JETON, { status: "idle" }, fd);
}

const FICHE = {
  entrepriseExterieureRaison: "Nettoyage SARL",
  entrepriseExterieureSiret: null,
  efChefNom: "Jean Dupond",
  efEffectifIntervenant: 2,
};
const LIGNE_1 = {
  id: "l1",
  risque: "Sol mouillé",
  mesureEntrepriseUtilisatrice: "Informer",
  mesureEntrepriseExterieure: "Panneaux",
};

beforeEach(() => {
  mails.length = 0;
  aux.length = 0;
  prismaMock.accessToken = table([jeton("entreprise_exterieure")]);
  prismaMock.planPrevention = table([
    {
      id: "pp-1",
      etablissementId: "etab-1",
      statut: "valide",
      numero: 1,
      ...FICHE,
      efChefEmail: "chef@exterieure.fr",
      lignes: [{ ...LIGNE_1, ordre: 0 }],
      lieux: "Cuisine",
      dateDebut: new Date("2026-12-01T08:00:00Z"),
      dateFin: new Date("2026-12-05T17:00:00Z"),
      phasesDangereuses: [],
      propositions: [],
      ...COMPTE,
    },
  ]);
  prismaMock.signature = table([
    {
      id: "sig_eu",
      etablissementId: "etab-1",
      objetType: "plan_prevention",
      objetId: "pp-1",
      partie: "entreprise_utilisatrice",
      signataireNom: "Marie Martin",
      signataireEmail: "marie@utilisatrice.fr",
      active: true,
      revoqueLe: null,
      ...COMPTE,
    },
  ]);
  prismaMock.propositionModificationPlan = table([]);
  // Ce que lit l'émission d'un nouveau lien (raison sociale, plafonds).
  prismaMock.etablissement = table([
    { id: "etab-1", entreprise: { raisonSociale: "Boulangerie <Martin>", compteId: "user-1" } },
  ]);
  prismaMock.consommationQuota = table([]);
  envoiAcces.echoue = false;
  prismaMock.$transaction = async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock);
  prismaMock.$queryRaw = async () => [];
});

describe("l'entreprise extérieure propose une modification (ADR-061 § 3)", () => {
  it("la proposition s'enregistre et le dirigeant est prévenu ; rien n'est révoqué (revue de sécurité)", async () => {
    const r = await proposer({
      fiche: { ...FICHE, efChefNom: "Paul Dupond" },
      lignes: [LIGNE_1, { risque: "Produits chimiques", mesureEntrepriseExterieure: "Fiches de sécurité" }],
    });
    expect(r).toEqual({ status: "success" });

    const [p] = prismaMock.propositionModificationPlan.lignes;
    expect(p).toMatchObject({ planPreventionId: "pp-1", accessTokenId: "atk_ee", enAttente: true });

    // Proposer ne demande pas de code : ni signature ni lien ne tombe.
    const [s] = prismaMock.signature.lignes;
    expect(s.active).toBe(true);
    expect(prismaMock.planPrevention.lignes[0].statut).toBe("valide");
    expect(prismaMock.accessToken.lignes[0].revoqueLe).toBeNull();

    await vi.waitFor(() => expect(aux).toHaveLength(1));
    expect(aux[0].compteId).toBe("user-1");
    expect(mails).toHaveLength(0);
    // E3 en HTML, avec son bouton vers la fiche du plan (2026-11-19).
    expect(aux[0].subject).toBe("Modifications proposées : Plan de prévention PP-001 — Nettoyage SARL");
    expect(aux[0].html).toContain(">Voir les modifications proposées</a>");
    expect(aux[0].html).toContain('href="http://localhost:3000/etablissements/etab-1/plan-prevention/pp-1"');
    expect(aux[0].text).toContain("Le plan ne se signe pas tant que vous n'avez pas décidé.");
  });

  it("une proposition qui ne change rien est refusée, sans rien révoquer", async () => {
    const r = await proposer({ fiche: FICHE, lignes: [LIGNE_1] });
    expect(r).toMatchObject({ status: "error", message: "Votre proposition ne change rien au plan." });
    expect(prismaMock.signature.lignes[0].active).toBe(true);
  });

  it("un identifiant de ligne étranger au plan est refusé", async () => {
    const r = await proposer({ fiche: FICHE, lignes: [{ ...LIGNE_1, id: "ligne-d-un-autre-plan" }] });
    expect(r).toMatchObject({ status: "error", message: "Une ligne de risque ne correspond pas à ce plan." });
    expect(prismaMock.propositionModificationPlan.lignes).toHaveLength(0);
  });

  it("l'adresse e-mail n'est pas dans la proposition : elle ne se modifie pas", async () => {
    const r = await proposer({
      fiche: { ...FICHE, efChefNom: "Paul Dupond", efChefEmail: "pirate@ailleurs.fr" },
      lignes: [LIGNE_1],
    });
    expect(r.status).toBe("success");
    expect(JSON.stringify(prismaMock.propositionModificationPlan.lignes[0].contenu)).not.toContain("pirate");
  });

  it("un lien émis pour l'entreprise utilisatrice ne propose rien", async () => {
    prismaMock.accessToken = table([jeton("entreprise_utilisatrice")]);
    const r = await proposer({ fiche: { ...FICHE, efChefNom: "Paul" }, lignes: [LIGNE_1] });
    expect(r.status).toBe("error");
    expect(prismaMock.propositionModificationPlan.lignes).toHaveLength(0);
  });

  it("une proposition en attente rend le plan non signable", async () => {
    prismaMock.planPrevention.lignes[0].propositions = [{ id: "ppm_1", enAttente: true }];
    const { clientDuCompteSimule } = await import("@/test/garde-simulee");
    expect(await objetEstSignable(await clientDuCompteSimule(), "plan_prevention", "pp-1", "etab-1")).toBe(false);
  });
});

describe("le dirigeant traite la proposition (ADR-061 § 4)", () => {
  beforeEach(async () => {
    await proposer({
      fiche: { ...FICHE, efChefNom: "Paul Dupond" },
      lignes: [{ ...LIGNE_1, mesureEntrepriseExterieure: "Panneaux et balisage" }],
    });
    // L'avis au dirigeant part après la réponse : attendu, puis oublié.
    await vi.waitFor(() => expect(aux).toHaveLength(1));
    mails.length = 0;
  });

  const decider = (decision: string) => {
    const fd = new FormData();
    fd.set("decision", decision);
    const id = prismaMock.propositionModificationPlan.lignes[0].id as string;
    return traiterProposition(id, { status: "idle" }, fd);
  };

  it("accepter révoque les signatures, applique la fiche et les lignes, et prévient chacun", async () => {
    const r = await decider("accepter");
    expect(r.status).toBe("success");
    const plan = prismaMock.planPrevention.lignes[0];
    expect(plan.efChefNom).toBe("Paul Dupond");
    expect((plan.lignes as Ligne[])[0].mesureEntrepriseExterieure).toBe("Panneaux et balisage");
    expect(prismaMock.propositionModificationPlan.lignes[0]).toMatchObject({
      statut: "acceptee",
      enAttente: null,
      traiteeParEmail: "dirigeant@utilisatrice.fr",
    });
    expect(prismaMock.signature.lignes[0]).toMatchObject({ active: null });
    expect(prismaMock.signature.lignes[0].revoqueMotif).toMatch(/proposé une modification/);
    expect(prismaMock.planPrevention.lignes[0].statut).toBe("attente_signatures");
    await vi.waitFor(() =>
      expect(mails.map((m) => m.to).sort()).toEqual(["chef@exterieure.fr", "marie@utilisatrice.fr"]),
    );
    expect(mails.find((m) => m.to === "chef@exterieure.fr")?.subject).toMatch(/^Proposition acceptée/);
    expect(mails.find((m) => m.to === "chef@exterieure.fr")?.html).toContain(">Proposition acceptée</h1>");
  });

  it("un plan modifié depuis la proposition ne se l'applique pas, il se refuse encore", async () => {
    // Le dirigeant a retouché le plan pendant que la proposition attendait.
    prismaMock.planPrevention.lignes[0].lieux = "Réserve, corrigé à la main";
    expect(await decider("accepter")).toMatchObject({
      status: "error",
      message: "Le plan a changé depuis la proposition : refusez-la et corrigez le plan à la main.",
    });
    expect(prismaMock.signature.lignes[0].active).toBe(true);
    expect((await decider("refuser")).status).toBe("success");
  });

  it("refuser ne touche ni au plan ni aux signatures", async () => {
    const r = await decider("refuser");
    expect(r.status).toBe("success");
    expect(prismaMock.signature.lignes[0].active).toBe(true);
    expect(prismaMock.planPrevention.lignes[0].efChefNom).toBe("Jean Dupond");
    expect(prismaMock.propositionModificationPlan.lignes[0].statut).toBe("refusee");
  });

  it("refuser émet un nouveau lien à l'auteur, et l'avis de décision le porte (2026-11-19)", async () => {
    const r = await decider("refuser");
    expect(r).toMatchObject({
      status: "success",
      message: "Proposition refusée. Un nouveau lien de signature est parti à chef@exterieure.fr : le plan se signe tel qu'il est.",
    });

    const nouveaux = prismaMock.accessToken.lignes.filter((t) => t.id !== "atk_ee");
    expect(nouveaux).toHaveLength(1);
    expect(nouveaux[0]).toMatchObject({
      scope: "signature",
      objetType: "plan_prevention",
      objetId: "pp-1",
      partie: "entreprise_exterieure",
      emailDestinataire: "chef@exterieure.fr",
      nomDestinataire: "Jean Dupond",
      createdByUserId: "user-1",
    });

    // UN message : l'avis de décision EST le courriel du lien.
    await vi.waitFor(() => expect(mails).toHaveLength(1));
    const [m] = mails;
    expect(m.to).toBe("chef@exterieure.fr");
    expect(m.subject).toBe("Proposition non retenue — PP-001");
    expect(m.text).toContain("le plan reste tel qu'il était");
    expect(m.text).toMatch(/Consulter et signer le plan : http:\/\/localhost:3000\/acces\/\S+/);
    expect(m.html).toContain(">Consulter et signer le plan</a>");
    // La raison sociale du compte, échappée.
    expect(m.html).toContain("Boulangerie &lt;Martin&gt; n&#39;a pas retenu");
    expect(m.html).not.toContain("<Martin>");
  });

  it("refuser, lien en échec : le refus tient, l'avis part sans lien et dit d'en demander un", async () => {
    envoiAcces.echoue = true;
    const r = await decider("refuser");
    expect(r).toMatchObject({
      status: "success",
      message: expect.stringContaining("Le nouveau lien de signature n'a pas pu partir"),
    });
    expect(prismaMock.propositionModificationPlan.lignes[0].statut).toBe("refusee");
    // Le lien préparé est révoqué par l'émission (envoi échoué).
    const nouveaux = prismaMock.accessToken.lignes.filter((t) => t.id !== "atk_ee");
    expect(nouveaux.every((t) => t.revoqueLe instanceof Date)).toBe(true);

    await vi.waitFor(() => expect(mails).toHaveLength(1));
    const [m] = mails;
    expect(m.to).toBe("chef@exterieure.fr");
    expect(m.subject).toMatch(/^Proposition non retenue : /);
    expect(m.text).not.toContain("/acces/");
    expect(m.text).toContain("Pour le signer, demandez un nouveau lien à votre interlocuteur.");
  });

  it("refuser quand l'entreprise extérieure a déjà signé : aucun lien, l'avis seul", async () => {
    prismaMock.signature.lignes.push({
      id: "sig_ee",
      etablissementId: "etab-1",
      objetType: "plan_prevention",
      objetId: "pp-1",
      partie: "entreprise_exterieure",
      signataireNom: "Jean Dupond",
      signataireEmail: "chef@exterieure.fr",
      active: true,
      revoqueLe: null,
      ...COMPTE,
    });
    expect(await decider("refuser")).toEqual({ status: "success", message: "Proposition refusée." });
    expect(prismaMock.accessToken.lignes.filter((t) => t.id !== "atk_ee")).toHaveLength(0);
    await vi.waitFor(() => expect(mails).toHaveLength(1));
    expect(mails[0].text).not.toContain("/acces/");
  });

  it("une proposition déjà traitée ne se traite pas deux fois", async () => {
    await decider("refuser");
    expect(await decider("accepter")).toMatchObject({ status: "error" });
    expect(prismaMock.planPrevention.lignes[0].efChefNom).toBe("Jean Dupond");
  });
});

describe("révoquer les signatures pour corriger (ADR-061 § 2)", () => {
  it("révoque, date, et prévient chaque signataire", async () => {
    const r = await revoquerSignaturesPlan("pp-1", { status: "idle" });
    expect(r.status).toBe("success");
    expect(prismaMock.signature.lignes[0]).toMatchObject({ active: null });
    expect(prismaMock.signature.lignes[0].revoqueMotif).toMatch(/corrige le plan/);
    await vi.waitFor(() => expect(mails.map((m) => m.to)).toEqual(["marie@utilisatrice.fr"]));
    expect(mails[0].html).toContain(">Signature révoquée</h1>");
    expect(mails[0].text).toContain("Elle reste enregistrée, avec sa date");
  });

  it("qui révoque ne reçoit pas l'avis de sa propre révocation (2026-11-19)", async () => {
    prismaMock.signature.lignes[0].signataireEmail = "Dirigeant@Utilisatrice.fr";
    prismaMock.signature.lignes.push({
      id: "sig_ee",
      etablissementId: "etab-1",
      objetType: "plan_prevention",
      objetId: "pp-1",
      partie: "entreprise_exterieure",
      signataireNom: "Jean Dupond",
      signataireEmail: "chef@exterieure.fr",
      active: true,
      revoqueLe: null,
      ...COMPTE,
    });
    expect((await revoquerSignaturesPlan("pp-1", { status: "idle" })).status).toBe("success");
    await vi.waitFor(() => expect(mails.map((m) => m.to)).toEqual(["chef@exterieure.fr"]));
  });

  it("sans signature active, rien à révoquer", async () => {
    prismaMock.signature.lignes[0].active = null;
    expect(await revoquerSignaturesPlan("pp-1", { status: "idle" })).toMatchObject({ status: "error" });
  });
});

describe("la re-signature ne compte pas dans la formule (ADR-061 § 6)", () => {
  const params = { etablissementId: "etab-1", objetType: "plan_prevention", objetId: "pp-1" } as const;
  const compte = (partie: "entreprise_utilisatrice" | "entreprise_exterieure", email: string, objetType = "plan_prevention") =>
    signatureDejaComptee(prismaMock as never, { ...params, objetType, partie, email });

  it("une première signature compte", async () => {
    expect(await compte("entreprise_exterieure", "chef@exterieure.fr")).toBe(false);
  });

  it("le même signataire, après révocation, ne compte plus", async () => {
    await revoquerSignaturesPlan("pp-1", { status: "idle" });
    expect(await compte("entreprise_utilisatrice", "marie@utilisatrice.fr")).toBe(true);
  });

  it("un autre signataire, après révocation, compte : un plan réécrit n'est plus le même plan", async () => {
    await revoquerSignaturesPlan("pp-1", { status: "idle" });
    expect(await compte("entreprise_utilisatrice", "autre@ailleurs.fr")).toBe(false);
  });

  it("l'auteur d'une proposition ne compte plus, sur le lien de la même adresse", async () => {
    await proposer({ fiche: { ...FICHE, efChefNom: "Paul" }, lignes: [LIGNE_1] });
    expect(await compte("entreprise_exterieure", "chef@exterieure.fr")).toBe(true);
    expect(await compte("entreprise_exterieure", "autre@exterieure.fr")).toBe(false);
  });

  it("au-delà de trois re-signatures gratuites, la signature compte", async () => {
    for (let i = 0; i < 3; i++) {
      prismaMock.signature.lignes.push({
        id: `sig_old_${i}`,
        etablissementId: "etab-1",
        objetType: "plan_prevention",
        objetId: "pp-1",
        partie: "entreprise_exterieure",
        signataireEmail: "chef@exterieure.fr",
        active: null,
        revoqueLe: new Date(),
      });
      expect(await compte("entreprise_exterieure", "chef@exterieure.fr"), `fois ${i + 1}`).toBe(true);
    }
    prismaMock.signature.lignes.push({
      id: "sig_old_3",
      etablissementId: "etab-1",
      objetType: "plan_prevention",
      objetId: "pp-1",
      partie: "entreprise_exterieure",
      signataireEmail: "chef@exterieure.fr",
      active: null,
      revoqueLe: new Date(),
    });
    expect(await compte("entreprise_exterieure", "chef@exterieure.fr")).toBe(false);
  });

  it("hors plan de prévention, rien n'est épargné", async () => {
    expect(await compte("entreprise_exterieure", "chef@exterieure.fr", "permis_feu")).toBe(false);
  });
});
