// La borne de compte ne remplace pas l'établissement (ADR-051, chemin par
// jeton ; seconde lecture de #143). Un jeton vaut pour UN établissement ; le
// client borné, lui, couvre tout le compte. Chaque lecture et écriture des
// signatures doit donc garder son `etablissementId` : ici, chaque fonction
// est appelée pour E1 avec un HOMONYME (même identifiant) dans E2, du MÊME
// compte. Le client est le client borné simulé (`vitest.setup.ts`), qui ne
// filtre pas par établissement : seul le `where` de la fonction le fait.
//
// Chaque test tombe quand on retire SA protection (relevé dans la PR #143).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { correspond, type Ligne } from "@/test/prisma-where";
import { clientDuCompteSimule } from "@/test/garde-simulee";

function table() {
  const lignes: Ligne[] = [];
  return {
    lignes,
    findFirst: vi.fn(async ({ where }: { where: Ligne }) => lignes.find((l) => correspond(l, where)) ?? null),
    findMany: vi.fn(async ({ where }: { where: Ligne }) => lignes.filter((l) => correspond(l, where))),
    updateMany: vi.fn(async ({ where, data }: { where: Ligne; data: Ligne }) => {
      const t = lignes.filter((l) => correspond(l, where));
      t.forEach((l) => Object.assign(l, data));
      return { count: t.length };
    }),
  };
}

const { base } = vi.hoisted(() => ({ base: {} as Record<string, ReturnType<typeof table>> }));
vi.mock("@/lib/prisma", () => ({ prisma: base }));
vi.mock("@/lib/storage", () => ({
  getStorage: () => ({ get: async (cle: string) => Buffer.from(`contenu de ${cle}`) }),
  StockageNonConfigure: class extends Error {},
}));

const { calculerHashObjet } = await import("./hash-objet");
const { validerSiCoSigne } = await import("./statut-objet");
const { objetAppartientAEtablissement } = await import("./appartenance");
const { libelleDocumentSignable } = await import("./libelle-document");
const { listSignatures } = await import("./queries");
const { objetEstSignable } = await import("./etat-signable");

const E1 = "etab-1";
const E2 = "etab-2-meme-compte";
const ID = "homonyme";

const rapport = (etablissementId: string) => ({
  id: ID,
  etablissementId,
  fichierCle: `rapports/${etablissementId}.pdf`,
  fichierNomOriginal: `${etablissementId}.pdf`,
  dateRapport: new Date("2026-10-01"),
  verification: { libelleObligation: `Vérification de ${etablissementId}` },
});
const plan = (etablissementId: string, statut = "attente_signatures") => ({
  id: ID,
  etablissementId,
  statut,
  numero: etablissementId === E1 ? 1 : 2,
  entrepriseExterieureRaison: `EF de ${etablissementId}`,
  lignes: [],
  phasesDangereuses: [],
});
const permis = (etablissementId: string, statut = "attente_signatures") => ({
  id: ID,
  etablissementId,
  statut,
  numero: etablissementId === E1 ? 1 : 2,
  prestataireRaison: `Prestataire de ${etablissementId}`,
});
const signature = (objetType: string, etablissementId: string, partie: string) => ({
  id: `sig_${objetType}_${etablissementId}_${partie}`,
  objetType,
  objetId: ID,
  etablissementId,
  partie,
});

let db: Awaited<ReturnType<typeof clientDuCompteSimule>>;

beforeEach(async () => {
  for (const m of ["rapportVerification", "planPrevention", "permisFeu", "signature"]) base[m] = table();
  db = await clientDuCompteSimule("user-1");
});

describe("empreinte (calculerHashObjet) : seule barrière par établissement pour un rapport", () => {
  it.each([
    ["rapport_verification", "rapportVerification", rapport],
    ["plan_prevention", "planPrevention", plan],
    ["permis_feu", "permisFeu", permis],
  ] as const)("%s : l'homonyme de E2 est introuvable depuis E1", async (type, modele, ligne) => {
    base[modele].lignes.push(ligne(E2));
    expect(await calculerHashObjet(db, type, ID, E1)).toEqual({ ok: false, raison: "objet_introuvable" });
    // Contrôle positif : celui de E1 se hache.
    base[modele].lignes.push(ligne(E1));
    expect((await calculerHashObjet(db, type, ID, E1)).ok).toBe(true);
  });
});

