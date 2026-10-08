// Le délai de grâce des lignes nées d'un changement du référentiel — ADR-040.
//
// Deux moitiés, éprouvées séparément puis ensemble :
//  · la NAISSANCE — quelle passe écrit `graceJusquAu`, et quelle date
//    (`graceANaissance`, puis `genererCalendrier` sur le faux client) ;
//  · la LECTURE — ce que les prédicats de retard en font, jour par jour
//    (`delaiDeGrace`, `estVerificationEnRetard`, `estVerificationAPlanifier`,
//    `classerVerification`).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ajouterJours, debutDuJour, instantCivil } from "@/lib/dates";
import {
  delaiDeGrace,
  estVerificationAPlanifier,
  estVerificationEnRetard,
  type VerificationDatee,
} from "@/lib/dates/retard";
import { classerVerification } from "./etats";
import { DELAI_DE_GRACE_MOIS, graceANaissance, mentionDelaiDeGrace } from "./grace";
import { SCEAU_CALENDRIER } from "./version-moteur";
import type { EquipementFaux } from "./faux-prisma";

const h = vi.hoisted(async () => {
  const { fauxPrisma, magasinVide } = await import("./faux-prisma");
  const db = magasinVide();
  return { db, prisma: fauxPrisma(db) };
});

vi.mock("@/lib/prisma", async () => ({ prisma: (await h).prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1", email: null })),
  getOptionalUser: vi.fn(async () => ({ id: "user-1", email: null })),
}));

const { db } = await h;
const { genererCalendrier } = await import("./actions");

const ETAB_ID = "etab-1";
/** Portée par un équipement électrique, annuelle : sans mise en service, elle
 *  naît « à planifier » à l'origine du suivi (ADR-036, règle 5). */
const ELEC_ANNUELLE = "elec-travail-periodique-annuelle";

/** L'origine choisie pour la table J+n : un 15 janvier, pour que J+92 tombe
 *  APRÈS le dernier jour de grâce (15 avril = J+90). Trois mois civils ne font
 *  pas toujours 92 jours : du 8 octobre au 8 janvier, si — voir le second cas. */
const ORIGINE = instantCivil(2027, 1, 15, 9, 0, 0, 0);
const jour = (n: number) => ajouterJours(ORIGINE, n);

function ligne(partiel: Partial<VerificationDatee> = {}): VerificationDatee {
  return {
    statut: "a_planifier",
    datePrevue: debutDuJour(ORIGINE),
    periodicite: "annuelle",
    archiveLe: null,
    graceJusquAu: graceANaissance("ancien-sceau", SCEAU_CALENDRIER, ORIGINE),
    libelleObligation: "Vérification périodique",
    ...partiel,
  };
}

describe("graceANaissance — la cause de la passe décide", () => {
  it("dossier neuf ou marqué périmé (repère vide) : aucune grâce", () => {
    expect(graceANaissance(null, SCEAU_CALENDRIER, ORIGINE)).toBeNull();
    // Absent (`select` oublié, fixture) : lu comme vide, du côté visible.
    expect(graceANaissance(undefined, SCEAU_CALENDRIER, ORIGINE)).toBeNull();
  });

  it("calendrier à jour (mutation du dirigeant) : aucune grâce", () => {
    expect(graceANaissance(SCEAU_CALENDRIER, SCEAU_CALENDRIER, ORIGINE)).toBeNull();
  });

  it("sceau changé (référentiel ou moteur) : origine + 3 mois civils, au jour", () => {
    expect(DELAI_DE_GRACE_MOIS).toBe(3);
    expect(graceANaissance("ancien-sceau", SCEAU_CALENDRIER, ORIGINE)).toEqual(
      instantCivil(2027, 4, 15, 0, 0, 0, 0),
    );
  });
});

