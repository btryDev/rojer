// Parité page ↔ PDF (2026-10-17, ADR-046, plan § 4).
//
// LA RÈGLE DU LOT : TOUT CE QUI SORT DE LA PAGE « Ce que Rojer ne couvre
// pas » VA DANS LE PDF DU RÉFÉRENTIEL COMPLET. La page est passée d'environ
// cinq cents éléments à environ vingt-cinq ; sans cette garde, ce qui n'est
// plus à l'écran pourrait cesser d'être dit nulle part sans que personne le
// voie.
//
// L'INVENTAIRE est figé (`inventaire-page-a493461c.ts`) : les clés que la page
// de main a493461c pouvait afficher, produites EN APPELANT son code, jamais au
// grep. Chacune doit être dite aujourd'hui par la page OU par l'annexe du PDF
// (`detailHorsPage`), sauf celles de `SORTIS`.
//
// `SORTIS` — ce qui a quitté la page ET le PDF, par décision. Une entrée
// s'y ajoute avec sa date et sa raison, ne s'efface jamais : quand elle cesse
// d'être vraie (la clé est revenue), elle se raye en commentaire et sort du
// tableau, datée — règle 11. Une entrée vivante dont la clé est encore dite
// fait tomber le test : un aveu mort se retire.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CORPUS } from "@/lib/referentiels/corpus";
import { ADRESSE_MANQUES_ANNONCES } from "@/lib/referentiels/corpus/adresses";
import { clesDuDetail, detailHorsPage } from "./detail-hors-page";
import { FAMILLES_NON_GEREES } from "./familles-non-gerees";
import { INVENTAIRE_PAGE_A493461C } from "./inventaire-page-a493461c";
import {
  DOSSIER_QUI_N_ECARTE_RIEN,
  manquesAnnoncesDuDossier,
  TITRE_ANNONCES,
} from "./manques-annonces";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const lire = (...p: string[]) => readFileSync(join(RACINE, ...p), "utf8");

/**
 * Ce qui a quitté la page ET le PDF. Vide au 2026-10-17 : tout ce que la page
 * cesse de dire est à l'annexe.
 *
 * Forme d'une entrée : `{ cle, le: "AAAA-MM-JJ", raison }`.
 */
const SORTIS: readonly { cle: string; le: string; raison: string }[] = [];

/**
 * Ce que la page peut dire, tous dossiers confondus : les domaines et les
 * annonces du dossier qui n'écarte rien (chaque condition y est vraie), et les
 * familles. Les obligations hors du quotidien ne s'y comptent pas : la page
 * les nomme au dossier qu'elles concernent, l'annexe les porte toutes.
 */
function clesDeLaPage(): Set<string> {
  const cles = new Set<string>();
  for (const d of manquesAnnoncesDuDossier(CORPUS, DOSSIER_QUI_N_ECARTE_RIEN)) {
    cles.add(`domaine:${d.cle}`);
    for (const a of d.articles) cles.add(`annonce:${a.ref}`);
  }
  for (const f of FAMILLES_NON_GEREES) cles.add(`famille:${f.cle}`);
  return cles;
}

