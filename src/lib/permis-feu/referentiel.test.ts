// Les mesures du permis de feu disent ce que la brochure INRS ED 6030 écrit,
// et rien d'autre.
//
// POURQUOI CE TEST EXISTE. La liste se présentait comme « tirée de la
// démarche INRS ED 6030 » et la contredisait : « rayon de 5 m » pour « au
// moins 10 m », un extincteur de 6 L ou de CO2 pour « 1 extincteur 9 litres à
// eau et 1 extincteur adapté aux risques du local », « couper la ventilation »
// là où la brochure prévoit une ventilation « si nécessaire ». Relevé le
// 2026-09-26 par appariement ligne à ligne ; journal C33.
//
// CE QU'IL TIENT : le libellé affiché EST l'« Action » de la brochure, et
// l'explication EST son « Commentaire ». Une mesure reformulée à la main
// tombe.
//
// CE QU'IL NE PROUVE PAS : que l'extrait consigné est celui de la brochure.
// Il a été confronté, le 2026-09-26, aux deux extractions du PDF
// (`TI-ED-6030-2.pdf`, 2e édition, août 2019 ; pdftotext et pypdf) : les 25
// extraits s'y trouvent, une coupure de mot près (« interro- ger », pypdf).
// La brochure n'est pas au dépôt ; cette confrontation se refait à la main
// quand l'INRS la révise.

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { RELEVES_ED6030 } from "./releve-ed6030";
import {
  MESURES_PERMIS_FEU,
  MESURES_RETIREES,
  mesureParId,
  type MesurePermisFeu,
} from "./referentiel";

/** Les écarts d'une mesure à sa source : `[]` si elle la cite. */
function ecartsALaSource(m: MesurePermisFeu): string[] {
  const e: string[] = [];
  if (m.libelle !== m.source.action) e.push(`libellé ≠ « ${m.source.action} »`);
  if ((m.explication ?? null) !== (m.source.commentaire ?? null))
    e.push(`explication ≠ commentaire de la p. ${m.source.page}`);
  if (![7, 8, 9, 10].includes(m.source.page)) e.push(`page ${m.source.page} hors des tableaux`);
  return e;
}

describe("les mesures du permis de feu citent la brochure INRS ED 6030", () => {
  it("il y a des mesures dans chaque étape — sinon rien n'est contrôlé", () => {
    for (const g of ["avant", "pendant", "apres"] as const)
      expect(MESURES_PERMIS_FEU.filter((m) => m.groupe === g).length, g).toBeGreaterThan(0);
  });

  it.each(MESURES_PERMIS_FEU.map((m) => [m.id, m] as const))(
    "%s : le libellé et l'explication sont l'action et le commentaire de la brochure",
    (_id, m) => {
      expect(ecartsALaSource(m)).toEqual([]);
    },
  );

  it("aucun identifiant retiré n'est réemployé : un permis existant garde le sens de ce qu'il porte", () => {
    const courants = new Set(MESURES_PERMIS_FEU.map((m) => m.id));
    expect(MESURES_RETIREES.filter((m) => courants.has(m.id)).map((m) => m.id)).toEqual([]);
    const tous = [...MESURES_PERMIS_FEU, ...MESURES_RETIREES].map((m) => m.id);
    expect(new Set(tous).size).toBe(tous.length);
  });

  it("une mesure retirée se lit encore sur un permis qui la porte, avec son libellé d'origine", () => {
    expect(mesureParId("zone-degagee-5m")?.libelle).toBe(
      "Éloigner ou protéger les matériaux inflammables dans un rayon de 5 m",
    );
    for (const m of MESURES_RETIREES) {
      expect(mesureParId(m.id)?.libelle, m.id).toBe(m.libelle);
      expect(m.motif.trim(), m.id).not.toBe("");
    }
  });
});

/** La forme de comparaison du relevé (`releve-ed6030.ts`). */
const formeDeComparaison = (t: string) =>
  t.replace(/\u00ad/g, "").replace(/[’]/g, "'").replace(/•/g, " ").replace(/\s+/g, " ").trim();
const empreinte = (t: string) => createHash("sha256").update(formeDeComparaison(t)).digest("hex");

