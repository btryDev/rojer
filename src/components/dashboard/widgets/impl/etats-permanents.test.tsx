// @vitest-environment jsdom
//
// Le widget « Ce qui doit être en place » liste les lignes de l'écran du même
// nom — les mêmes, dans le même ordre, avec le même article.
//
// COMMENT. Un seul dossier, fabriqué ici, nourrit les deux : l'écran RÉEL
// (`etats-permanents/page.tsx`, rendu avec ses lectures remplacées par ce
// dossier) et le widget (par `lignesDuWidget`, ce que le tableau de bord
// appelle). On relève les obligations des deux rendus et on les compare.
// La page n'est pas réécrite pour le test : si elle cesse d'afficher une
// section, ou en ajoute une, les deux relevés divergent.
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

// Deux domaines, une ligne à confirmer, une déclarée, une « fait le » datée
// et une qui ne l'est pas : chaque branche d'état et chaque section.
const DOSSIER: EtatsPermanentsDuDossier = {
  groupes: [
    {
      domaine: "incendie",
      libelle: "Incendie",
      lignes: [
        ligne("inc-1", { declareLe: new Date("2026-08-12T09:00:00Z") }),
        ligne("inc-2"),
      ],
    },
    {
      domaine: "organisation" as never,
      libelle: "Organisation",
      lignes: [
        ligne("org-cse", { aConfirmer: "Phrase à confirmer." }),
        // Déclarée ET à confirmer : l'écran affiche les deux (M3).
        ligne("org-ri", {
          aConfirmer: "Phrase à confirmer.",
          declareLe: new Date("2026-09-01T09:00:00Z"),
        }),
      ],
    },
  ],
  faits: [
    ligne("fait-1", {
      mode: "fait",
      compteDansLEnTete: false,
      declareLe: new Date("2026-07-01T09:00:00Z"),
    }),
    ligne("fait-2", { mode: "fait", compteDansLEnTete: false, fondement: null }),
  ],
  enPlace: 2,
  total: 4,
  faitsDates: 2,
  faitsDatesRenseignes: 1,
};

vi.mock("@/lib/auth/scope", () => ({
  requireEtablissement: async () => ({
    etablissement: { id: "etab-1", raisonDisplay: "Témoin", entrepriseId: "ent-1" },
  }),
}));
vi.mock("@/lib/equipements/queries", () => ({
  listerEquipementsDeLEtablissement: async () => [],
}));
vi.mock("@/lib/etats-permanents/queries", () => ({
  listerEtatsPermanents: async () => DOSSIER,
}));
// La ligne de l'écran porte des actions serveur ; seul son identifiant compte ici.
// La ligne de l'écran porte des actions serveur ; on relève ce que la page lui
// passe — l'obligation et l'article —, pas son rendu, que `LigneEtat.test.tsx`
// tient à part.
vi.mock("@/components/etats-permanents/LigneEtat", () => ({
  LigneEtat: ({
    obligationId,
    fondement,
  }: {
    obligationId: string;
    fondement?: { reference: string } | null;
  }) => (
    <li data-obligation={obligationId} data-reference={fondement?.reference ?? ""} />
  ),
}));

// Le widget demande ses lignes à une action serveur ; ici, elle rend ce que
// `lignesDuWidget` tire du même dossier — ce que fait l'action réelle
// (`lecture-widget.ts`, tenu par la garde de source plus bas).
const lecture = vi.hoisted(() => ({ rendre: null as null | (() => Promise<unknown>) }));
vi.mock("@/lib/etats-permanents/lecture-widget", () => ({
  lignesEtatsPermanentsPourWidget: () => lecture.rendre!(),
}));

import EtatsPermanentsPage from "@/app/etablissements/[id]/etats-permanents/page";
import { WidgetEtatsPermanents } from "./etats-permanents";
import { lignesDuWidget } from "@/lib/etats-permanents/widget";

afterEach(cleanup);

const releve = (c: HTMLElement) =>
  [...c.querySelectorAll("[data-obligation]")].map((e) =>
    e.getAttribute("data-obligation"),
  );

async function rendreWidget(
  d: EtatsPermanentsDuDossier,
  rendre: () => Promise<unknown> = async () => lignesDuWidget(d),
) {
  lecture.rendre = rendre;
  const bundle = { etablissementId: "etab-1" } as unknown as DashboardBundle;
  const r = render(<WidgetEtatsPermanents bundle={bundle} />);
  // La première peinture est « … » : on attend la réponse de l'action.
  await waitFor(() => expect(r.container.textContent).not.toMatch(/…$/));
  return r;
}

