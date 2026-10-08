// @vitest-environment jsdom
// LA MENTION DE RYTHME RETENU SUR LES SURFACES QUI PORTAIENT DÉJÀ LE MARQUAGE
// CONTRACTUEL (revue du 2026-10-07, correction 1).
//
// L'ADR-039 § 5 interdit « un rythme retenu sans marquage, sur quelque surface
// que ce soit ». Le lot 2 l'avait posée sur le calendrier, les fiches, le
// registre PDF, le ZIP, la grille, l'export et le MCP ; elle manquait au
// tableau de bord (échéances, prochaine échéance, semaine), au registre web
// (fiches tenues ailleurs) et au guide — exactement là où `MentionContractuelle`
// était déjà branchée. Chaque surface est RENDUE ici, avec et sans mention :
// une pastille dans une branche jamais prise passerait pour présente au grep.
//
// La donnée aussi : la page du board et le registre lisent la mention au
// référentiel par `obligationId` (`mentionRythmeDeVerification`), le guide par
// `mentionRythmeRetenu`. Une projection qui la jetterait entre la requête et
// le widget — le défaut déjà vécu avec la source de prescription — se voit
// dans les deux moitiés.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DashboardBundle } from "@/components/dashboard/widgets/types";
import type { MentionRythme } from "@/lib/referentiels/conformite/mention-rythme";
import type { SectionRegistre } from "@/lib/registre/sections";
import { AUCUNE_PRUDENCE } from "@/lib/calendrier/prudence";
import { obligationsConformite } from "@/lib/referentiels/conformite";

vi.mock("next/navigation", () => ({
  usePathname: () => "/etablissements/etab-1",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/navigation/LienProvenance", () => ({
  LienProvenance: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/etats-permanents/actions", () => ({
  declarerEnPlace: vi.fn(),
  retirerDeclaration: vi.fn(),
}));

const { WidgetSemaine } = await import("@/components/dashboard/widgets/impl/semaine");
const { WidgetProchainesEcheances } = await import(
  "@/components/dashboard/widgets/impl/echeances"
);
const { BlocProchaineEcheance } = await import("@/components/dashboard/widgets/impl/board");
const { ContenuTenuAilleurs } = await import("@/components/registre/ContenuTenuAilleurs");
const { ChezVous } = await import("@/components/guide/ChezVous");
const { construireChezVous } = await import("@/lib/guide/chez-vous");
const { contenuTenuAilleursDepuis } = await import("@/lib/registre/contenu-ailleurs");
const { mentionRythmeDeVerification } = await import(
  "@/lib/referentiels/conformite/mention-de-ligne"
);

afterEach(cleanup);

const MENTION: MentionRythme = {
  motif: "norme",
  court: "Rythme de la norme NF S 61-919",
  long: "Rythme de la norme NF S 61-919 (août 2001), § 5.1.1 : tous les ans.",
};
const COURT = MENTION.court;

/** Une obligation livrée qui porte un rythme retenu, lue au référentiel. */
const AVEC_RYTHME = obligationsConformite.find(
  (o) => o.rythmeRetenu?.motif === "norme" && o.categoriesEquipement?.includes("EXTINCTEUR"),
)!;

const AUJOURDHUI = new Date("2026-09-14T10:00:00.000Z");
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const verif = (rythmeRetenu: MentionRythme | null) => ({
  id: "v1",
  libelleObligation: "Maintenance de l'extincteur",
  datePrevue: jour("2026-09-20"),
  statut: "planifiee",
  periodicite: "annuelle",
  archiveLe: null,
  graceJusquAu: null,
  equipement: { libelle: "Extincteur hall" },
  prescription: null,
  prescriptionId: null as string | null,
  aConfirmer: [] as string[],
  rythmeRetenu,
});

const bundle = (rythmeRetenu: MentionRythme | null) =>
  ({
    etablissementId: "etab-1",
    aujourdhui: AUJOURDHUI,
    prochainesVerifs: [verif(rythmeRetenu)],
    prochaineEcheance: verif(rythmeRetenu),
    echeances: { verifsEnRetardSansEcheance: 0 },
    evenementsSemaine: [
      {
        id: "v1",
        libelle: "Maintenance de l'extincteur",
        date: jour("2026-09-15"),
        tone: "ok" as const,
        sansEcheance: false,
        type: "verification" as const,
        contractuelle: false,
        rythmeRetenu,
        aConfirmer: [],
        equipement: "Extincteur hall",
        batiment: null,
      },
    ],
  }) as unknown as DashboardBundle;

/** Avec la mention, elle est à l'écran ; sans, elle n'y est pas. */
function avecEtSans(rendre: (m: MentionRythme | null) => string) {
  expect(rendre(MENTION)).toContain(COURT);
  expect(rendre(null)).not.toContain(COURT);
}

