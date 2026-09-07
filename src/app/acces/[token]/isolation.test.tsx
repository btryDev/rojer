import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ce que la page d'accès donne à lire au porteur d'un lien.
 *
 * Elle affichait le libellé de l'objet visé par le jeton en l'interrogeant
 * **par son seul identifiant**. Comme l'émission ne vérifiait pas non plus que
 * `objetId` appartenait à l'établissement, un utilisateur authentifié faisait
 * émettre vers sa propre adresse un jeton désignant le rapport d'un autre
 * client, ouvrait le lien, et lisait le nom du fichier, sa date et
 * l'obligation concernée.
 *
 * L'émission est refermée (`lib/signatures/appartenance.ts`), mais un jeton
 * émis avant l'est toujours en base jusqu'à son expiration — jusqu'à 72 h pour
 * une signature. C'est donc ici que se joue ce qu'il donne à lire, et cette
 * seconde barrière n'est pas une redondance.
 *
 * Le test **tente la traversée** : la table en mémoire applique réellement la
 * clause reçue, si bien qu'une interrogation par identifiant seul rend la
 * ligne du voisin, comme la base le ferait.
 */

type Ligne = Record<string, unknown>;

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
  return { findUnique: vi.fn(chercher), findFirst: vi.fn(chercher) };
}

const NOM_FICHIER_VOISIN = "rapport-electrique-du-voisin.pdf";
const OBLIGATION_VOISIN = "Vérification annuelle des installations électriques";

const { prismaMock, verifierMock } = vi.hoisted(() => ({
  prismaMock: {} as Record<string, ReturnType<typeof table>>,
  verifierMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/access-tokens/verify", () => ({
  verifierAccessToken: verifierMock,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    const e = new Error("NEXT_NOT_FOUND");
    (e as { digest?: string }).digest = "NEXT_HTTP_ERROR_FALLBACK;404";
    throw e;
  },
}));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("@/components/ui-kit", () => ({ WhyCard: "div", LegalBadge: "div" }));
vi.mock("@/components/signatures/SignatureExterneForm", () => ({
  SignatureExterneForm: "form",
}));

import AccesParTokenPage from "./page";

function jetonSignature(objetId: string) {
  return {
    ok: true,
    token: {
      id: "atk_1",
      scope: "signature",
      objetType: "rapport_verification",
      objetId,
      etablissementId: "etab-a-moi",
      emailDestinataire: "signataire@exemple-externe.fr",
      nomDestinataire: "Jean Dupond",
      expireLe: new Date("2026-09-10T12:00:00Z"),
    },
  };
}

async function rendreLaPage() {
  const arbre = await AccesParTokenPage({
    params: Promise.resolve({ token: "un-jeton-clair-de-longueur-suffisante" }),
  } as never);
  return JSON.stringify(arbre);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.rapportVerification = table([
    {
      id: "rap-voisin",
      etablissementId: "etab-voisin",
      fichierNomOriginal: NOM_FICHIER_VOISIN,
      dateRapport: new Date("2026-03-02T09:00:00Z"),
      verification: { libelleObligation: OBLIGATION_VOISIN },
    },
    {
      id: "rap-a-moi",
      etablissementId: "etab-a-moi",
      fichierNomOriginal: "mon-rapport.pdf",
      dateRapport: new Date("2026-03-03T09:00:00Z"),
      verification: { libelleObligation: "Ma vérification à moi" },
    },
  ]);
  prismaMock.etablissement = table([
    {
      id: "etab-a-moi",
      raisonDisplay: "Mon site",
      entreprise: { raisonSociale: "Mon entreprise" },
    },
  ]);
});

describe("page d'accès — objet situé hors du périmètre du jeton", () => {
  it("ne laisse rien lire du rapport d'un autre établissement", async () => {
    verifierMock.mockResolvedValue(jetonSignature("rap-voisin"));

    const rendu = await rendreLaPage();

    expect(rendu).not.toContain(NOM_FICHIER_VOISIN);
    expect(rendu).not.toContain(OBLIGATION_VOISIN);
    // La page se rend quand même : le jeton est valide, c'est l'objet qui est
    // traité comme inexistant.
    expect(rendu).toContain("Document à signer");
  });

  it("affiche bien le rapport quand il est dans le périmètre du jeton", async () => {
    // Contrôle positif : sans lui, l'assertion précédente tiendrait aussi
    // d'une page qui n'affiche jamais rien.
    verifierMock.mockResolvedValue(jetonSignature("rap-a-moi"));

    const rendu = await rendreLaPage();

    expect(rendu).toContain("Ma vérification à moi");
    expect(rendu).toContain("mon-rapport.pdf");
  });
});
