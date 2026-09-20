import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ce que ce fichier défend, et pourquoi il ne suffit pas de tester « à jour ou
 * pas ».
 *
 * Le défaut d'origine est un AMALGAME : un dossier sans aucune ligne rendait
 * une liste vide, et l'écran de contrôle en tirait « À jour ». Un booléen
 * aurait reproduit l'amalgame — il aurait fallu ranger « jamais généré » avec
 * « à jour » ou avec « périmé », et les deux sont faux. Les tests ci-dessous
 * séparent donc les quatre cas un par un, et vérifient surtout la SÉPARATION :
 * que le vide ne se confonde ni avec le sain, ni avec l'échec.
 *
 * On teste ce que le module lit et rend, pas la base : prisma est mocké.
 */

const { prismaMock, requireUserMock } = vi.hoisted(() => ({
  prismaMock: {
    etablissement: { findFirst: vi.fn() },
    verification: { count: vi.fn() },
  },
  requireUserMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: requireUserMock,
  getOptionalUser: vi.fn(),
}));

import {
  calendrierIncertain,
  fraicheurCalendrier,
  fraicheurDepuisRepere,
  phraseFraicheur,
  type FraicheurCalendrier,
} from "./fraicheur";
import { SCEAU_CALENDRIER } from "./version-moteur";

const ETAB = "etab-1";

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({ id: "user-1" });
  prismaMock.verification.count.mockResolvedValue(0);
});

describe("fraicheurCalendrier — les quatre cas se distinguent", () => {
  it("rend `a_jour` quand le repère vaut le sceau courant", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue({
      referentielVersionCalendrier: SCEAU_CALENDRIER,
    });
    await expect(fraicheurCalendrier(ETAB)).resolves.toEqual({ etat: "a_jour" });
    // Le cas sain ne paie pas le comptage.
    expect(prismaMock.verification.count).not.toHaveBeenCalled();
  });

  it("rend `perime` quand le repère diffère, et dit LES DEUX sceaux", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue({
      referentielVersionCalendrier: "2026-01-01.1+abcdef+moteur.2",
    });
    const f = await fraicheurCalendrier(ETAB);
    expect(f).toEqual({
      etat: "perime",
      sceauPose: "2026-01-01.1+abcdef+moteur.2",
      sceauAttendu: SCEAU_CALENDRIER,
    });
  });

  it("SANS REPÈRE ET SANS LIGNE, c'est `jamais_genere` — pas `a_jour`", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue({
      referentielVersionCalendrier: null,
    });
    prismaMock.verification.count.mockResolvedValue(0);
    await expect(fraicheurCalendrier(ETAB)).resolves.toEqual({
      etat: "jamais_genere",
    });
  });

  it("SANS REPÈRE MAIS AVEC DES LIGNES, c'est un échec de régénération", async () => {
    // `marquerCalendrierPerime` efface le repère sans toucher aux lignes :
    // c'est la seule façon de distinguer ce cas d'un dossier neuf, et c'est
    // pour ça que le comptage existe.
    prismaMock.etablissement.findFirst.mockResolvedValue({
      referentielVersionCalendrier: null,
    });
    prismaMock.verification.count.mockResolvedValue(7);
    await expect(fraicheurCalendrier(ETAB)).resolves.toEqual({
      etat: "echec_regeneration",
    });
  });

  it("un dossier qui n'est pas à l'utilisateur ne rend jamais `a_jour`", async () => {
    // Le filtre de tenancy est dans le `where` ; un dossier d'autrui sort
    // `null`, et la réponse la moins affirmative est la bonne.
    prismaMock.etablissement.findFirst.mockResolvedValue(null);
    await expect(fraicheurCalendrier(ETAB)).resolves.toEqual({
      etat: "jamais_genere",
    });
  });

  it("lit sous la garde de session et filtre sur le propriétaire", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue({
      referentielVersionCalendrier: SCEAU_CALENDRIER,
    });
    await fraicheurCalendrier(ETAB);
    expect(requireUserMock).toHaveBeenCalled();
    expect(prismaMock.etablissement.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ETAB, entreprise: { userId: "user-1" } },
      }),
    );
  });

  it("N'ÉCRIT RIEN — c'est un lecteur, appelable depuis un PDF ou le MCP", async () => {
    prismaMock.etablissement.findFirst.mockResolvedValue({
      referentielVersionCalendrier: null,
    });
    await fraicheurCalendrier(ETAB);
    // Le mock n'expose aucune méthode d'écriture : toute tentative lèverait.
    // La garde utile est donc celle-ci, sur la forme du mock lui-même.
    expect(Object.keys(prismaMock.etablissement)).toEqual(["findFirst"]);
    expect(Object.keys(prismaMock.verification)).toEqual(["count"]);
  });
});

