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
  prescriptionId: null as string | null,
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
    demandesAssureurHorsListe: [],
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

describe("widget « Prochaines échéances » — D1 (a), la ligne retenue par prudence (2026-09-28)", () => {
  // Échue, mais seul le silence de la fiche la retient : ni « Dépassé » ni
  // « Planifié ». Éprouvé en retirant la branche prudente de `classifier`.
  it("dit « À confirmer », jamais « Dépassé » ; sans marque, « Dépassé »", () => {
    const echue = ligne("p1", "2026-09-01");
    const prudente = render(
      <WidgetProchainesEcheances
        bundle={bundle([{ ...echue, aConfirmer: ["phrase"] } as ReturnType<typeof ligne>])}
        variant="liste"
      />,
    ).container.textContent ?? "";
    expect(prudente).toContain("À confirmer");
    expect(prudente).not.toContain("Dépassé");
    cleanup();

    const due = render(
      <WidgetProchainesEcheances bundle={bundle([echue])} variant="liste" />,
    ).container.textContent ?? "";
    expect(due).toContain("Dépassé");
  });
});

describe("widget « Prochaines échéances » — une demande d'assureur à planifier est NOMMÉE", () => {
  /**
   * CONTRÔLE VISUEL DU 2026-10-13. La thermographie du dossier semé, demandée
   * par l'assureur et à planifier, n'apparaissait sur aucun widget : cinq
   * échéances datées la poussaient hors de la liste. Décision de la
   * propriétaire : elle doit apparaître — nommée, avec son marquage.
   */
  const assureur = {
    ...ligne("thermo", "2026-09-01", "a_planifier"),
    libelleObligation: "Thermographie infrarouge",
    prescription: { source: "demande_assureur" },
  };

  it.each(["liste", "timeline"])("variante %s : le libellé et le marquage sous la liste", (variant) => {
    const b = {
      ...bundle([1, 2, 3, 4, 5].map((n) => ligne(`d${n}`, `2026-10-0${n}`))),
      demandesAssureurHorsListe: [assureur],
    } as unknown as DashboardBundle;
    const { container } = render(<WidgetProchainesEcheances bundle={b} variant={variant} />);
    const texte = container.textContent ?? "";
    expect(texte).toContain("à la demande de votre assureur");
    expect(texte).toContain("Thermographie infrarouge");
    expect(texte).toContain("Engagement d'assurance");
    expect(container.querySelector('a[href="/etablissements/etab-1/verifications/thermo"]')).not.toBeNull();
  });

  it("la demande nommée et en retard n'est pas comptée une seconde fois", () => {
    // Revue du 2026-10-13 : en production, l'agrégat compte la thermographie
    // (date d'origine passée, sans échéance) parmi les retards sans date. La
    // fixture le reproduit : 1 au compteur, et la ligne hors des cinq.
    const b = {
      ...bundle([1, 2, 3, 4, 5].map((n) => ligne(`d${n}`, `2026-10-0${n}`)), 1),
      demandesAssureurHorsListe: [assureur],
    } as unknown as DashboardBundle;
    const { container } = render(<WidgetProchainesEcheances bundle={b} variant="liste" />);
    const texte = container.textContent ?? "";
    expect(texte).toContain("Thermographie infrarouge");
    expect(texte).not.toContain("en retard, sans échéance connue");
  });

  it("rien quand aucune demande n'est hors liste", () => {
    const { container } = render(
      <WidgetProchainesEcheances bundle={bundle([ligne("v1", "2026-10-01")])} variant="liste" />,
    );
    expect(container.textContent).not.toContain("à la demande de votre assureur");
  });
});
