import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Isolation entre clients sur l'émission d'un accès de signature, et
 * non-remontée des facteurs au demandeur.
 *
 * Ces tests **tentent la traversée** au lieu de relire la forme d'un `where` :
 * les modèles Prisma sont remplacés par des tables en mémoire qui appliquent
 * réellement la clause reçue. Un code qui interroge par identifiant seul
 * obtient donc la ligne du voisin, exactement comme en base — c'est ce qui
 * fait qu'un relâchement se voit ici.
 *
 * Deux défauts sont couverts, et ils tenaient ensemble :
 *
 * 1. `emettreAccessToken` vérifiait que l'appelant possède `etablissementId`,
 *    jamais que `objetId` s'y trouve. La pose de signature y résistait
 *    (`calculerHashObjet` borne sa recherche), mais la page `/acces/[token]`
 *    affichait le libellé de l'objet sans le borner : le nom de fichier et
 *    l'obligation d'un rapport d'un autre client se lisaient ainsi.
 * 2. La server action rendait le code de confirmation en clair, et le lien,
 *    au navigateur du demandeur. Les deux facteurs entre les mains de celui
 *    dont la signature du tiers doit être indépendante.
 *
 * Le second se vérifie ici de la seule façon qui vaille : on lit le code dans
 * le message adressé au destinataire, puis on exige qu'il ne se retrouve
 * **nulle part** dans ce que l'action rend. Le test ne connaît aucun nom de
 * champ — le remettre sous un autre nom ne le contournerait pas.
 */

type Ligne = Record<string, unknown>;

/** Applique la clause `where` pour de bon, filtres de relation compris. */
function correspond(ligne: Ligne | undefined, where: Ligne): boolean {
  if (!ligne) return false;
  return Object.entries(where).every(([clef, attendu]) => {
    if (attendu && typeof attendu === "object" && !(attendu instanceof Date)) {
      return correspond(ligne[clef] as Ligne, attendu as Ligne);
    }
    return ligne[clef] === attendu;
  });
}

function table(lignes: Ligne[]) {
  const chercher = async ({ where }: { where: Ligne }) =>
    lignes.find((l) => correspond(l, where)) ?? null;
  return {
    lignes,
    // `findUnique` ne reçoit qu'une clause unique : sur `{ id }` seul, il rend
    // la ligne quel que soit son établissement. C'est précisément ce que
    // faisait la page, et ce que ce faux modèle reproduit fidèlement.
    findUnique: vi.fn(chercher),
    findFirst: vi.fn(chercher),
    findMany: vi.fn(async () => lignes),
    create: vi.fn(async ({ data }: { data: Ligne }) => data),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

const RAPPORT_DU_VOISIN = {
  id: "rap-voisin",
  etablissementId: "etab-voisin",
  fichierCle: "cle/voisin.pdf",
  fichierNomOriginal: "rapport-electrique-du-voisin.pdf",
  dateRapport: new Date("2026-03-02T09:00:00Z"),
  verification: { libelleObligation: "Vérification annuelle des installations électriques" },
};

const RAPPORT_A_MOI = {
  id: "rap-a-moi",
  etablissementId: "etab-a-moi",
  fichierCle: "cle/a-moi.pdf",
  fichierNomOriginal: "mon-rapport.pdf",
  dateRapport: new Date("2026-03-03T09:00:00Z"),
  verification: { libelleObligation: "Ma vérification" },
};

const { prismaMock, mailsEnvoyes } = vi.hoisted(() => ({
  prismaMock: {} as Record<string, ReturnType<typeof table>>,
  mailsEnvoyes: [] as { to: string; subject: string; text: string }[],
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1", email: "moi@exemple.fr" })),
  getOptionalUser: vi.fn(),
}));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/lib/storage", () => ({ getStorage: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    const e = new Error("NEXT_NOT_FOUND");
    (e as { digest?: string }).digest = "NEXT_HTTP_ERROR_FALLBACK;404";
    throw e;
  },
}));
vi.mock("@/lib/email", () => ({
  sendMail: vi.fn(async (p: { to: string; subject: string; text: string }) => {
    mailsEnvoyes.push(p);
  }),
  mailFrom: () => "no-reply@test.local",
  publicAppUrl: () => "http://localhost:3000",
}));

import { emettreAccessToken } from "@/lib/access-tokens/actions";
import { demanderSignature } from "./actions";
import { objetAppartientAEtablissement } from "./appartenance";