describe("fraicheurDepuisRepere — la décision, sans base ni session", () => {
  it("un repère ABSENT ne se lit pas « périmé »", async () => {
    // Le défaut a été trouvé en branchant le serveur MCP : un `select` partiel
    // rendait `undefined`, l'égalité stricte l'envoyait dans la branche finale,
    // et chaque réponse sortait préfixée d'un avertissement de péremption —
    // avec un `sceauPose` valant `undefined`. Vingt-et-un tests restaient verts,
    // leurs assertions étant des `toContain`.
    await expect(
      fraicheurDepuisRepere(undefined, async () => 0),
    ).resolves.toEqual({ etat: "jamais_genere" });
    await expect(
      fraicheurDepuisRepere(undefined, async () => 3),
    ).resolves.toEqual({ etat: "echec_regeneration" });
  });

  it("ne compte les lignes QUE si le repère est absent", async () => {
    let appels = 0;
    const compter = async () => {
      appels += 1;
      return 0;
    };
    await fraicheurDepuisRepere(SCEAU_CALENDRIER, compter);
    await fraicheurDepuisRepere("un-vieux-sceau", compter);
    expect(appels).toBe(0);
    await fraicheurDepuisRepere(null, compter);
    expect(appels).toBe(1);
  });
});

describe("ce que les sorties en font", () => {
  const CAS: FraicheurCalendrier[] = [
    { etat: "jamais_genere" },
    { etat: "echec_regeneration" },
    { etat: "perime", sceauPose: "a", sceauAttendu: "b" },
  ];

  it("les trois états non sains sont incertains, le quatrième ne l'est pas", () => {
    for (const f of CAS) expect(calendrierIncertain(f)).toBe(true);
    expect(calendrierIncertain({ etat: "a_jour" })).toBe(false);
  });

  it("chaque état non sain porte sa phrase, et `a_jour` n'en porte aucune", () => {
    for (const f of CAS) {
      const p = phraseFraicheur(f);
      expect(p, f.etat).not.toBeNull();
      expect(p!.length, f.etat).toBeGreaterThan(40);
    }
    expect(phraseFraicheur({ etat: "a_jour" })).toBeNull();
  });

  it("les trois phrases sont DISTINCTES — sinon l'union ne sert à rien", () => {
    const phrases = CAS.map((f) => phraseFraicheur(f));
    expect(new Set(phrases).size).toBe(3);
  });

  it("aucune phrase ne qualifie en droit (ADR-025)", () => {
    // Le produit calcule, il n'avise pas. « Non conforme », « en infraction »,
    // « obligatoire » n'ont rien à faire dans un avertissement de fraîcheur :
    // un calendrier périmé n'est pas un manquement, c'est un calcul en retard.
    const interdits =
      /non[- ]conform|en infraction|opposable|vous êtes tenu|obligatoire/i;
    for (const f of CAS) expect(phraseFraicheur(f)).not.toMatch(interdits);
  });

  it("chaque phrase nomme le geste qui la lève", () => {
    // Un avertissement sans issue ne fait qu'inquiéter. Les deux pages
    // d'entrée sont les seules qui régénèrent (`regeneration-sure.ts`), donc
    // ce sont elles qu'on nomme.
    for (const f of CAS) {
      expect(phraseFraicheur(f), f.etat).toMatch(
        /tableau de bord|calendrier pour/i,
      );
    }
  });

  it("« jamais généré » dit que le vide n'est pas une absence d'échéance", () => {
    // C'est LE défaut d'origine, dit en toutes lettres à l'utilisateur.
    expect(phraseFraicheur({ etat: "jamais_genere" })).toMatch(
      /ne veut pas dire qu'il n'y en a pas/i,
    );
  });
});