describe("parité page ↔ PDF : rien de ce que la page disait ne se perd", () => {
  const detail = detailHorsPage();
  const pdf = clesDuDetail(detail);
  const page = clesDeLaPage();
  const sortis = new Set(SORTIS.map((s) => s.cle));

  it("l'inventaire figé est celui de la page d'avant, et il est gros", () => {
    // Borne basse : un inventaire vidé rendrait la garde verte sans rien
    // garder. 513 clés à a493461c, dont 453 articles écartés.
    expect(INVENTAIRE_PAGE_A493461C.length).toBeGreaterThan(400);
    for (const prefixe of ["domaine:", "annonce:", "audit:", "refus:", "exclusion:", "ecarte:"]) {
      expect(
        INVENTAIRE_PAGE_A493461C.some((c) => c.startsWith(prefixe)),
        prefixe,
      ).toBe(true);
    }
  });

  it("chaque clé de l'inventaire est dite par la page ou par le PDF", () => {
    const perdues = INVENTAIRE_PAGE_A493461C.filter(
      (c) => !page.has(c) && !pdf.has(c) && !sortis.has(c),
    );
    expect(
      perdues,
      `${perdues.length} élément(s) que la page disait et que ni la page ni l'annexe du PDF ne disent plus. ` +
        `Les remettre dans l'annexe (\`detail-hors-page.ts\`), ou les inscrire dans SORTIS, datés, sur décision.`,
    ).toEqual([]);
  });

  it("ce qui a quitté la page est dans le PDF : refus, articles écartés, niveau audit", () => {
    // Couche voisine : la garde précédente passerait si la page disait tout
    // encore. Ces familles de clés ne sont PLUS sur la page (décision c6) ;
    // elles doivent être au PDF.
    for (const c of INVENTAIRE_PAGE_A493461C) {
      if (/^(refus|exclusion|ecarte|audit):/.test(c)) {
        expect(page.has(c), c).toBe(false);
        expect(pdf.has(c) || sortis.has(c), c).toBe(true);
      }
    }
  });

  it("SORTIS ne garde que des aveux vivants", () => {
    for (const s of SORTIS) {
      expect(INVENTAIRE_PAGE_A493461C, s.cle).toContain(s.cle);
      expect(page.has(s.cle) || pdf.has(s.cle), `${s.cle} est encore dite : rayer l'entrée`).toBe(false);
      expect(s.le).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.raison.trim()).not.toBe("");
    }
  });

  it("le PDF porte le détail : références, phrases, « Audit »", () => {
    for (const d of detail.annonces) {
      for (const a of d.articles) {
        expect(a.ref.trim(), d.cle).not.toBe("");
        expect(a.corpus.trim(), a.ref).not.toBe("");
        expect(a.phrase ?? d.phrase ?? a.intitule, `${a.ref} : ni phrase ni intitulé`).toBeTruthy();
      }
    }
    for (const l of detail.niveauAudit) {
      expect(l.mention, l.id).toBe("Audit");
      expect(l.reference.trim(), l.id).not.toBe("");
    }
    for (const e of detail.exclusions) {
      expect(e.motif.trim(), e.cle).not.toBe("");
    }
  });
});

describe("l'adresse des annonces reste une adresse de PAGE", () => {
  it("elle nomme la page et le titre que la page rend, jamais le PDF", () => {
    expect(ADRESSE_MANQUES_ANNONCES).toContain("Page « Ce que Rojer ne couvre pas »");
    expect(ADRESSE_MANQUES_ANNONCES).toContain(`« ${TITRE_ANNONCES} »`);
    expect(ADRESSE_MANQUES_ANNONCES).not.toMatch(/PDF|annexe|référentiel complet|grille/i);
  });
});

describe("la page « Ce que Rojer ne couvre pas » (source)", () => {
  // Composant serveur qui lit la base : on lit sa source.
  const source = lire("src", "app", "etablissements", "[id]", "perimetre", "page.tsx");
  // Le code, sans les commentaires (qui racontent la refonte et nomment donc
  // ce que la page n'appelle plus).
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !/^\s*\/\//.test(l))
    .join("\n");
  // Ce qui s'affiche : le code, sans les imports.
  const affiche = code
    .split("\n")
    .filter((l) => !/^\s*(?:import\b|\}\s*from\b)/.test(l))
    .join("\n");

  it("n'appelle plus les refus ni les exclusions, ni le détail du PDF", () => {
    for (const nom of [
      "exclusionsDeclarees",
      "refusAlEntree",
      "detailHorsPage",
      "detail-hors-page",
      "AnnexeCeQueRojerNeSuitPas",
      "toutesLesAnnonces",
    ]) {
      expect(code, nom).not.toContain(nom);
    }
  });

  it("n'affiche des annonces que la phrase faite des sujets — ni référence, ni corpus, ni phrase détaillée", () => {
    expect(affiche).toContain("d.phrasePage");
    expect(affiche).not.toMatch(/\.articles\b|\ba\.ref\b|\.corpus\b|d\.phrase\b(?!Page)/);
  });

  it("dit les cinq familles", () => {
    expect(affiche).toContain("FAMILLES_NON_GEREES.map");
  });

  it("une ligne séparée par `divide-y` occupe toute la carte (pas de `max-w` sur ses `li`)", () => {
    // Revue du 2026-10-17 : un `max-w-[80ch]` sur les `li` raccourcissait le
    // filet de séparation à la largeur du texte.
    for (const m of affiche.matchAll(/<li\b[\s\S]*?>/g)) {
      expect(m[0], m[0]).not.toMatch(/max-w-/);
    }
  });

  it("ne renvoie jamais au PDF, que le dirigeant ne reçoit pas", () => {
    expect(affiche).not.toMatch(/PDF|annexe|référentiel complet|grille de relecture/i);
  });
});
