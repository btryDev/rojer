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

/**
 * Applique la projection `select` comme la base le ferait : un champ non
 * demandé ne sort pas. C'est ce qui permet de vérifier que la page ne
 * montre rien de plus que ce qu'elle a choisi de lire — une table qui
 * rendrait la ligne entière masquerait un `select` trop large.
 */
function projeter(ligne: Ligne, select: Ligne | undefined): Ligne {
  if (!select) return ligne;
  const out: Ligne = {};
  for (const [clef, v] of Object.entries(select)) {
    if (v === true) out[clef] = ligne[clef];
    else if (v && typeof v === "object") {
      const sous = (v as { select?: Ligne }).select;
      const val = ligne[clef];
      out[clef] = Array.isArray(val)
        ? val.map((x) => projeter(x as Ligne, sous))
        : val && typeof val === "object"
          ? projeter(val as Ligne, sous)
          : val;
    }
  }
  return out;
}

function table(lignes: Ligne[]) {
  const chercher = async ({ where, select }: { where: Ligne; select?: Ligne }) => {
    const l = lignes.find((x) => correspond(x, where));
    return l ? projeter(l, select) : null;
  };
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

function jetonSignature(objetId: string, objetType = "rapport_verification") {
  return {
    ok: true,
    token: {
      id: "atk_1",
      scope: "signature",
      objetType,
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

// ── Plans et permis : un à moi, un chez le voisin, avec des marqueurs
// uniques pour pouvoir dire ce qui sort de la page et ce qui n'en sort pas.

function planDe(etablissementId: string, marque: string): Ligne {
  return {
    id: `pp-${marque}`,
    etablissementId,
    statut: "attente_signatures",
    numero: 7,
    entrepriseExterieureRaison: `EF-${marque}`,
    entrepriseExterieureSiret: "12345678900011",
    efChefNom: `Chef-EF-${marque}`,
    efChefEmail: `chef-ef-${marque}@exemple-externe.fr`,
    efEffectifIntervenant: 3,
    euChefNom: `Chef-EU-${marque}`,
    euChefFonction: "Gérant",
    dateDebut: new Date("2026-10-01T00:00:00Z"),
    dateFin: new Date("2026-10-20T00:00:00Z"),
    dureeHeuresEstimee: 420,
    lieux: `Lieux-${marque}`,
    naturesTravaux: `Nature-${marque}`,
    travauxDangereux: true,
    inspectionDate: new Date("2026-09-25T00:00:00Z"),
    inspectionParticipants: `Inspection-${marque}`,
    batimentId: `zone-secrete-${marque}`,
    prestataireId: `presta-${marque}`,
    lignes: [
      {
        id: "l1",
        ordre: 0,
        risque: `Risque-${marque}`,
        mesureEntrepriseUtilisatrice: `MesureEU-${marque}`,
        mesureEntrepriseExterieure: `MesureEE-${marque}`,
      },
    ],
    phasesDangereuses: [
      { id: "f1", ordre: 0, phase: `Phase-${marque}`, moyensPrevention: `Moyens-${marque}` },
    ],
    adaptationMateriels: `Adaptation-${marque}`,
    instructionsTravailleurs: `Instructions-${marque}`,
    organisationSecours: `Secours-${marque}`,
    participationCroisee: `Participation-${marque}`,
  };
}

function permisDe(etablissementId: string, marque: string): Ligne {
  return {
    id: `pf-${marque}`,
    etablissementId,
    statut: "attente_signatures",
    numero: 4,
    prestataireRaison: `Presta-${marque}`,
    prestataireContact: `Technicien-${marque}`,
    prestataireEmail: `technicien-${marque}@exemple-externe.fr`,
    donneurOrdreNom: `Donneur-${marque}`,
    donneurOrdreFonction: "Gérant",
    dateDebut: new Date("2026-10-01T00:00:00Z"),
    dateFin: new Date("2026-10-02T00:00:00Z"),
    lieu: `Lieu-${marque}`,
    naturesTravaux: ["soudage_arc"],
    descriptionTravaux: `Description-${marque}`,
    mesuresValidees: ["zone-degagee-5m"],
    mesuresNotes: `Notes-${marque}`,
    dureeSurveillanceMinutes: 120,
    batimentId: `zone-secrete-${marque}`,
  };
}

const PLAN_A_MOI = planDe("etab-a-moi", "moi");
const PLAN_VOISIN = planDe("etab-voisin", "voisin");
const PERMIS_A_MOI = permisDe("etab-a-moi", "moi");
const PERMIS_VOISIN = permisDe("etab-voisin", "voisin");

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
  prismaMock.planPrevention = table([PLAN_VOISIN, PLAN_A_MOI]);
  prismaMock.permisFeu = table([PERMIS_VOISIN, PERMIS_A_MOI]);
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

describe("garantie 3 — le signataire voit ce qu'il signe, et rien de plus", () => {
  it("un plan de prévention : les parties, la période, les lieux, la nature, l'interférence et les cinq rubriques de R. 4512-8", async () => {
    verifierMock.mockResolvedValue(jetonSignature("pp-moi", "plan_prevention"));

    const rendu = await rendreLaPage();

    for (const attendu of [
      "Plan de prévention PP-007",
      "Mon entreprise", // l'entreprise utilisatrice
      "Chef-EU-moi",
      "EF-moi", // l'entreprise extérieure
      "Chef-EF-moi",
      "01/10/2026", // la période
      "20/10/2026",
      "Lieux-moi",
      "Nature-moi",
      "Risque-moi",
      "MesureEU-moi",
      "MesureEE-moi",
      // Les cinq rubriques de R. 4512-8, titres ET contenu.
      "Phase-moi",
      "Moyens-moi",
      "Adaptation-moi",
      "Instructions-moi",
      "Secours-moi",
      "Participation-moi",
      "Phases d'activité dangereuses",
      "Participation croisée et organisation du commandement",
    ]) {
      expect(rendu, attendu).toContain(attendu);
    }
  });

  it("un plan : ni l'adresse d'un tiers, ni la zone, ni la fiche prestataire, ni le statut", async () => {
    verifierMock.mockResolvedValue(jetonSignature("pp-moi", "plan_prevention"));

    const rendu = await rendreLaPage();

    expect(rendu).not.toContain("chef-ef-moi@exemple-externe.fr");
    expect(rendu).not.toContain("zone-secrete-moi");
    expect(rendu).not.toContain("presta-moi");
    expect(rendu).not.toContain("attente_signatures");
  });

  it("un permis de feu : l'intervenant, le donneur d'ordre, la période, le lieu, les travaux et les mesures", async () => {
    verifierMock.mockResolvedValue(jetonSignature("pf-moi", "permis_feu"));

    const rendu = await rendreLaPage();

    for (const attendu of [
      "Permis de feu PF-004",
      "Presta-moi",
      "Technicien-moi",
      "Donneur-moi",
      "Lieu-moi",
      "Soudage à l'arc",
      "Description-moi",
      "Éloigner ou protéger les matériaux inflammables dans un rayon de 5 m",
      "Notes-moi",
    ]) {
      expect(rendu, attendu).toContain(attendu);
    }
    expect(rendu).not.toContain("technicien-moi@exemple-externe.fr");
    expect(rendu).not.toContain("zone-secrete-moi");
  });

  it("traversée : un jeton qui désigne le plan d'un autre client n'en laisse rien lire", async () => {
    verifierMock.mockResolvedValue(jetonSignature("pp-voisin", "plan_prevention"));

    const rendu = await rendreLaPage();

    expect(rendu).not.toMatch(/voisin/);
    // Hors du périmètre du jeton, le plan est aussi « non signable » : la page
    // le dit sans rien en montrer.
    expect(rendu).toContain("plus à signer");
  });

  it("traversée : un jeton qui désigne le permis d'un autre client n'en laisse rien lire", async () => {
    verifierMock.mockResolvedValue(jetonSignature("pf-voisin", "permis_feu"));

    const rendu = await rendreLaPage();

    expect(rendu).not.toMatch(/voisin/);
  });

  it("traversée : sous un identifiant homonyme, c'est le plan de l'établissement du jeton qui s'affiche", async () => {
    // Les deux premiers tests de traversée s'arrêtent à la garde d'état : un
    // objet hors périmètre y vaut « non signable ». Celui-ci la franchit —
    // MON plan existe et est signable — et place en tête de table le plan du
    // voisin sous le même identifiant : une lecture du contenu non bornée à
    // l'établissement du jeton l'afficherait.
    prismaMock.planPrevention = table([
      { ...PLAN_VOISIN, id: "pp-commun" },
      { ...PLAN_A_MOI, id: "pp-commun" },
    ]);
    prismaMock.permisFeu = table([
      { ...PERMIS_VOISIN, id: "pf-commun" },
      { ...PERMIS_A_MOI, id: "pf-commun" },
    ]);

    verifierMock.mockResolvedValue(jetonSignature("pp-commun", "plan_prevention"));
    const renduPlan = await rendreLaPage();
    expect(renduPlan).toContain("Risque-moi");
    expect(renduPlan).not.toMatch(/voisin/);

    verifierMock.mockResolvedValue(jetonSignature("pf-commun", "permis_feu"));
    const renduPermis = await rendreLaPage();
    expect(renduPermis).toContain("Description-moi");
    expect(renduPermis).not.toMatch(/voisin/);
  });
});
