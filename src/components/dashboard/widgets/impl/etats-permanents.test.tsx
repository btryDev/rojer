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
import { cleanup, render } from "@testing-library/react";
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
      lignes: [ligne("org-cse", { aConfirmer: "Phrase à confirmer." })],
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
  enPlace: 1,
  total: 3,
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
vi.mock("@/components/etats-permanents/LigneEtat", () => ({
  LigneEtat: ({ obligationId }: { obligationId: string }) => (
    <li data-obligation={obligationId} />
  ),
}));

import EtatsPermanentsPage from "@/app/etablissements/[id]/etats-permanents/page";
import { WidgetEtatsPermanents } from "./etats-permanents";
import { lignesDuWidget } from "@/lib/etats-permanents/widget";

afterEach(cleanup);

const releve = (c: HTMLElement) =>
  [...c.querySelectorAll("[data-obligation]")].map((e) =>
    e.getAttribute("data-obligation"),
  );

function rendreWidget(d: EtatsPermanentsDuDossier) {
  const bundle = {
    etablissementId: "etab-1",
    etatsPermanents: lignesDuWidget(d),
  } as unknown as DashboardBundle;
  return render(<WidgetEtatsPermanents bundle={bundle} variant="default" />);
}

describe("widget « Ce qui doit être en place »", () => {
  it("liste les lignes de l'écran, les mêmes et dans le même ordre", async () => {
    const ecran = render(
      await EtatsPermanentsPage({ params: Promise.resolve({ id: "etab-1" }) }),
    );
    const lignesEcran = releve(ecran.container);
    cleanup();
    const lignesWidget = releve(rendreWidget(DOSSIER).container);

    // Borne basse : les cinq lignes du dossier sont bien à l'écran — sans
    // quoi deux relevés vides seraient égaux.
    expect(lignesEcran).toHaveLength(5);
    expect(lignesWidget).toEqual(lignesEcran);
  });

  it("dit l'état par les phrases de l'écran, sans compte ni qualification", () => {
    const { container } = rendreWidget(DOSSIER);
    const texte = (id: string) =>
      container.querySelector(`[data-obligation="${id}"]`)!.textContent ?? "";
    expect(texte("inc-1")).toContain("Déclaré en place le 12/08/2026");
    expect(texte("inc-2")).toContain("À mettre en place");
    expect(texte("org-cse")).toContain("À confirmer");
    expect(texte("fait-1")).toContain("Fait le 01/07/2026");
    expect(texte("fait-2")).toContain("Pas encore daté");
    // Aucun chiffre agrégé : ni « 1 sur 3 », ni pourcentage.
    expect(container.textContent).not.toMatch(/\d+\s+sur\s+\d+|%/);
  });

  it("cite l'article de chaque ligne qui en porte un, et mène à l'écran", () => {
    const { container } = rendreWidget(DOSSIER);
    expect(container.textContent).toContain("Réf. inc-1");
    expect(container.textContent).toContain("Réf. org-cse");
    expect(
      container.querySelector('a[href="/etablissements/etab-1/etats-permanents"]'),
    ).not.toBeNull();
  });
});

describe("même source que l'écran — le source, faute de pouvoir exécuter la page d'accueil", () => {
  const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf8");

  it("le tableau de bord lit l'entrée des états permanents et l'aplatit par `lignesDuWidget`", () => {
    const accueil = lire("src/app/etablissements/[id]/page.tsx");
    expect(accueil).toMatch(/etatsPermanentsDuDossier\(id, user\.id\)/);
    expect(accueil).toMatch(/etatsPermanents: lignesDuWidget\(etatsPermanents\)/);
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
