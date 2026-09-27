import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  determineObligationsApplicables,
  type EquipementMatching,
  type EtablissementMatching,
  type ObligationApplicable,
} from "./index";
import { POLITIQUE_ABSENCE, type AttributNullable } from "./absence";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import {
  CATEGORIES_EQUIPEMENT,
  CATEGORIES_ERP,
  TYPES_ERP,
} from "@/lib/referentiels/types-communs";

/**
 * LA GARDE GÉNÉRIQUE DE LA RÉPONSE ABSENTE (analyse du 2026-09-27, étape 4).
 *
 * Pour TOUT attribut d'établissement que le moteur lit et qui admet `null` —
 * la liste vient de `POLITIQUE_ABSENCE`, que le compilateur tient complète —,
 * et pour chacune des valeurs que la table déclare : passer de la valeur à
 * `null` ne doit retirer aucune ligne, sauf là où la table déclare une règle
 * écrite qui le permet. Et une ligne qu'un « non » retire, mais que le silence
 * retient, doit porter une marque « à confirmer ».
 *
 * Rien n'est recopié : les attributs et leurs domaines viennent de la table,
 * les profils sont engendrés depuis les énumérations du référentiel, et chaque
 * verdict vient d'un appel du moteur. Un échec NOMME l'attribut, la valeur, la
 * ligne et le profil.
 *
 * Éprouvée en réintroduisant les deux violations de la contre-vérification du
 * 2026-09-27 — (a) la contrainte en base retirée : le moteur écarte alors une
 * catégorie absente que plus rien n'interdit ; (b) les matières muettes lues
 * « non » : elle rougit à chaque fois en nommant l'attribut.
 */

type Etab = EtablissementMatching;

const base = (over: Partial<Etab>): Etab => ({
  id: "e",
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
  ...over,
});

/** Un appareil de chaque catégorie, sans précision : les lignes bornées par catégorie d'équipement apparaissent. */
const PARC: EquipementMatching[] = CATEGORIES_EQUIPEMENT.map((c) => ({
  id: `eq-${c}`,
  libelle: c,
  categorie: c,
  caracteristiques: null,
}));

/** Deux contextes pour les autres réponses : tout muet, et tout répondu « non » sous le seuil. */
const CONTEXTES: Partial<Etab>[] = [
  {},
  {
    manipuleMatieresR422722: false,
    chiffonsImpregnes: false,
    comporteLocauxSommeilPublic: false,
    personnesPresentesHabituellement: 30,
  },
];

function profils(): { nom: string; e: Etab }[] {
  const out: { nom: string; e: Etab }[] = [];
  for (const eff of [8, 60]) {
    for (const [i, ctx] of CONTEXTES.entries()) {
      const c = (e: Partial<Etab>) => base({ effectifSurSite: eff, effectifEntreprise: eff, ...ctx, ...e });
      out.push({ nom: `travail seul, ${eff}, contexte ${i}`, e: c({}) });
      for (const t of TYPES_ERP)
        for (const cat of CATEGORIES_ERP)
          out.push({ nom: `ERP ${t} ${cat}, ${eff}, contexte ${i}`, e: c({ estERP: true, typeErp: t, categorieErp: cat }) });
      out.push({ nom: `ERP sans salariés N N5, contexte ${i}`, e: c({ estEtablissementTravail: false, estERP: true, typeErp: "N", categorieErp: "N5", effectifSurSite: 0, effectifEntreprise: 0 }) });
      out.push({ nom: `IGH, ${eff}, contexte ${i}`, e: c({ estIGH: true }) });
      out.push({ nom: `habitation, contexte ${i}`, e: c({ estHabitation: true, estEtablissementTravail: false, effectifSurSite: 0, effectifEntreprise: 0 }) });
    }
  }
  return out;
}

function lignes(r: ObligationApplicable[]): Map<string, ObligationApplicable> {
  const m = new Map<string, ObligationApplicable>();
  for (const o of r) {
    if (o.porteur === "equipement") {
      for (const e of o.equipementsConcernes) m.set(`${o.obligation.id}@${e.categorie}`, o);
    } else m.set(o.obligation.id, o);
  }
  return m;
}

const marquee = (o: ObligationApplicable) =>
  (o.sansReponse?.length ?? 0) > 0 || o.effectifAConfirmer !== undefined;

