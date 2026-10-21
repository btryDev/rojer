// @vitest-environment jsdom
//
// Le widget « Ce qui doit être en place » RÉSUME l'écran du même nom : le
// compte de l'en-tête de page, puis chaque famille présente avec son « x sur
// n » et un lien vers sa section (2026-10-17, contrôle visuel de c6 — il
// listait trente-quatre lignes sur 3 811 px, sans un compte).
//
// COMMENT. Un même dossier nourrit les deux : l'écran RÉEL
// (`etats-permanents/page.tsx`, rendu avec ses lectures remplacées par ce
// dossier) et le widget (par `resumeDuWidget`, ce que l'action appelle). On
// relève le compte, les familles et les ancres des deux rendus et on les
// compare. Trois dossiers : un fabriqué ici, qui porte une part « d'après les
// titres », et deux passés par la VRAIE lecture (`listerEtatsPermanents`) — un
// bureau et un restaurant de 5ᵉ catégorie.
//
// ~~« liste les lignes de l'écran, les mêmes et dans le même ordre »~~
// (2026-10-17) : la comparaison ligne à ligne est remplacée par l'égalité des
// comptes, le widget n'ayant plus de ligne.
//
// CE QUE LE TEST NE PROUVE PAS : que le tableau de bord lit la même entrée
// que l'écran en production — cela, c'est la seconde garde, sur le source.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { Obligation } from "@/lib/referentiels/conformite";
import type {
  EtatsPermanentsDuDossier,
  LigneEtatPermanent,
} from "@/lib/etats-permanents/queries";
import type { DashboardBundle } from "../types";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");

const OBLIGATION: Obligation = {
  id: "temoin",
  domaine: "incendie",
  libelle: "Témoin",
  referencesLegales: [{ source: "CODE_TRAVAIL", reference: "R. 0000-0" }],
  periodicite: "autre",
  realisateurs: ["exploitant"],
  criticite: 3,
  transmet: [],
  nature: "etat_permanent",
  pieceAttendue: null,
  usageEcran: null,
  typologies: { erp: true },
  porteur: "etablissement",
};

function ligne(
  id: string,
  p: Partial<LigneEtatPermanent> = {},
): LigneEtatPermanent {
  return {
    obligation: { ...OBLIGATION, id, libelle: `Libellé ${id}` },
    mode: "etat",
    compteDansLEnTete: true,
    parLesTitres: null,
    pieceAttendue: null,
    declareLe: null,
    note: null,
    aConfirmer: null,
    questionsSansReponse: [],
    fondement: {
      reference: `Réf. ${id}`,
      href: `https://www.legifrance.gouv.fr/${id}`,
      extrait: null,
    },
    ...p,
  };
}

const TITRE_EN_PLACE = {
  enPlace: true,
  phrase: "Établi d'après les titres déclarés : 1 titre, aucune échéance dépassée.",
  phraseSansNom: "Établi d'après les titres déclarés : 1 titre, aucune échéance dépassée.",
};

// Deux familles, l'une à deux blocs ; une ligne déclarée — dans le SECOND bloc,
// pour qu'un compte de famille lu sur son premier bloc se voie —, une établie
// d'après les titres, une « fait le » datée et une qui ne l'est pas.
const FABRIQUE: EtatsPermanentsDuDossier = {
  familles: [
    {
      groupe: "incendie_secours",
      libelle: "Incendie et secours",
      enPlace: 1,
      total: 3,
      parLesTitres: { total: 0, enPlace: 0 },
      blocs: [
        {
          sous: "alerter",
          libelle: "Alerter",
          enPlace: 0,
          total: 2,
          lignes: [ligne("inc-1"), ligne("inc-2")],
        },
        {
          sous: "evacuer",
          libelle: "Évacuer",
          enPlace: 1,
          total: 1,
          lignes: [ligne("inc-3", { declareLe: new Date("2026-08-12T09:00:00Z") })],
        },
      ],
    },
    {
      groupe: "organisation",
      libelle: "Qui s'occupe de quoi",
      enPlace: 2,
      total: 3,
      parLesTitres: { total: 1, enPlace: 1 },
      blocs: [
        {
          sous: null,
          libelle: null,
          enPlace: 2,
          total: 3,
          lignes: [
            ligne("org-cse", { aConfirmer: "Phrase à confirmer." }),
            ligne("org-ri", { declareLe: new Date("2026-09-01T09:00:00Z") }),
            ligne("org-habilitation", { parLesTitres: TITRE_EN_PLACE }),
          ],
        },
      ],
    },
  ],
  parLesRisques: [],
  faits: [
    ligne("fait-1", {
      mode: "fait",
      compteDansLEnTete: false,
      declareLe: new Date("2026-07-01T09:00:00Z"),
    }),
    ligne("fait-2", { mode: "fait", compteDansLEnTete: false, fondement: null }),
  ],
  enPlace: 3,
  total: 6,
  parLesTitres: { total: 1, enPlace: 1 },
  faitsDates: 2,
  faitsDatesRenseignes: 1,
};