describe("delaiDeGrace et les prédicats de retard — la table J+n", () => {
  const cas: [number, boolean][] = [
    [0, false],
    [1, false], // le défaut relevé : sans grâce, rouge dès J+1
    [89, false],
    [90, false], // 15 avril, dernier jour : une échéance du jour n'est jamais en retard
    [91, true],
    [92, true],
  ];
  for (const [n, retard] of cas) {
    it(`J+${n} : ${retard ? "en retard" : "à planifier, en grâce"}`, () => {
      const v = ligne();
      expect(estVerificationEnRetard(v, jour(n))).toBe(retard);
      // Disjoints, toujours.
      expect(estVerificationAPlanifier(v, jour(n))).toBe(!retard);
      expect(classerVerification(v, jour(n))).toBe(retard ? "enRetard" : "aPlanifier");
      expect(delaiDeGrace(v, jour(n))).toEqual(
        retard ? null : instantCivil(2027, 4, 15, 0, 0, 0, 0),
      );
      // L'échéance ne bouge pas : la grâce ne date rien.
      expect(v.datePrevue).toEqual(debutDuJour(ORIGINE));
    });
  }

  it("la mention dit le dernier jour, au format civil", () => {
    expect(mentionDelaiDeGrace(ligne(), jour(1))).toBe("délai jusqu'au 15/04/2027");
    expect(mentionDelaiDeGrace(ligne(), jour(1), { enTete: true })).toBe(
      "Délai jusqu'au 15/04/2027",
    );
    expect(mentionDelaiDeGrace(ligne(), jour(91))).toBeNull();
  });

  it("origine au lendemain du déploiement (09/10/2026) : J+92 est le dernier jour", () => {
    const origine = instantCivil(2026, 10, 9, 9, 0, 0, 0);
    const v = ligne({
      datePrevue: debutDuJour(origine),
      graceJusquAu: graceANaissance("ancien-sceau", SCEAU_CALENDRIER, origine),
    });
    expect(estVerificationEnRetard(v, ajouterJours(origine, 92))).toBe(false);
    expect(estVerificationEnRetard(v, ajouterJours(origine, 93))).toBe(true);
  });

  it("sans grâce (création d'établissement, mutation) : en retard dès J+1", () => {
    const v = ligne({ graceJusquAu: null });
    expect(estVerificationEnRetard(v, jour(0))).toBe(false);
    expect(estVerificationEnRetard(v, jour(1))).toBe(true);
    expect(delaiDeGrace(v, jour(0))).toBeNull();
    expect(mentionDelaiDeGrace(v, jour(0))).toBeNull();
  });

  it("un rapport déposé fait quitter « à planifier » : la grâce ne couvre plus rien", () => {
    // La ligne roule sur rapport + rythme (ADR-036, règle 3), « planifiée ».
    const roulee = ligne({ statut: "planifiee", datePrevue: jour(30) });
    expect(delaiDeGrace(roulee, jour(10))).toBeNull();
    expect(estVerificationEnRetard(roulee, jour(10))).toBe(false);
    // Et cette échéance connue, une fois passée, est en retard — grâce ou non.
    expect(estVerificationEnRetard(roulee, jour(31))).toBe(true);
  });

  it("ni une ligne archivée, ni une ponctuelle soldée ne sont « en grâce »", () => {
    expect(delaiDeGrace(ligne({ archiveLe: jour(1) }), jour(2))).toBeNull();
    expect(
      delaiDeGrace(
        ligne({ statut: "realisee_conforme", periodicite: "mise_en_service_uniquement" }),
        jour(2),
      ),
    ).toBeNull();
  });
});

describe("genererCalendrier — qui naît avec une grâce", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(ORIGINE);
    db.etablissements.length = 0;
    db.verifications.length = 0;
    db.salaries.length = 0;
    db.titres.length = 0;
  });
  afterEach(() => vi.useRealTimers());

  function poser(repere: string | null, equipements: Partial<EquipementFaux>[]) {
    db.etablissements.push({
      id: ETAB_ID,
      userId: "user-1",
      effectifSurSite: 5,
      effectifEntreprise: 5,
      estEtablissementTravail: true,
      estERP: false,
      estIGH: false,
      estHabitation: false,
      typeErp: null,
      categorieErp: null,
      classeIgh: null,
      familleHabitation: null,
      personnesPresentesHabituellement: null,
      manipuleMatieresR422722: null,
      comporteLocauxSommeilPublic: null,
      chiffonsImpregnes: null,
      referentielVersionCalendrier: repere,
      prescriptionsParticulieres: [],
      equipements: equipements.map((e) => ({
        libelle: `Équipement ${e.id}`,
        categorie: "INSTALLATION_ELECTRIQUE",
        caracteristiques: null,
        actif: true,
        dateMiseEnService: null,
        ...e,
      })) as EquipementFaux[],
    });
  }
  const elec = () =>
    db.verifications.find((v) => v.obligationId === ELEC_ANNUELLE && v.equipementId === "eq-1");

  it("création d'établissement (repère vide) : aucune grâce", async () => {
    poser(null, [{ id: "eq-1" }]);
    await genererCalendrier(ETAB_ID);
    expect(elec()?.statut).toBe("a_planifier");
    expect(elec()?.graceJusquAu).toBeNull();
  });

  it("déclaration d'équipement sur un calendrier à jour : aucune grâce", async () => {
    poser(SCEAU_CALENDRIER, [{ id: "eq-1" }]);
    await genererCalendrier(ETAB_ID);
    expect(elec()?.graceJusquAu).toBeNull();
  });

  it("reprise après un changement du référentiel : la ligne neuve naît en grâce", async () => {
    poser("2026-09-26.13+abcdef+moteur.6", [{ id: "eq-1" }]);
    await genererCalendrier(ETAB_ID);
    const v = elec()!;
    expect(v.statut).toBe("a_planifier");
    expect(v.suiviDepuis).toEqual(ORIGINE);
    expect(v.graceJusquAu).toEqual(instantCivil(2027, 4, 15, 0, 0, 0, 0));
    expect(db.etablissements[0].referentielVersionCalendrier).toBe(SCEAU_CALENDRIER);
    const lue = { ...v, archiveLe: v.archiveLe ?? null, graceJusquAu: v.graceJusquAu ?? null };
    expect(estVerificationEnRetard(lue, jour(1))).toBe(false);
    expect(estVerificationEnRetard(lue, jour(91))).toBe(true);

    // La passe suivante (calendrier désormais à jour) n'y touche pas : aucun
    // `update` n'écrit la grâce, ni ne l'efface.
    vi.setSystemTime(jour(5));
    await genererCalendrier(ETAB_ID);
    expect(elec()!.graceJusquAu).toEqual(instantCivil(2027, 4, 15, 0, 0, 0, 0));
  });

  it("une ligne déjà en base n'en reçoit pas, même dans une passe de reprise", async () => {
    poser(null, [{ id: "eq-1" }]);
    await genererCalendrier(ETAB_ID);
    db.etablissements[0].referentielVersionCalendrier = "ancien-sceau";
    vi.setSystemTime(jour(40));
    await genererCalendrier(ETAB_ID);
    expect(elec()!.graceJusquAu).toBeNull();
  });
});