function contraintesEnBase(): string {
  const dir = join(process.cwd(), "prisma", "migrations");
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      try {
        return readFileSync(join(dir, d.name, "migration.sql"), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");
}

const ATTRIBUTS = Object.keys(POLITIQUE_ABSENCE) as AttributNullable[];

describe("garde générique : une réponse absente ne retire rien en silence", () => {
  const PROFILS = profils();
  const SQL = contraintesEnBase();

  it("la table couvre des attributs, et la garde des profils (bornes basses)", () => {
    expect(ATTRIBUTS.length).toBeGreaterThan(0);
    expect(PROFILS.length).toBeGreaterThan(100);
  });

  it.each(ATTRIBUTS)("%s", (attr) => {
    const p = POLITIQUE_ABSENCE[attr];
    const violations: string[] = [];

    if (p.sens === "ecarte_par_regle_ecrite" && !SQL.includes(`ADD CONSTRAINT "${p.contrainteEnBase}"`)) {
      violations.push(
        `${attr} : la table déclare que l'absence écarte parce que la base l'interdit, mais la contrainte « ${p.contrainteEnBase} » n'est dans aucune migration`,
      );
    }

    for (const { nom, e } of PROFILS) {
      const aNull = lignes(determineObligationsApplicables({ ...e, [attr]: null }, PARC));
      for (const v of p.valeurs) {
        const aV = lignes(determineObligationsApplicables({ ...e, [attr]: v }, PARC));

        // 1. Rien ne disparaît au silence, sauf règle écrite déclarée.
        for (const [cle, ligne] of aV) {
          if (aNull.has(cle)) continue;
          if (p.sens === "ecarte_par_regle_ecrite" && p.portee(e) && SQL.includes(`ADD CONSTRAINT "${p.contrainteEnBase}"`)) continue;
          if ("exception" in p && p.exception.si(e)) continue;
          if ("allegement" in p && p.allegement.si(ligne.obligation.typologies)) continue;
          violations.push(`${attr} : passer de ${JSON.stringify(v)} à null retire « ${cle} » (${nom})`);
        }

        // 2. Ce qu'un « non » retire et que le silence retient se dit.
        if (v === false) {
          for (const [cle, ligne] of aNull) {
            if (!aV.has(cle) && !marquee(ligne)) {
              violations.push(`${attr} : « ${cle} » retenue sur le silence sans marque « à confirmer » (${nom})`);
            }
          }
        }
      }
    }

    // Un échec nomme les cinq premières violations — l'attribut en tête.
    expect(violations.slice(0, 5), `${violations.length} violation(s)`).toEqual([]);
  });
});

describe("garde générique : les précisions d'équipement", () => {
  // Les conditions d'équipement portent déjà leur sens par leur TYPE
  // (`conditionSatisfaite`, engine.ts) : `non_infirmee`, `infirmee` et
  // `enum_differente` survivent à l'absence ; `numerique`, `booleenne` et
  // `enum_egale` sont des opt-in — une propriété d'équipement absente dit « cet
  // appareil n'a pas cette caractéristique » (règle du non-renseigné,
  // `.claude/CLAUDE.md`). La garde vérifie la première moitié, sur chaque
  // condition du référentiel, en appelant le moteur.
  const SURVIVENT = new Set(["equipement_propriete_non_infirmee", "equipement_propriete_infirmee", "equipement_propriete_enum_differente"]);
  const bureau = base({ effectifSurSite: 60, effectifEntreprise: 60 });

  it("une condition qui porte la règle générale survit à la précision absente", () => {
    const violations: string[] = [];
    for (const o of obligationsConformite) {
      const conds = "conditions" in o ? (o.conditions ?? []) : [];
      for (const c of conds) {
        if (!SURVIVENT.has(c.type)) continue;
        const valeurs: unknown[] = "valeur" in c ? [c.valeur, "__autre__"] : [true, false];
        for (const v of valeurs) {
          const avec = determineObligationsApplicables(bureau, [{ id: "x", libelle: "x", categorie: c.categorie, caracteristiques: { [c.propriete]: v } }]).some((a) => a.obligation.id === o.id);
          const sans = determineObligationsApplicables(bureau, [{ id: "x", libelle: "x", categorie: c.categorie, caracteristiques: {} }]).some((a) => a.obligation.id === o.id);
          if (avec && !sans) violations.push(`${c.categorie}.${c.propriete} : absente, « ${o.id} » disparaît`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