describe("statut (validerSiCoSigne)", () => {
  it.each([
    ["plan_prevention", "planPrevention", plan],
    ["permis_feu", "permisFeu", permis],
  ] as const)("%s : les signatures de E2 ne valident pas l'acte de E1", async (type, modele, ligne) => {
    base[modele].lignes.push(ligne(E1));
    base.signature.lignes.push(
      signature(type, E2, "entreprise_utilisatrice"),
      signature(type, E2, "entreprise_exterieure"),
    );
    await validerSiCoSigne(db, type, ID, E1);
    expect(base[modele].lignes[0].statut).toBe("attente_signatures");
  });

  it.each([
    ["plan_prevention", "planPrevention", plan],
    ["permis_feu", "permisFeu", permis],
  ] as const)("%s : valider l'acte de E1 ne touche pas l'homonyme de E2", async (type, modele, ligne) => {
    base[modele].lignes.push(ligne(E2), ligne(E1));
    base.signature.lignes.push(
      signature(type, E1, "entreprise_utilisatrice"),
      signature(type, E1, "entreprise_exterieure"),
    );
    await validerSiCoSigne(db, type, ID, E1);
    expect(base[modele].lignes.map((l) => [l.etablissementId, l.statut])).toEqual([
      [E2, "attente_signatures"],
      [E1, "valide"],
    ]);
  });
});

describe("appartenance (objetAppartientAEtablissement)", () => {
  it.each([
    ["rapport_verification", "rapportVerification", rapport],
    ["plan_prevention", "planPrevention", plan],
    ["permis_feu", "permisFeu", permis],
  ] as const)("%s : un objet de E2 n'appartient pas à E1", async (type, modele, ligne) => {
    base[modele].lignes.push(ligne(E2));
    expect(await objetAppartientAEtablissement(db, type, ID, E1)).toBe(false);
    base[modele].lignes.push(ligne(E1));
    expect(await objetAppartientAEtablissement(db, type, ID, E1)).toBe(true);
  });
});

describe("libellé du document (libelleDocumentSignable)", () => {
  it.each([
    ["rapport_verification", "rapportVerification", rapport],
    ["plan_prevention", "planPrevention", plan],
    ["permis_feu", "permisFeu", permis],
  ] as const)("%s : le libellé est celui de l'objet de E1, jamais de l'homonyme", async (type, modele, ligne) => {
    base[modele].lignes.push(ligne(E2));
    expect(await libelleDocumentSignable(db, type, ID, E1)).toBeNull();
    base[modele].lignes.push(ligne(E1));
    expect(await libelleDocumentSignable(db, type, ID, E1)).not.toMatch(new RegExp(E2));
  });
});

describe("signatures d'un objet (listSignatures)", () => {
  it("ne rend que les signatures de l'établissement", async () => {
    base.signature.lignes.push(
      signature("plan_prevention", E2, "entreprise_utilisatrice"),
      signature("plan_prevention", E1, "entreprise_exterieure"),
    );
    const lues = await listSignatures(db, E1, "plan_prevention", ID);
    expect(lues.map((s) => s.etablissementId)).toEqual([E1]);
  });
});

describe("état signable (objetEstSignable)", () => {
  it.each([
    ["plan_prevention", "planPrevention", plan],
    ["permis_feu", "permisFeu", permis],
  ] as const)("%s : l'état lu est celui de E1, pas d'un homonyme ouvert dans E2", async (type, modele, ligne) => {
    base[modele].lignes.push(ligne(E2), ligne(E1, "annule"));
    expect(await objetEstSignable(db, type, ID, E1)).toBe(false);
    // Contrôle positif : l'objet de E1 ouvert se signe.
    base[modele].lignes[1].statut = "attente_signatures";
    expect(await objetEstSignable(db, type, ID, E1)).toBe(true);
  });
});