describe("widget « Ce qui doit être en place »", () => {
  it("liste les lignes de l'écran, les mêmes et dans le même ordre", async () => {
    const ecran = render(
      await EtatsPermanentsPage({ params: Promise.resolve({ id: "etab-1" }) }),
    );
    const lignesEcran = releve(ecran.container);
    cleanup();
    const lignesWidget = releve((await rendreWidget(DOSSIER)).container);

    // Borne basse : les cinq lignes du dossier sont bien à l'écran — sans
    // quoi deux relevés vides seraient égaux.
    expect(lignesEcran).toHaveLength(6);
    expect(lignesWidget).toEqual(lignesEcran);
  });

  it("l'écran passe à chaque ligne l'article que le widget cite", async () => {
    const ecran = render(
      await EtatsPermanentsPage({ params: Promise.resolve({ id: "etab-1" }) }),
    );
    const references = [...ecran.container.querySelectorAll("[data-obligation]")].map(
      (e) => e.getAttribute("data-reference"),
    );
    expect(references).toEqual(
      lignesDuWidget(DOSSIER).map((l) => l.fondement?.reference ?? ""),
    );
    expect(references.filter(Boolean)).toHaveLength(5);
  });

  it("dit l'état par les mots de l'écran, sans compte ni qualification (M2, M3)", async () => {
    const { container } = await rendreWidget(DOSSIER);
    const texte = (id: string) =>
      container.querySelector(`[data-obligation="${id}"]`)!.textContent ?? "";
    expect(texte("inc-1")).toContain("Déclaré en place le 12/08/2026");
    // Non déclarée : le geste de l'écran, pas un manque.
    expect(texte("inc-2")).toContain("Déclarer en place");
    expect(texte("org-cse")).toContain("À confirmer · Déclarer en place");
    // Déclarée ET à confirmer : les deux, comme l'écran.
    expect(texte("org-ri")).toContain("À confirmer · Déclaré en place le 01/09/2026");
    expect(texte("fait-1")).toContain("Fait le 01/07/2026");
    expect(texte("fait-2")).toContain("Marquer comme fait");
    expect(container.textContent).not.toMatch(/À mettre en place|Pas encore daté|manqu/i);
    // Aucun chiffre agrégé : ni « 1 sur 3 », ni pourcentage.
    expect(container.textContent).not.toMatch(/\d+\s+sur\s+\d+|%/);
  });

  it("cite l'article de chaque ligne qui en porte un, et mène à l'écran", async () => {
    const { container } = await rendreWidget(DOSSIER);
    expect(container.textContent).toContain("Réf. inc-1");
    expect(container.textContent).toContain("Réf. org-cse");
    expect(
      container.querySelector('a[href="/etablissements/etab-1/etats-permanents"]'),
    ).not.toBeNull();
  });
});

describe("widget sans ligne, ou sans réponse", () => {
  const vide: EtatsPermanentsDuDossier = {
    groupes: [],
    faits: [],
    enPlace: 0,
    total: 0,
    faitsDates: 0,
    faitsDatesRenseignes: 0,
  };

  it("vide : dit que cet écran n'a rien, sans prétendre que tout est au calendrier", async () => {
    const { container } = await rendreWidget(vide);
    expect(container.textContent).toContain("Rien à déclarer sur cet écran");
    expect(container.textContent).not.toMatch(/toutes une date|figurent au calendrier/);
  });

  it("lecture en échec : renvoie à l'écran, ne se lit pas « rien à faire »", async () => {
    const { container } = await rendreWidget(vide, () => Promise.reject(new Error("x")));
    expect(container.textContent).toContain("n'a pas pu être lue");
    expect(container.textContent).not.toContain("Rien à déclarer");
  });
});

describe("même source que l'écran — le source, faute de pouvoir exécuter la page d'accueil", () => {
  const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");

  it("le widget lit l'entrée des états permanents et l'aplatit par `lignesDuWidget`", () => {
    const action = lire("src/lib/etats-permanents/lecture-widget.ts");
    expect(action).toMatch(/^"use server";/);
    expect(action).toMatch(/assertEtablissementOwnership\(etablissementId\)/);
    expect(action).toMatch(/lignesDuWidget\(await etatsPermanentsDuDossier\(etablissementId, user\.id\)\)/);
  });

  it("le tableau de bord ne lit PAS les états permanents à chaque affichage", () => {
    // Le widget n'est pas au board par défaut ; les lire au rendu serveur,
    // c'était un passage du moteur pour rien sur la plupart des tableaux.
    const accueil = lire("src/app/etablissements/[id]/page.tsx");
    expect(accueil).not.toMatch(/etatsPermanentsDuDossier|lignesDuWidget/);
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