// Le dossier que la page lit, posé par chaque test.
const courant = vi.hoisted(() => ({ d: null as unknown }));
// Les déclarations que la vraie lecture trouve en base, posées par dossier.
const base = vi.hoisted(() => ({ declarations: [] as unknown[] }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    declarationEtatPermanent: { findMany: vi.fn(async () => base.declarations) },
    titreSalarie: { findMany: vi.fn(async () => []) },
  },
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/lib/auth/scope", () => ({
  requireEtablissement: async () => ({
    etablissement: { id: "etab-1", raisonDisplay: "Témoin", entrepriseId: "ent-1" },
  }),
}));
vi.mock("@/lib/equipements/queries", () => ({
  listerEquipementsDeLEtablissement: async () => [],
}));
// La page lit `courant.d` ; le reste du module est le vrai — c'est lui qui
// fabrique les dossiers bureau et restaurant.
vi.mock("@/lib/etats-permanents/queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/etats-permanents/queries")>()),
  listerEtatsPermanents: async () => courant.d,
}));
// La ligne de l'écran porte des actions serveur ; seul son identifiant compte
// ici — il sert à prouver que le widget n'en rend aucune.
vi.mock("@/components/etats-permanents/LigneEtat", () => ({
  LigneEtat: ({ obligationId }: { obligationId: string }) => (
    <li data-obligation={obligationId} />
  ),
}));

// Le widget demande son résumé à une action serveur ; ici, elle rend ce que
// `resumeDuWidget` tire du même dossier — ce que fait l'action réelle
// (`lecture-widget.ts`, tenu par la garde de source plus bas).
const lecture = vi.hoisted(() => ({ rendre: null as null | (() => Promise<unknown>) }));
vi.mock("@/lib/etats-permanents/lecture-widget", () => ({
  resumeEtatsPermanentsPourWidget: () => lecture.rendre!(),
}));

import EtatsPermanentsPage from "@/app/etablissements/[id]/etats-permanents/page";
import { resumeDuWidget } from "@/lib/etats-permanents/widget";
import { REGISTRY } from "../registry";

const { listerEtatsPermanents } = await vi.importActual<
  typeof import("@/lib/etats-permanents/queries")
>("@/lib/etats-permanents/queries");

afterEach(cleanup);

const BASE = {
  id: "etab-1",
  effectifSurSite: 6,
  effectifEntreprise: 6,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
  typeErp: null,
  typesErpAutres: [],
  categorieErp: null,
  classeIgh: null,
  familleHabitation: null,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  comporteLocauxSommeilPublic: null,
  manutentionManuelle: null,
  travailSurEcran: null,
  operationsElectriques: null,
  conduiteEngins: null,
  expositionCMR: null,
  epiPresents: null,
  ssiCategorieAouB: null,
};

type Source = Parameters<typeof listerEtatsPermanents>[0];
type Equipements = Parameters<typeof listerEtatsPermanents>[1];

/**
 * La vraie lecture, avec des déclarations : sans elles, tous les « en place »
 * valent 0 et un compte faux à 0 passerait. On lit une première fois, puis on
 * déclare la DERNIÈRE ligne de chaque famille — hors du premier bloc quand la
 * famille en a plusieurs — et on relit.
 */
async function avecDeclarations(
  source: Source,
  equipements: Equipements,
): Promise<EtatsPermanentsDuDossier> {
  base.declarations = [];
  const nu = await listerEtatsPermanents(source, equipements);
  base.declarations = nu.familles
    .map((f) => f.blocs.at(-1)!.lignes.at(-1)!)
    .map((l) => ({
      obligationId: l.obligation.id,
      declareLe: new Date("2026-09-01T09:00:00Z"),
      note: null,
    }));
  return listerEtatsPermanents(source, equipements);
}

const DOSSIERS: Record<string, () => Promise<EtatsPermanentsDuDossier>> = {
  fabriqué: async () => FABRIQUE,
  bureau: () => avecDeclarations(BASE as unknown as Source, []),
  restaurant: () =>
    avecDeclarations(
      {
        ...BASE,
        effectifSurSite: 8,
        effectifEntreprise: 8,
        estERP: true,
        typeErp: "N",
        categorieErp: "N5",
      } as unknown as Source,
      [
        { id: "eq-1", libelle: "TGBT", categorie: "INSTALLATION_ELECTRIQUE", caracteristiques: null },
      ] as unknown as Equipements,
    ),
};

