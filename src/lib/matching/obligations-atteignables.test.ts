// Aucune obligation du référentiel n'est MORTE : pour chacune, au moins un
// dossier que l'INSCRIPTION (onboardingSchema) et le FORMULAIRE D'ÉQUIPEMENT
// (equipementSchema + questionsTriEtatPour) laissent passer la fait naître.
// Les profils sont dérivés du code — schémas, énumérations, seuils lus dans
// le référentiel — jamais recopiés. La garde est éprouvée : une obligation
// sentinelle hors d'atteinte doit être déclarée morte ; et, dans le code, un
// refus de l'habitation ajouté à `onboardingSchema` (2026-09-28) a fait nommer
// les cinq obligations d'habitation comme mortes.
//
// Lent (~45 s) : quelques centaines de milliers de profils, tous passés par le
// schéma d'inscription — c'est ce qui le rend non recopié.
import { describe, expect, it } from "vitest";
import {
  obligationsConformite,
  porteurDe,
  estPorteeParSalarie,
  type Obligation,
} from "@/lib/referentiels/conformite";
import { evaluerObligation, matchTypologie } from "@/lib/matching";
import type { EquipementMatching, EtablissementMatching } from "@/lib/matching";
import { onboardingSchema } from "@/lib/onboarding/schema";
import { CATEGORIES_ERP, TYPE_ERP } from "@/lib/etablissements/schema";
import {
  CATEGORIES_AERATION,
  equipementSchema,
  questionsTriEtatPour,
  serialiserCaracteristiques,
} from "@/lib/equipements/schema";
import { FAMILLES_ESP } from "@/lib/equipements/esp";
import {
  CATEGORIES_EQUIPEMENT,
  TYPES_ERP_A_SOMMEIL_PLAUSIBLE,
} from "@/lib/referentiels/types-communs";
import { cataloguerTitres } from "@/lib/salaries/catalogue";

const tri = [undefined, true, false] as const;
const form = (v: boolean | undefined) => (v === true ? "oui" : v === false ? "non" : "");

/** Les seuils lus dans le référentiel, et leurs voisins immédiats. */
function valeursAuxSeuils(cle: "effectifMin" | "effectifMax" | "personnesPresentesMin") {
  const s = new Set<number>([0, 1]);
  for (const o of obligationsConformite) {
    const v = o.typologies[cle];
    if (typeof v === "number") [v - 1, v, v + 1].forEach((x) => x >= 0 && s.add(x));
  }
  return [...s];
}

let PROFILS: EtablissementMatching[] | null = null;
function profilsInscription(): EtablissementMatching[] {
  if (PROFILS) return PROFILS;
  const eff = [...new Set([...valeursAuxSeuils("effectifMin"), ...valeursAuxSeuils("effectifMax")])];
  const pers = [undefined, ...valeursAuxSeuils("personnesPresentesMin").filter((x) => x >= 1)];
  const erps: ({ t: string; c: string } | null)[] = [null];
  for (const t of TYPE_ERP) for (const c of CATEGORIES_ERP) erps.push({ t, c });
  const out: EtablissementMatching[] = [];
  for (const trav of [true, false]) for (const erp of erps) for (const igh of [true, false])
  for (const hab of [true, false]) for (const es of eff) for (const ee of eff) for (const p of pers)
  for (const m of tri) for (const ch of tri) {
    const plausible = erp !== null && (TYPES_ERP_A_SOMMEIL_PLAUSIBLE as readonly string[]).includes(erp.t);
    for (const so of plausible ? tri : [undefined]) {
      const r = onboardingSchema.safeParse({
        raisonSociale: "X", adresse: "1 rue A, 75001 Paris", codeNaf: "56.10A",
        effectifSurSite: es, effectifEntreprise: ee,
        estEtablissementTravail: trav, estERP: erp !== null, estIGH: igh, estHabitation: hab,
        typeErp: erp?.t, categorieErp: erp?.c,
        comporteLocauxSommeilPublic: form(so), manipuleMatieresR422722: form(m),
        chiffonsImpregnes: form(ch), personnesPresentesHabituellement: p ?? "",
      });
      if (!r.success) continue;
      const d = r.data;
      out.push({
        id: "e", effectifSurSite: d.effectifSurSite, effectifEntreprise: d.effectifEntreprise,
        estEtablissementTravail: d.estEtablissementTravail, estERP: d.estERP, estIGH: d.estIGH,
        estHabitation: d.estHabitation, typeErp: d.typeErp ?? null, categorieErp: d.categorieErp ?? null,
        // Ni l'inscription ni la fiche ne posent ces deux questions (2026-09-03).
        classeIgh: null, familleHabitation: null,
        personnesPresentesHabituellement: d.personnesPresentesHabituellement ?? null,
        manipuleMatieresR422722: d.manipuleMatieresR422722 ?? null,
        comporteLocauxSommeilPublic: d.comporteLocauxSommeilPublic ?? null,
        chiffonsImpregnes: d.chiffonsImpregnes ?? null,
      });
    }
  }
  PROFILS = out;
  return out;
}