function estNotFound(e: unknown): boolean {
  const digest = (e as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.includes("404");
}

function aucuneEcriture(): void {
  for (const modele of Object.values(prismaMock)) {
    expect(modele.create).not.toHaveBeenCalled();
    expect(modele.update).not.toHaveBeenCalled();
    expect(modele.delete).not.toHaveBeenCalled();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mailsEnvoyes.length = 0;
  prismaMock.rapportVerification = table([RAPPORT_DU_VOISIN, RAPPORT_A_MOI]);
  prismaMock.permisFeu = table([]);
  prismaMock.planPrevention = table([]);
  prismaMock.registreAccessibilite = table([]);
  prismaMock.duerpVersion = table([]);
  prismaMock.accessToken = table([]);
  prismaMock.etablissement = table([
    {
      id: "etab-a-moi",
      raisonDisplay: "Mon site",
      entreprise: { raisonSociale: "Mon entreprise" },
    },
  ]);
});

const EMISSION = {
  etablissementId: "etab-a-moi",
  scope: "signature" as const,
  objetType: "rapport_verification",
  emailDestinataire: "signataire@exemple-externe.fr",
  nomDestinataire: "Jean Dupond",
  sujetMail: "Signature à apporter",
  messageMail: "Merci de signer.",
};

describe("émission d'un accès — objet d'un autre client", () => {
  it("refuse un objetId hors de l'établissement, sans rien écrire ni envoyer", async () => {
    // L'appelant possède bien `etab-a-moi` : c'est `objetId` qui est ailleurs.
    await expect(
      emettreAccessToken({ ...EMISSION, objetId: RAPPORT_DU_VOISIN.id }),
    ).rejects.toSatisfy(estNotFound);

    aucuneEcriture();
    expect(mailsEnvoyes).toHaveLength(0);
  });

  it("refuse un objetType inconnu plutôt que de le laisser passer", async () => {
    // Refus par défaut : une valeur ajoutée à `ObjetSignable` sans être
    // inscrite dans `appartenance.ts` ne doit pas rouvrir la brèche.
    await expect(
      emettreAccessToken({
        ...EMISSION,
        objetType: "objet_pas_encore_connu",
        objetId: RAPPORT_A_MOI.id,
      }),
    ).rejects.toSatisfy(estNotFound);

    aucuneEcriture();
    expect(mailsEnvoyes).toHaveLength(0);
  });

  it("laisse passer l'objet qui est bien dans l'établissement", async () => {
    const r = await emettreAccessToken({
      ...EMISSION,
      objetId: RAPPORT_A_MOI.id,
    });

    expect(r.accessTokenId).toMatch(/^atk_/);
    expect(prismaMock.accessToken.create).toHaveBeenCalledTimes(1);
    expect(mailsEnvoyes).toHaveLength(1);
  });
});

describe("appartenance — refus par défaut", () => {
  it("refuse un type non inscrit, même si l'identifiant existe ailleurs", async () => {
    await expect(
      objetAppartientAEtablissement("type_inventé", RAPPORT_A_MOI.id, "etab-a-moi"),
    ).resolves.toBe(false);
  });

  it("refuse un identifiant vide", async () => {
    await expect(
      objetAppartientAEtablissement("rapport_verification", "", "etab-a-moi"),
    ).resolves.toBe(false);
  });
});

describe("demande de signature — les facteurs ne remontent pas au demandeur", () => {
  it("ne rend ni le code ni le lien, alors que le message les porte", async () => {
    const retour = await demanderSignature({
      etablissementId: "etab-a-moi",
      objetType: "rapport_verification",
      objetId: RAPPORT_A_MOI.id,
      signataireEmail: "signataire@exemple-externe.fr",
      signataireNom: "Jean Dupond",
      libelleDocument: "Rapport de vérification",
    });

    // Contrôle positif d'abord : sans lui, les assertions suivantes
    // passeraient tout aussi bien sur un message vide, et ne prouveraient
    // rien du tout.
    expect(mailsEnvoyes).toHaveLength(1);
    const texte = mailsEnvoyes[0].text;
    expect(mailsEnvoyes[0].to).toBe("signataire@exemple-externe.fr");

    const code = texte.match(/Code de confirmation : (\d{6})/)?.[1];
    const lien = texte.match(/\/acces\/([A-Za-z0-9_-]{30,})/)?.[1];
    expect(code, "le message doit porter le code au destinataire").toBeTruthy();
    expect(lien, "le message doit porter le lien au destinataire").toBeTruthy();

    // Et maintenant la garantie : ni l'un ni l'autre ne doit se trouver dans
    // ce que l'action rend, sous quelque nom de champ que ce soit.
    const rendu = JSON.stringify(retour);
    expect(rendu).not.toContain(code!);
    expect(rendu).not.toContain(lien!);
    expect(retour).toEqual({ ok: true });
  });
});
