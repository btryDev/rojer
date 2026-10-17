// L'annexe « Ce que Rojer ne suit pas » du PDF du référentiel complet
// (2026-10-17, ADR-046). Le texte d'un PDF rendu ne se lit pas (flux
// compressés) : on lit l'arbre que le composant rend (`arbre-rendu.test-utils`).
// Le composant n'a aucun sous-composant, exprès, pour que rien n'échappe.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Text } from "@react-pdf/renderer";
import {
  MENTION_NIVEAU_AUDIT,
  obligationsConformite,
} from "@/lib/referentiels/conformite";
import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import { detailHorsPage } from "@/lib/perimetre/detail-hors-page";
import { elementsDansLOrdre, texteDirect } from "./arbre-rendu.test-utils";
import { AnnexeCeQueRojerNeSuitPas } from "./AnnexeCeQueRojerNeSuitPas";
import { pourHelvetica as t } from "./textes-grille-relecture";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const detail = detailHorsPage();
const PIED = <Text>pied</Text>;
const noeuds = elementsDansLOrdre(
  AnnexeCeQueRojerNeSuitPas({ stylePage: {}, piedDePage: PIED, detail }),
);
const textes = noeuds.map(texteDirect).filter((x) => x !== "");
const tout = textes.join("\n");

describe("l'annexe imprime le détail que la page ne montre plus", () => {
  it("chaque annonce : sa référence, son intitulé, sa phrase, la phrase de la page", () => {
    for (const d of detail.annonces) {
      expect(textes, d.titre).toContain(t(d.titre));
      expect(textes, d.cle).toContain(t(`Sur la page : ${d.phrasePage}`));
      if (d.phrase) expect(textes, d.cle).toContain(t(d.phrase));
      for (const a of d.articles) {
        expect(textes, a.ref).toContain(t(a.ref));
        if (a.intitule) expect(textes, a.ref).toContain(t(a.intitule));
        if (a.phrase) expect(textes, a.ref).toContain(t(a.phrase));
      }
    }
  });

  it("chaque obligation au niveau audit : « Audit », le libellé, la référence, le geste", () => {
    const n = obligationsConformite.filter(estNiveauAudit).length;
    expect(n).toBeGreaterThan(0);
    expect(textes.filter((x) => x === MENTION_NIVEAU_AUDIT)).toHaveLength(n);
    for (const l of detail.niveauAudit) {
      expect(textes, l.id).toContain(t(l.libelle));
      expect(textes, l.id).toContain(t(l.reference));
      expect(textes, l.id).toContain(t(l.geste));
    }
  });

  it("les refus, mot pour mot, et les cinq familles", () => {
    expect(detail.refus.length).toBeGreaterThan(0);
    for (const r of detail.refus) {
      expect(textes).toContain(t(r.regime));
      expect(textes).toContain(t(r.message));
      expect(textes).toContain(t(r.indication));
    }
    for (const f of detail.familles) expect(textes).toContain(t(f.phrase));
  });

  it("chaque article écarté, avec son motif quand la lecture l'a écrit", () => {
    let n = 0;
    for (const e of detail.exclusions) {
      expect(textes).toContain(t(e.motif));
      for (const a of e.articles) {
        n++;
        expect(textes, a.ref).toContain(t(a.intitule ? `${a.ref} — ${a.intitule}` : a.ref));
        if (a.motif) expect(textes, a.ref).toContain(t(a.motif));
      }
    }
    expect(n).toBeGreaterThan(400);
  });

  it("chaque page porte le pied de page du script", () => {
    const pages = noeuds.filter((x) => x.type === "PAGE");
    expect(pages.length).toBeGreaterThan(0);
    // Le pied est un enfant direct de chaque page.
    for (const p of pages) {
      const enfants = [p.props.children].flat(3);
      expect(enfants).toContain(PIED);
      expect(p.props.orientation).toBe("landscape");
    }
  });

  it("aucun nom de personne, aucune couleur hors charte", () => {
    const source = readFileSync(join(RACINE, "src", "lib", "pdf", "AnnexeCeQueRojerNeSuitPas.tsx"), "utf8");
    expect(source).not.toMatch(/#[0-9a-f]{3,6}\b/i);
    expect(tout).not.toMatch(/Julien|Paloma/);
  });
});

describe("le script de la grille fait l'insertion, une fois, à la fin du document", () => {
  const script = readFileSync(join(RACINE, "scripts", "generer-grille-equipements.tsx"), "utf8");

  it("importe l'annexe et la rend dans la grille, juste avant </Document>, avec le style et le pied du script", () => {
    expect(script).toMatch(
      /import \{ AnnexeCeQueRojerNeSuitPas \} from "@\/lib\/pdf\/AnnexeCeQueRojerNeSuitPas";/,
    );
    const usages = [...script.matchAll(/<AnnexeCeQueRojerNeSuitPas\b/g)];
    expect(usages).toHaveLength(1);
    const debut = script.indexOf("function GrilleDocument(");
    const fin = script.indexOf("</Document>", debut);
    const ou = usages[0].index!;
    expect(ou).toBeGreaterThan(debut);
    expect(ou).toBeLessThan(fin);
    // Rien d'autre que des blancs entre l'annexe et la fin du document.
    const apres = script.slice(script.lastIndexOf("/>", fin) + 2, fin);
    expect(script.slice(ou, script.lastIndexOf("/>", fin))).not.toMatch(/\n\s*</);
    expect(apres.trim()).toBe("");
    expect(script.slice(ou, fin)).toMatch(/stylePage=\{stylePage\}/);
    expect(script.slice(ou, fin)).toMatch(/piedDePage=\{<PiedDePage \/>\}/);
  });

  it("pas dans le dossier détaillé", () => {
    const dossier = script.slice(script.indexOf("function DossierDetaille("));
    expect(dossier).not.toContain("AnnexeCeQueRojerNeSuitPas");
  });
});
