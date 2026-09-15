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

import { WidgetProchainesEcheances } from "./echeances";

afterEach(cleanup);

/** Le 14 septembre 2026, à midi à Paris. */
const AUJOURDHUI = new Date("2026-09-14T10:00:00.000Z");
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const ligne = (id: string, iso: string, statut = "planifiee") => ({
  id,
  libelleObligation: `Obligation ${id}`,
  datePrevue: jour(iso),
  statut,
  periodicite: "annuelle",
  archiveLe: null,
  equipement: { libelle: `Appareil ${id}` },
  prescription: null,
});

const bundle = (
  lignes: ReturnType<typeof ligne>[],
  verifsEnRetardSansEcheance = lignes.filter(
    (l) => l.statut === "a_planifier" && l.datePrevue < jour("2026-09-14"),
  ).length,
) =>
  ({
    etablissementId: "etab-1",
    aujourdhui: AUJOURDHUI,
    prochainesVerifs: lignes,
    echeances: { verifsEnRetardSansEcheance },
  }) as unknown as DashboardBundle;

const occurrences = (texte: string, motif: string) => texte.split(motif).length - 1;

describe("widget « Prochaines échéances » — les libellés d'une ligne sans échéance connue", () => {
  /**
   * RELECTURE DES LIBELLÉS DU 2026-09-14. Une « à planifier » du jour
   * affichait « — » à la place de la date, puis « À planifier » deux fois :
   * sous forme de délai, et dans la pastille. Là où une date s'afficherait, la
   * phrase partagée ; le mot du statut, une fois.
   */
  it("dit « Sans échéance connue » à la place de la date, et « À planifier » une seule fois", () => {
    const { container } = render(
      <WidgetProchainesEcheances
        bundle={bundle([ligne("v1", "2026-09-14", "a_planifier")])}
        variant="liste"
      />,
    );
    const texte = container.textContent ?? "";
    expect(occurrences(texte, "Sans échéance connue")).toBe(1);
    expect(occurrences(texte, "À planifier")).toBe(1);
    expect(texte).not.toContain("—");
  });

  it("en retard, garde la raison : aucune vérification enregistrée", () => {
    const { container } = render(
      <WidgetProchainesEcheances
        bundle={bundle([ligne("v1", "2026-09-01", "a_planifier")])}
        variant="liste"
      />,
    );
    const texte = container.textContent ?? "";
    expect(texte).toContain("Sans échéance connue");
    expect(texte).toContain("Aucune vérification enregistrée");
    expect(texte).not.toContain("À planifier");
  });
});

describe("widget « Prochaines échéances » — les retards sans date hors des cinq", () => {
  /**
   * 2026-09-15. Les cinq places vont aux échéances connues d'abord : un dossier
   * qui en a cinq ne montrait plus ses retards sans date, et rien ne le disait.
   */
  const cinqConnues = ["2026-09-20", "2026-10-01", "2026-10-15", "2026-11-01", "2026-12-01"].map(
    (iso, i) => ligne(`c${i}`, iso),
  );

  it.each(["liste", "timeline"])(
    "nomme, en variante %s, les retards sans date que la liste laisse dehors",
    (variant) => {
      const { container } = render(
        <WidgetProchainesEcheances bundle={bundle(cinqConnues, 3)} variant={variant} />,
      );
      expect(container.textContent).toContain(
        "Hors de ces cinq : 3 vérifications en retard, sans échéance connue.",
      );
    },
  );

  it("ne dit rien de ceux que la liste montre déjà", () => {
    const lignes = [...cinqConnues.slice(0, 4), ligne("s1", "2026-09-01", "a_planifier")];
    const { container } = render(
      <WidgetProchainesEcheances bundle={bundle(lignes, 1)} variant="liste" />,
    );
    expect(container.textContent).not.toContain("Hors de ces cinq");
  });

  it("ne compte hors de la liste que ceux qu'elle ne montre pas", () => {
    // Quatre retards sans date au dossier, un seul a trouvé sa place.
    const lignes = [...cinqConnues.slice(0, 4), ligne("s1", "2026-09-01", "a_planifier")];
    const { container } = render(
      <WidgetProchainesEcheances bundle={bundle(lignes, 4)} variant="liste" />,
    );
    expect(container.textContent).toContain(
      "Hors de ces cinq : 3 vérifications en retard, sans échéance connue.",
    );
  });
});