/** Les extraits de la source qu'aucun relevé du PDF ne connaît, à leur page. */
function horsReleve(m: MesurePermisFeu): string[] {
  const connu = (champ: "action" | "commentaire", page: number, t: string) =>
    RELEVES_ED6030.some((r) => r.champ === champ && r.page === page && r.sha256 === empreinte(t));
  const e: string[] = [];
  if (!connu("action", m.source.page, m.source.action)) e.push(`action p. ${m.source.page}`);
  if (m.source.commentaire) {
    const p = m.source.pageCommentaire ?? m.source.page;
    if (!connu("commentaire", p, m.source.commentaire)) e.push(`commentaire p. ${p}`);
  }
  return e;
}

describe("la SOURCE de chaque mesure est dans le relevé du PDF — un témoin qui ne vient pas du référentiel", () => {
  it.each(MESURES_PERMIS_FEU.map((m) => [m.id, m] as const))("%s", (_id, m) => {
    expect(horsReleve(m)).toEqual([]);
  });

  it("le relevé n'a pas d'extrait orphelin — sinon il ne garde plus rien", () => {
    const utilises = new Set(
      MESURES_PERMIS_FEU.flatMap((m) => [
        empreinte(m.source.action),
        ...(m.source.commentaire ? [empreinte(m.source.commentaire)] : []),
      ]),
    );
    expect(RELEVES_ED6030.filter((r) => !utilises.has(r.sha256))).toEqual([]);
  });
});

describe("la garde éprouvée en la cassant", () => {
  it("refuse une paraphrase écrite DANS LA SOURCE — les trois sondes de la contre-lecture", () => {
    // Avant ce relevé, les trois passaient : `inrs()` fabrique le libellé
    // depuis la source, et le test comparait la source à elle-même.
    const par = (id: string) => MESURES_PERMIS_FEU.find((m) => m.id === id)!;
    const sondes: MesurePermisFeu[] = [
      { ...par("eloignement-combustibles-10m"), source: { ...par("eloignement-combustibles-10m").source, commentaire: "Éloigner les produits et matières inflammables dans un rayon de 5 m du lieu d'intervention." } },
      { ...par("moyens-extinction-alarme"), source: { ...par("moyens-extinction-alarme").source, commentaire: "Ces moyens comprennent au minimum 1 extincteur de 6 litres à eau ou 1 CO2 de 5 kg." } },
      { ...par("ventilation-si-necessaire"), source: { ...par("ventilation-si-necessaire").source, action: "Coupure de la ventilation des zones de travail et/ou des locaux attenants" } },
    ];
    for (const s of sondes) expect(horsReleve(s).length, s.id).toBeGreaterThan(0);
  });

  it("refuse les mesures qui contredisaient la brochure, telles qu'elles étaient écrites", () => {
    // Recopiées de `4096d0f`, rattachées à la ligne de la brochure qu'elles
    // prétendaient suivre.
    const eloignement = MESURES_PERMIS_FEU.find((m) => m.id === "eloignement-combustibles-10m")!;
    const extinction = MESURES_PERMIS_FEU.find((m) => m.id === "moyens-extinction-alarme")!;
    const ventilation = MESURES_PERMIS_FEU.find((m) => m.id === "ventilation-si-necessaire")!;
    for (const fautive of [
      {
        ...eloignement,
        libelle: "Éloigner ou protéger les matériaux inflammables dans un rayon de 5 m",
        explication: "Bois, cartons, textiles, plastiques, liquides inflammables. Bâcher avec bâche ignifugée si impossible.",
      },
      {
        ...extinction,
        libelle: "Extincteur(s) à portée immédiate (≤ 3 m)",
        explication: "Au minimum 1 extincteur à eau avec additif de 6 L ou 1 CO2 de 5 kg, selon les matériaux environnants.",
      },
      {
        ...ventilation,
        libelle: "Couper la ventilation / climatisation à proximité",
        explication: "Évite la dispersion d'étincelles et la propagation de fumées dans le bâtiment.",
      },
    ])
      expect(ecartsALaSource(fautive).length, fautive.libelle).toBeGreaterThan(0);
  });
});
