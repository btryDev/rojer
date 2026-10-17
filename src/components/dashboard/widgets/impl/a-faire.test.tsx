// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { DashboardBundle } from "../types";

// Le lien de provenance lit l'URL courante par `next/navigation`, absent hors
// du routeur : un lien nu suffit à ce que ces tests regardent.
vi.mock("@/components/navigation/LienProvenance", () => ({
  LienProvenance: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { BlocAFaire } from "./board";
import { genererRecommandations } from "@/lib/dashboard/recommandations";
import { rapprocher } from "@/lib/dashboard/transmissions";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { TIERS_LUI_MEME_OBLIGATOIRE } from "@/lib/prestataires/domaines";

afterEach(cleanup);

const AUJOURDHUI = new Date("2026-09-14T10:00:00.000Z");

const bundle = (recommandations: unknown[]) =>
  ({
    etablissementId: "etab-1",
    aujourdhui: AUJOURDHUI,
    dashboard: { recommandations },
    echeances: { sous30j: { total: 0 }, retards: { total: recommandations.length } },
  }) as unknown as DashboardBundle;

describe("bloc « À faire » — un retard sans échéance connue", () => {
  /**
   * Contrôle visuel en production, 2026-09-14 : la ligne voisine affichait
   * « 57 j de retard », celle-ci rien — ni pastille, ni raison.
   */
  it("porte la pastille « En retard » et dit pourquoi, sans compter de jours", () => {
    const { container } = render(
      <BlocAFaire
        bundle={bundle([
          {
            kind: "verif_depassee",
            cle: "verif-depassee:v1",
            titre: "Vérification initiale des installations électriques",
            href: "/etablissements/etab-1/verifications/v1",
            priorite: 1,
            date: undefined,
          },
          {
            kind: "verif_depassee",
            cle: "verif-depassee:v2",
            titre: "Visite d'information et de prévention",
            href: "/etablissements/etab-1/verifications/v2",
            priorite: 1,
            date: new Date("2026-07-19T00:00:00.000Z"),
          },
        ])}
      />,
    );
    const texte = container.textContent ?? "";
    expect(texte).toContain("Vérification · aucune vérification enregistrée");
    expect(texte).toContain("En retard");
    // La ligne datée garde son compte de jours.
    expect(texte).toContain("57 j de retard");
  });
});

describe("bloc « À faire » — aucun service de santé au travail, six retards (2026-10-18)", () => {
  /**
   * Le défaut constaté dans l'app : la carte avait la priorité 8,5 et la file
   * s'arrêtait à cinq. Sur un dossier à cinq retards ou plus, le widget ne la
   * montrait jamais. Chaîne entière : rapprochement réel, moteur, widget.
   */
  it("montre l'alerte dans le widget", () => {
    const adhesion = obligationsConformite.find(
      (o) => o.id === "sante-travail-etablissement-adhesion-spst",
    )!;
    const recommandations = genererRecommandations(
      {
        etablissementId: "etab-1",
        verifications: Array.from({ length: 6 }, (_, i) => ({
          id: `v${i}`,
          statut: "planifiee",
          datePrevue: new Date(Date.UTC(2026, 5, 1 + i, 12)),
          periodicite: "annuelle",
          archiveLe: null,
          graceJusquAu: null,
          libelleObligation: `Vérification ${i}`,
          equipementLibelle: "Tableau",
        })),
        actions: [],
        nbEquipements: 3,
        duerpSecteurChoisi: true,
        nbRapports: 2,
        transmissions: rapprocher([adhesion], [], [], AUJOURDHUI),
      },
      { now: AUJOURDHUI },
    );
    const { container } = render(
      <BlocAFaire
        bundle={
          {
            etablissementId: "etab-1",
            aujourdhui: AUJOURDHUI,
            dashboard: { recommandations },
            echeances: { sous30j: { total: 0 }, retards: { total: 6 } },
          } as unknown as DashboardBundle
        }
      />,
    );
    const texte = container.textContent ?? "";
    expect(texte).toContain(TIERS_LUI_MEME_OBLIGATOIRE.sante_travail!.titre);
    // Le retard évincé de la file n'est pas perdu : le pied le compte
    // (six retards, quatre affichés).
    expect(texte).toContain("2 autres en retard");
    // Le sous-titre ne prétend plus que les cinq cartes sont « les cinq plus
    // urgentes » : la dernière est la place réservée.
    expect(texte).toContain("Les plus urgentes, puis le service de santé au travail.");
    expect(texte).not.toContain("Les cinq plus urgentes");
  });

  it("sans place réservée, le sous-titre reste « les cinq plus urgentes »", () => {
    const retards = Array.from({ length: 5 }, (_, i) => ({
      kind: "verif_depassee",
      cle: `verif-depassee:v${i}`,
      titre: `Vérification ${i}`,
      href: `/etablissements/etab-1/verifications/v${i}`,
      priorite: 1,
      date: new Date(Date.UTC(2026, 5, 1 + i, 12)),
    }));
    const { container } = render(
      <BlocAFaire
        bundle={
          {
            etablissementId: "etab-1",
            aujourdhui: AUJOURDHUI,
            dashboard: { recommandations: retards },
            echeances: { sous30j: { total: 0 }, retards: { total: 6 } },
          } as unknown as DashboardBundle
        }
      />,
    );
    expect(container.textContent).toContain("Les cinq plus urgentes");
  });
});