const texteDe = (el: ReturnType<typeof render>) => {
  const t = el.container.textContent ?? "";
  el.unmount();
  return t;
};

describe("tableau de bord", () => {
  it("prochaines échéances, liste", () => {
    avecEtSans((m) =>
      texteDe(render(<WidgetProchainesEcheances bundle={bundle(m)} variant="list" />)),
    );
  });

  it("prochaines échéances, frise : l'infobulle et la légende", () => {
    avecEtSans((m) =>
      texteDe(render(<WidgetProchainesEcheances bundle={bundle(m)} variant="timeline" />)),
    );
  });

  it("la carte « Prochaine échéance »", () => {
    avecEtSans((m) => texteDe(render(<BlocProchaineEcheance bundle={bundle(m)} />)));
  });

  it("la semaine", () => {
    avecEtSans((m) => texteDe(render(<WidgetSemaine bundle={bundle(m)} />)));
  });

  it("la donnée : la page lit la mention au référentiel, et la prescription l'éteint", () => {
    const ligne = { obligationId: AVEC_RYTHME.id, prescriptionId: null, prescription: null };
    expect(mentionRythmeDeVerification(ligne)).not.toBeNull();
    expect(
      mentionRythmeDeVerification({ ...ligne, prescriptionId: "p1", prescription: { source: "assureur" } }),
    ).toBeNull();
  });
});

describe("registre web — une fiche tenue ailleurs", () => {
  const section: SectionRegistre = {
    id: "verifications-moyens-extinction",
    partie: "3.1",
    titre: "Vérifications des moyens d'extinction",
    attendu: "Vérifications périodiques des extincteurs.",
    categoriesEquipement: ["EXTINCTEUR"],
  };
  const ligne = (prescriptionId: string | null) => ({
    id: "v1",
    obligationId: AVEC_RYTHME.id,
    prescriptionId,
    libelleObligation: AVEC_RYTHME.libelle,
    datePrevue: jour("2026-11-02"),
    derniereRealisation: null,
    periodicite: "annuelle",
    archiveLe: null,
    graceJusquAu: null,
    statut: "planifiee" as const,
    equipement: { libelle: "Extincteur hall", categorie: "EXTINCTEUR" },
  });
  const contenu = (prescriptionId: string | null) =>
    contenuTenuAilleursDepuis(
      "etab-1",
      "3.1",
      section,
      [],
      [ligne(prescriptionId)],
      AUJOURDHUI,
      AUCUNE_PRUDENCE,
    )!;

  it("la donnée porte la mention, sauf sur une ligne surchargée", () => {
    expect(contenu(null).lignes[0].rythmeRetenu?.court).toMatch(/^Rythme de la norme/);
    expect(contenu("p1").lignes[0].rythmeRetenu).toBeNull();
  });

  it("l'écran la rend", () => {
    expect(renderToStaticMarkup(<ContenuTenuAilleurs {...contenu(null)} />)).toContain(
      "Rythme de la norme",
    );
    expect(renderToStaticMarkup(<ContenuTenuAilleurs {...contenu("p1")} />)).not.toContain(
      "Rythme de la norme",
    );
  });
});

describe("guide « Comprendre » — chez vous", () => {
  const etab = {
    id: "etab-1",
    effectifSurSite: 8,
    effectifEntreprise: 8,
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
  };
  const extincteur = {
    id: "eq-ext",
    libelle: "Extincteur hall",
    categorie: "EXTINCTEUR" as const,
    caracteristiques: null,
  };

  it("un domaine qui porte un rythme retenu le dit, à l'écran", () => {
    const data = construireChezVous(etab, [extincteur], 8);
    const incendie = data.domaines.find((d) => d.domaine === "incendie")!;
    expect(incendie.rythmesRetenus.map((r) => r.mention.court)).toContain(
      "Rythme de la norme NF S 61-919",
    );
    const html = renderToStaticMarkup(
      <ChezVous
        data={data}
        etablissementId="etab-1"
        entrepriseId="ent-1"
        raisonDisplay="Bureau"
        regimes={["Travail"]}
      />,
    );
    expect(html).toContain("Rythme de la norme NF S 61-919");
  });

  it("un domaine rythmé par les seuls textes ne porte aucune mention", () => {
    const data = construireChezVous(etab, [], 8);
    for (const d of data.domaines) {
      for (const r of d.rythmesRetenus) {
        // Toute mention rendue correspond à une obligation du domaine qui
        // porte bien un rythme retenu : pas de pastille par défaut.
        expect(
          obligationsConformite.some(
            (o) => o.domaine === d.domaine && o.rythmeRetenu !== undefined,
          ),
          `${d.domaine} : ${r.mention.court}`,
        ).toBe(true);
      }
    }
  });
});