/** Chaque combinaison de précisions que le formulaire d'équipement pose. */
function equipementsDuFormulaire(estERP: boolean): EquipementMatching[] {
  const out: EquipementMatching[] = [];
  for (const cat of CATEGORIES_EQUIPEMENT) {
    let combos: Record<string, unknown>[] = [{}];
    const mult = (k: string, vs: unknown[]) => { combos = combos.flatMap((c) => vs.map((v) => ({ ...c, [k]: v }))); };
    for (const q of questionsTriEtatPour(cat, estERP)) mult(q.champ, [undefined, "oui", "non"]);
    const aer = CATEGORIES_AERATION.includes(cat);
    mult("estLocalPollutionSpecifique", aer ? [true, false] : [false]);
    mult("aSystemeDeRecyclage", aer ? [true, false] : [false]);
    if (cat === "VMC") mult("nbVehiculesParkingCouvert", [undefined, 0, 250, 251]);
    if (cat === "EQUIPEMENT_SOUS_PRESSION") mult("familleEsp", [undefined, ...FAMILLES_ESP]);
    for (const c of combos) {
      const r = equipementSchema.safeParse({ libelle: "x", categorie: cat, ...c });
      if (!r.success) continue;
      out.push({ id: `${cat}-${out.length}`, libelle: cat, categorie: cat, caracteristiques: serialiserCaracteristiques(r.data) });
    }
  }
  return out;
}

function obligationsMortes(source: Obligation[]): string[] {
  const profils = profilsInscription();
  const eqs = { true: equipementsDuFormulaire(true), false: equipementsDuFormulaire(false) };
  return source
    .filter((o) => porteurDe(o) !== "salarie")
    .filter((o) => !profils.some((e) =>
      matchTypologie(o.typologies, e).ok && evaluerObligation(o, e, eqs[`${e.estERP}`]) !== null))
    .map((o) => o.id);
}

describe("aucune obligation morte (maillon 2)", () => {
  it("établissement et équipement : chaque obligation naît d'un dossier que l'inscription accepte", () => {
    expect(obligationsMortes(obligationsConformite)).toEqual([]);
  }, 300_000);

  it("salarié : chaque obligation portée par un salarié est un titre déclarable", () => {
    const catalogue = new Set(cataloguerTitres().map((o) => o.id));
    const hors = obligationsConformite.filter(estPorteeParSalarie).filter((o) => !catalogue.has(o.id));
    expect(hors.map((o) => o.id)).toEqual([]);
  });

  it("la garde voit une obligation hors d'atteinte (éprouvée en la cassant)", () => {
    const modele = obligationsConformite.find((o) => porteurDe(o) === "equipement")!;
    const sentinelle = {
      ...modele,
      id: "SENTINELLE",
      // Une précision que le formulaire ne pose jamais pour cette catégorie.
      categoriesEquipement: ["BAES"],
      conditions: [{ type: "equipement_propriete_booleenne", categorie: "BAES", propriete: "estVmcGaz", valeur: true }],
    } as unknown as Obligation;
    expect(obligationsMortes([sentinelle])).toEqual(["SENTINELLE"]);
  }, 300_000);
});