const ECRAN = "/etablissements/etab-1/etats-permanents";

async function rendreEcran(d: EtatsPermanentsDuDossier) {
  courant.d = d;
  return render(await EtatsPermanentsPage({ params: Promise.resolve({ id: "etab-1" }) }));
}

async function rendreWidget(
  d: EtatsPermanentsDuDossier,
  rendre: () => Promise<unknown> = async () => resumeDuWidget(d),
  variant = "default",
) {
  lecture.rendre = rendre;
  const bundle = { etablissementId: "etab-1" } as unknown as DashboardBundle;
  const Component = REGISTRY["etats-permanents"].Component;
  const r = render(<Component bundle={bundle} variant={variant} />);
  // La première peinture est « … » : on attend la réponse de l'action.
  await waitFor(() => expect(r.container.textContent).not.toMatch(/…$/));
  return r;
}

/** Le compte de l'en-tête de page, tel qu'un rendu l'affiche. */
const compteur = (c: HTMLElement) =>
  c.querySelector("[data-compteur-page]")?.textContent ?? null;

/** Les « x sur n » d'une famille, lus sur un rendu, par groupe. */
function comptesDesFamillesEcran(c: HTMLElement) {
  return [...c.querySelectorAll("section[id^='usage-']")].map((s) => [
    s.id,
    s.querySelector("section > div > p")!.textContent,
  ]);
}
function comptesDesFamillesWidget(c: HTMLElement) {
  return [...c.querySelectorAll("li[data-famille]")].map((li) => [
    new URL(li.querySelector("a")!.getAttribute("href")!, "http://x").hash.slice(1),
    li.querySelector("span")!.textContent,
  ]);
}

describe.each(Object.keys(DOSSIERS))("widget « Ce qui doit être en place », dossier %s", (nom) => {
  it("le dossier porte des états et plusieurs familles — sinon rien ne se compare", async () => {
    const d = await DOSSIERS[nom]();
    expect(d.total).toBeGreaterThan(0);
    expect(d.enPlace).toBeGreaterThan(0);
    expect(d.enPlace).toBeLessThan(d.total);
    expect(d.familles.length).toBeGreaterThanOrEqual(2);
    // Une famille à plusieurs blocs dont une ligne en place n'est pas au
    // premier : sans elle, un compte de famille lu sur un seul bloc passerait.
    expect(
      d.familles.some(
        (f) => f.blocs.length > 1 && f.blocs.slice(1).some((b) => b.enPlace > 0),
      ),
    ).toBe(true);
  });

  it("le compte du widget est celui de l'en-tête de page : en place, total, part des titres", async () => {
    const d = await DOSSIERS[nom]();
    const ecran = compteur((await rendreEcran(d)).container);
    cleanup();
    const widget = compteur((await rendreWidget(d)).container);

    // Borne basse : l'écran affiche bien SON compte, mesuré sur le dossier —
    // sans quoi deux relevés vides seraient égaux.
    expect(ecran).toContain(`${d.enPlace} sur ${d.total}`);
    if (d.parLesTitres.enPlace > 0) {
      expect(ecran).toMatch(new RegExp(`${d.parLesTitres.enPlace} établis? d'après les titres`));
    }
    expect(widget).toBe(ecran);
  });

  it("chaque famille du widget porte le « x sur n » de sa section, et leur somme est le compte", async () => {
    const d = await DOSSIERS[nom]();
    const ecran = comptesDesFamillesEcran((await rendreEcran(d)).container);
    cleanup();
    const widget = comptesDesFamillesWidget((await rendreWidget(d)).container);

    expect(ecran).toHaveLength(d.familles.length);
    expect(widget).toEqual(ecran);
    const r = resumeDuWidget(d);
    // Les familles plus les lignes déclarées sous une question d'activité
    // (`par-les-risques.ts`, 2026-10-21) font le compte de l'en-tête.
    expect(r.familles.reduce((n, f) => n + f.enPlace, 0) + r.risques.enPlace).toBe(r.enPlace);
    expect(r.familles.reduce((n, f) => n + f.total, 0) + r.risques.total).toBe(r.total);
  });

  it("chaque lien mène à l'écran et vise une section présente sur l'écran", async () => {
    const d = await DOSSIERS[nom]();
    const page = (await rendreEcran(d)).container;
    const ids = new Set([...page.querySelectorAll("section[id]")].map((s) => s.id));
    cleanup();
    const { container } = await rendreWidget(d);
    const liens = [...container.querySelectorAll("li[data-famille] a")];
    expect(liens).toHaveLength(d.familles.length);
    for (const a of liens) {
      const url = new URL(a.getAttribute("href")!, "http://x");
      expect(url.pathname).toBe(ECRAN);
      expect(ids.has(url.hash.slice(1)), url.hash).toBe(true);
    }
  });

  it("aucune ligne individuelle, quelle que soit la variante du registre", async () => {
    const d = await DOSSIERS[nom]();
    const libelles = [...d.familles.flatMap((f) => f.blocs.flatMap((b) => b.lignes)), ...d.faits, ...d.parLesRisques]
      .map((l) => l.obligation.libelle);
    expect(libelles.length).toBeGreaterThan(d.familles.length);
    const variantes = REGISTRY["etats-permanents"].variants;
    expect(variantes.length).toBeGreaterThan(0);
    for (const v of variantes) {
      const { container } = await rendreWidget(d, undefined, v.id);
      expect(container.querySelectorAll("[data-obligation]"), v.id).toHaveLength(0);
      // Une entrée par famille, plus celle des lignes liées aux risques quand
      // il y en a (2026-10-21) — rien d'autre dans la liste.
      const risques = resumeDuWidget(d).risques.lignes > 0 ? 1 : 0;
      expect(container.querySelectorAll("li"), v.id).toHaveLength(d.familles.length + risques);
      for (const l of libelles) expect(container.textContent, `${v.id} : ${l}`).not.toContain(l);
      cleanup();
    }
  });
});

