// @vitest-environment jsdom
// LA VISITE DE LA COMMISSION DE SÉCURITÉ, « POUR INFORMATION », SUR LES
// SURFACES QUI LA MONTRENT (C64, 2026-10-08).
//
// Le dossier de conformité PDF est éprouvé dans
// `lib/pdf/DossierConformiteDocument.test.tsx`, le README du ZIP et les
// comptes (indice, retards) dans `referentiels/conformite/initiative.test.ts`.
//
// Chaque surface est RENDUE, avec une ligne pour information et avec une ligne
// ordinaire à la même date : une pastille posée dans une branche jamais prise
// passerait pour présente au grep. Borne basse : la mention est là pour la
// visite ; borne haute : elle n'est pas là pour la ligne ordinaire, et la
// visite n'est jamais peinte « En retard ».

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { DashboardBundle } from "@/components/dashboard/widgets/types";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import {
  estPourInformation,
  LIBELLE_POUR_INFORMATION,
  MENTION_POUR_INFORMATION,
} from "@/lib/referentiels/conformite/initiative";
import { AUCUNE_PRUDENCE } from "@/lib/calendrier/prudence";

vi.mock("next/navigation", () => ({
  usePathname: () => "/etablissements/etab-1",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/navigation/LienProvenance", () => ({
  LienProvenance: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/mcp/prisma", () => ({ prismaMcp: {} }));

const { BadgeStatut } = await import("@/components/calendrier/BadgeStatut");
const { WidgetProchainesEcheances } = await import(
  "@/components/dashboard/widgets/impl/echeances"
);
const { etatDe } = await import("@/lib/mcp/queries");
const { statutAffiche } = await import("@/lib/calendrier/etats");

afterEach(cleanup);

const VISITE = obligationsConformite.find((o) => estPourInformation(o))!;
const ORDINAIRE = obligationsConformite.find(
  (o) => !estPourInformation(o) && o.periodicite === "annuelle",
)!;
const AUJOURDHUI = new Date("2026-10-08T10:00:00.000Z");
const PASSEE = new Date("2026-03-01T00:00:00.000Z");

const verif = (obligationId: string) => ({
  id: `v-${obligationId}`,
  obligationId,
  libelleObligation: "Visite périodique",
  datePrevue: PASSEE,
  statut: "planifiee",
  periodicite: "quinquennale",
  archiveLe: null,
  equipement: { libelle: "Tout l'établissement" },
  prescription: null,
  prescriptionId: null as string | null,
  aConfirmer: [] as string[],
  rythmeRetenu: null,
});

const texte = (el: ReturnType<typeof render>) => {
  const t = el.container.textContent ?? "";
  el.unmount();
  return t;
};

describe("calendrier, fiche, registre web : la pastille", () => {
  it("la ligne pour information se peint « Pour information », la phrase en infobulle", () => {
    const statut = statutAffiche(verif(VISITE.id), AUJOURDHUI)!;
    expect(statut).toBe("pour_information");
    const el = render(<BadgeStatut statut={statut} />);
    expect(el.container.textContent).toBe(LIBELLE_POUR_INFORMATION);
    expect(el.container.querySelector("span")?.getAttribute("title")).toBe(MENTION_POUR_INFORMATION);
  });

  it("la ligne ordinaire à la même date se peint « En retard »", () => {
    const statut = statutAffiche(verif(ORDINAIRE.id), AUJOURDHUI)!;
    expect(texte(render(<BadgeStatut statut={statut} />))).toBe("En retard");
  });
});

describe("tableau de bord : prochaines échéances", () => {
  const bundle = (obligationId: string) =>
    ({
      etablissementId: "etab-1",
      aujourdhui: AUJOURDHUI,
      prochainesVerifs: [verif(obligationId)],
      prochaineEcheance: null,
      echeances: { verifsEnRetardSansEcheance: 0 },
    }) as unknown as DashboardBundle;

  it("la visite porte la mention ; la ligne ordinaire ne la porte pas", () => {
    expect(
      texte(render(<WidgetProchainesEcheances bundle={bundle(VISITE.id)} variant="list" />)),
    ).toContain(LIBELLE_POUR_INFORMATION);
    expect(
      texte(render(<WidgetProchainesEcheances bundle={bundle(ORDINAIRE.id)} variant="list" />)),
    ).not.toContain(LIBELLE_POUR_INFORMATION);
  });
});

describe("serveur MCP : l'état rendu à l'assistant", () => {
  it("« pour_information » pour la visite, « en_retard » pour la ligne ordinaire", () => {
    expect(etatDe(verif(VISITE.id), AUJOURDHUI, AUCUNE_PRUDENCE)).toBe("pour_information");
    expect(etatDe(verif(ORDINAIRE.id), AUJOURDHUI, AUCUNE_PRUDENCE)).toBe("en_retard");
  });
});