describe("widget sans état, ou sans réponse", () => {
  const vide: EtatsPermanentsDuDossier = {
    familles: [],
    faits: [],
    parLesRisques: [],
    enPlace: 0,
    total: 0,
    parLesTitres: { total: 0, enPlace: 0 },
    faitsDates: 0,
    faitsDatesRenseignes: 0,
  };

  it("vide : dit que cet écran n'a rien, sans prétendre que tout est au calendrier", async () => {
    const { container } = await rendreWidget(vide);
    expect(container.textContent).toContain("Rien à déclarer sur cet écran");
    expect(container.textContent).not.toMatch(/toutes une date|figurent au calendrier/);
    expect(compteur(container)).toBeNull();
  });

  it("des lignes « fait le » sans aucun état : ne dit pas « rien à déclarer sur cet écran »", async () => {
    const { container } = await rendreWidget({ ...vide, faits: FABRIQUE.faits });
    expect(container.textContent).toContain("Aucun état à déclarer sur ce dossier.");
    expect(container.textContent).not.toContain("sur cet écran");
  });

  it("lecture en échec : renvoie à l'écran, ne se lit pas « rien à faire »", async () => {
    const { container } = await rendreWidget(vide, () => Promise.reject(new Error("x")));
    expect(container.textContent).toContain("n'a pas pu être lu");
    expect(container.textContent).not.toContain("Rien à déclarer");
  });
});

describe("même source que l'écran — le source, faute de pouvoir exécuter la page d'accueil", () => {
  const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");

  it("le widget lit l'entrée des états permanents et la résume par `resumeDuWidget`", () => {
    const action = lire("src/lib/etats-permanents/lecture-widget.ts");
    expect(action).toMatch(/^"use server";/);
    expect(action).toMatch(/assertEtablissementOwnership\(etablissementId\)/);
    expect(action).toMatch(/resumeDuWidget\(await etatsPermanentsDuDossier\(etablissementId, user\.id\)\)/);
  });

  it("l'écran et le widget lisent le compte de l'en-tête par la même fonction", () => {
    expect(lire("src/app/etablissements/[id]/etats-permanents/page.tsx")).toMatch(
      /<CompteurDeLaPage \{\.\.\.compteDeLaPage\(dossier\)\} \/>/,
    );
    expect(lire("src/lib/etats-permanents/widget.ts")).toMatch(/\.\.\.compteDeLaPage\(d\)/);
  });

  it("le tableau de bord ne lit PAS les états permanents à chaque affichage", () => {
    // Le widget n'est pas au board par défaut ; les lire au rendu serveur,
    // c'était un passage du moteur pour rien sur la plupart des tableaux.
    const accueil = lire("src/app/etablissements/[id]/page.tsx");
    expect(accueil).not.toMatch(/etatsPermanentsDuDossier|resumeDuWidget/);
  });

  it("cette entrée est la lecture de l'écran, pas une seconde", () => {
    const queries = lire("src/lib/etats-permanents/queries.ts");
    const corps = queries.slice(queries.indexOf("export async function etatsPermanentsDuDossier"));
    expect(corps).toMatch(/return listerEtatsPermanents\(/);
    expect(lire("src/app/etablissements/[id]/etats-permanents/page.tsx")).toMatch(
      /await listerEtatsPermanents\(/,
    );
  });
});
