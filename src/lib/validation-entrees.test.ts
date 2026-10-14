// ASVS 5.0.0 V2.2.1 — les entrées des Server Actions sont validées CÔTÉ
// SERVEUR, sur le vrai code. Chaque cas reprend une sonde de l'audit du
// 2026-10-13 (une entrée hostile écrite telle quelle), et la double de son cas
// légitime : une borne qui refuserait aussi la saisie normale ne serait pas une
// correction.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { ecritures, enregistrer, prescription } = vi.hoisted(() => {
  const ecritures: { modele: string; op: string; args: unknown }[] = [];
  const enregistrer = (modele: string, op: string) =>
    async (args: unknown) => {
      ecritures.push({ modele, op, args });
      return op === "createMany" ? { count: (args as { data: unknown[] }).data.length } : { id: "x" };
    };
  const prescription = { dateDocument: new Date("2020-01-01T00:00:00Z") };
  return { ecritures, enregistrer, prescription };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    uniteTravail: { update: enregistrer("uniteTravail", "update") },
    equipement: { createMany: enregistrer("equipement", "createMany") },
    // Le régime lu par le pré-remplissage (2026-10-14) : aucun établissement
    // rendu, l'action retombe sur le régime de travail.
    etablissement: { findUnique: async () => null },
    prescriptionParticuliere: {
      findFirst: async () => prescription,
      update: enregistrer("prescriptionParticuliere", "update"),
    },
    action: {
      create: enregistrer("action", "create"),
      update: enregistrer("action", "update"),
    },
  },
}));
vi.mock("@/lib/auth/scope", async (orig) => ({
  ...(await orig<object>()),
  requireUnite: async () => ({ duerpId: "duerp1" }),
  requireRisque: async () => ({ duerpId: "duerp1", uniteId: "u1", etablissementId: "etab1" }),
  requireMesure: async () => ({ action: { echeance: null, leveeLe: null, risqueId: null } }),
  assertEtablissementOwnership: async () => undefined,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }));
vi.mock("@/lib/batiments/queries", async (orig) => ({
  ...(await orig<object>()),
  batimentParDefaut: async () => ({ id: "bat1" }),
}));
vi.mock("@/lib/calendrier/regeneration-sure", async (orig) => ({
  ...(await orig<object>()),
  regenererApresMutation: async () => true,
}));

import { renommerUnite, declarerAucunRisque } from "@/lib/duerps/actions";
import { creerEquipementsDepuisPreRemplissage } from "@/lib/equipements/actions";
import { suggererEquipements } from "@/lib/equipements/pre-remplissage";
import { questionsExigeesPour, REGIME_TRAVAIL } from "@/lib/equipements/reponses-exigees";
import { entrepriseSchema, entrepriseCreationSchema } from "@/lib/entreprises/schema";
import { leverPrescription } from "@/lib/prescriptions/actions";
import { ajouterMesureCustom, modifierMesure } from "@/lib/mesures/actions";
import { CATEGORIES_EQUIPEMENT, estCategorieEpi, type CategorieEquipement } from "@/lib/referentiels/types-communs";
import { prescriptionRenforceSchema } from "@/lib/prescriptions/schema";
import { salarieSchema } from "@/lib/salaries/schema";
import { equipementSchema } from "@/lib/equipements/schema";
import { permisFeuSchema } from "@/lib/permis-feu/schema";

beforeEach(() => {
  ecritures.length = 0;
});

const ecrit = (modele: string) => ecritures.filter((e) => e.modele === modele);

describe("renommerUnite — même borne que la création (100 caractères)", () => {
  it("refuse un nom d'1 Mo et n'écrit rien", async () => {
    await expect(renommerUnite("u1", "A".repeat(1_000_000))).rejects.toThrow();
    expect(ecrit("uniteTravail")).toHaveLength(0);
  });
  it("refuse 101 caractères, accepte 100", async () => {
    await expect(renommerUnite("u1", "A".repeat(101))).rejects.toThrow();
    expect(ecrit("uniteTravail")).toHaveLength(0);
    await renommerUnite("u1", `  ${"B".repeat(100)}  `);
    expect((ecrit("uniteTravail")[0].args as { data: { nom: string } }).data.nom).toBe("B".repeat(100));
  });
  it("refuse ce qui n'est pas une chaîne (point d'entrée réseau)", async () => {
    await expect(renommerUnite("u1", { nom: "x" } as never)).rejects.toThrow();
    expect(ecrit("uniteTravail")).toHaveLength(0);
  });
  it("un nom vide reste sans effet, comme avant", async () => {
    await renommerUnite("u1", "   ");
    expect(ecrit("uniteTravail")).toHaveLength(0);
  });
});

describe("declarerAucunRisque — justification bornée", () => {
  it("refuse une justification d'1 Mo et n'écrit rien", async () => {
    await expect(declarerAucunRisque("u1", "B".repeat(1_000_000))).rejects.toThrow();
    expect(ecrit("uniteTravail")).toHaveLength(0);
  });
  it("accepte une justification de 1000 caractères, avec ses retours à la ligne", async () => {
    const justif = `${"C".repeat(499)}\n${"D".repeat(500)}`;
    await declarerAucunRisque("u1", justif);
    expect((ecrit("uniteTravail")[0].args as { data: { aucunRisqueJustif: string } }).data.aucunRisqueJustif).toBe(justif);
  });
  it("`null` retire toujours la déclaration", async () => {
    await declarerAucunRisque("u1", null);
    expect((ecrit("uniteTravail")[0].args as { data: { aucunRisqueJustif: null } }).data.aucunRisqueJustif).toBeNull();
  });
});

describe("creerEquipementsDepuisPreRemplissage — une entrée par catégorie au plus", () => {
  // [2026-10-14, intégration avec `lot/conditions-equipement`] : l'action refuse
  // désormais une catégorie sans les réponses exigées dans le régime lu (ici le
  // faux client ne rend aucun établissement : régime de travail). Les cas
  // acceptés les fournissent, comme le panneau.
  const reponses = (c: CategorieEquipement) =>
    Object.fromEntries(questionsExigeesPour(c, REGIME_TRAVAIL).map((q) => [q, false]));
  const nonEpi = CATEGORIES_EQUIPEMENT.filter((c) => !estCategorieEpi(c as CategorieEquipement));

  it("refuse 5 000 appareils en un appel et n'écrit rien", async () => {
    const entrees = Array.from({ length: 5000 }, () => ({ categorie: "EXTINCTEUR" as CategorieEquipement, libelle: "x" }));
    const r = await creerEquipementsDepuisPreRemplissage("etab1", entrees);
    expect(r.status).toBe("error");
    expect(ecrit("equipement")).toHaveLength(0);
  });
  it("refuse ce qui n'est pas un tableau d'objets, par un refus retourné et sans rien écrire", async () => {
    for (const forge of [{}, null, "x", [null], [42], [[]]]) {
      const r = await creerEquipementsDepuisPreRemplissage("etab1", forge as never);
      expect(r, JSON.stringify(forge)).toEqual({
        status: "error",
        message: "Sélection invalide : aucun équipement ajouté.",
      });
    }
    expect(ecrit("equipement")).toHaveLength(0);
  });
  it("refuse plus d'entrées que de catégories, même toutes distinctes", async () => {
    // Le plafond porte seul ce cas : sans lui, la porte des doublons ne dit
    // rien et la catégorie inconnue répond par un autre message.
    const entrees = Array.from({ length: CATEGORIES_EQUIPEMENT.length + 1 }, (_, i) => ({
      categorie: `CAT_${i}` as CategorieEquipement,
      libelle: "x",
    }));
    const r = await creerEquipementsDepuisPreRemplissage("etab1", entrees);
    expect(r).toEqual({ status: "error", message: "Sélection invalide : aucun équipement ajouté." });
    expect(ecrit("equipement")).toHaveLength(0);
  });
  it("refuse un libellé d'1 Mo", async () => {
    const r = await creerEquipementsDepuisPreRemplissage("etab1", [
      { categorie: nonEpi[0] as CategorieEquipement, libelle: "L".repeat(1_000_000) },
    ]);
    expect(r.status).toBe("error");
    expect(ecrit("equipement")).toHaveLength(0);
  });
  it("refuse deux entrées de la même catégorie, et une catégorie inconnue", async () => {
    const c = nonEpi[0] as CategorieEquipement;
    expect((await creerEquipementsDepuisPreRemplissage("etab1", [{ categorie: c, libelle: "a" }, { categorie: c, libelle: "b" }])).status).toBe("error");
    expect((await creerEquipementsDepuisPreRemplissage("etab1", [{ categorie: "INVENTEE" as CategorieEquipement, libelle: "a" }])).status).toBe("error");
    expect(ecrit("equipement")).toHaveLength(0);
  });
  it("accepte une entrée par catégorie, toutes catégories confondues", async () => {
    const entrees = nonEpi.map((c) => ({
      categorie: c as CategorieEquipement,
      libelle: `Appareil ${c}`,
      caracteristiques: reponses(c as CategorieEquipement),
    }));
    const r = await creerEquipementsDepuisPreRemplissage("etab1", entrees);
    expect(r).toMatchObject({ status: "success", created: nonEpi.length });
  });
  it("accepte tout ce que l'écran peut envoyer : les suggestions du pré-remplissage", async () => {
    for (const estERP of [true, false]) {
      for (const codeNaf of ["56.10A", "47.11B", "70.22Z", null]) {
        const suggestions = suggererEquipements({
          codeNaf, estEtablissementTravail: true, estERP, estIGH: true, estHabitation: true,
        });
        expect(suggestions.length).toBeGreaterThan(0);
        ecritures.length = 0;
        const entrees = suggestions
          .filter((s) => !estCategorieEpi(s.categorie))
          .map((s) => ({ categorie: s.categorie, libelle: s.libelle, caracteristiques: reponses(s.categorie) }));
        const r = await creerEquipementsDepuisPreRemplissage("etab1", entrees);
        expect(r, `${codeNaf} ERP=${estERP}`).toMatchObject({ status: "success", created: entrees.length });
      }
    }
  });
});

describe("entrepriseSchema — bornes de l'adresse et de l'effectif", () => {
  const base = { raisonSociale: "X", codeNaf: "56.10A", effectif: "3", adresse: "1 rue, 75000 Paris" };
  it("refuse une adresse d'1 Mo et un effectif de 10^12", () => {
    expect(entrepriseSchema.safeParse({ ...base, adresse: "a".repeat(1_000_000) }).success).toBe(false);
    expect(entrepriseSchema.safeParse({ ...base, effectif: "1000000000000" }).success).toBe(false);
  });
  it("borne l'effectif au type de la colonne (Int = int4), pas au seuil du produit", () => {
    expect(entrepriseSchema.safeParse({ ...base, effectif: "2147483647" }).success).toBe(true);
    expect(entrepriseSchema.safeParse({ ...base, effectif: "2147483648" }).success).toBe(false);
  });
  it("une entreprise existante qui passe 50 salariés reste modifiable ; la création, elle, refuse", () => {
    expect(entrepriseSchema.safeParse({ ...base, effectif: "60" }).success).toBe(true);
    expect(entrepriseCreationSchema.safeParse({ ...base, effectif: "60" }).success).toBe(false);
  });
  it("accepte une adresse de 300 caractères, refuse 301", () => {
    expect(entrepriseSchema.safeParse({ ...base, adresse: "a".repeat(300) }).success).toBe(true);
    expect(entrepriseSchema.safeParse({ ...base, adresse: "a".repeat(301) }).success).toBe(false);
  });
});

describe("leverPrescription — un jour civil réel, pas un motif", () => {
  const lever = (dateFin: string) => {
    const fd = new FormData();
    fd.set("dateFin", dateFin);
    return leverPrescription("etab1", "p1", { status: "idle" }, fd);
  };
  it("refuse « 2026-13-45 » (enregistré jusqu'ici comme le 2027-02-14)", async () => {
    const r = await lever("2026-13-45");
    expect(r.status).toBe("error");
    expect(ecrit("prescriptionParticuliere")).toHaveLength(0);
  });
  it("refuse le 29 février d'une année non bissextile", async () => {
    expect((await lever("2026-02-29")).status).toBe("error");
    expect(ecrit("prescriptionParticuliere")).toHaveLength(0);
  });
  it("accepte le 29 février d'une année bissextile", async () => {
    expect((await lever("2028-02-29")).status).toBe("success");
    expect(ecrit("prescriptionParticuliere")).toHaveLength(1);
  });
});

describe("dates des mesures du DUERP — aucun contrôle avant `new Date(v)`", () => {
  it("modifierMesure refuse une échéance qui n'est pas un jour réel", async () => {
    await expect(modifierMesure("m1", { echeance: "2026-02-30" })).rejects.toThrow();
    await expect(modifierMesure("m1", { echeance: "n'importe quoi" })).rejects.toThrow();
    expect(ecrit("action")).toHaveLength(0);
    await modifierMesure("m1", { echeance: "2026-02-28" });
    expect(ecrit("action")).toHaveLength(1);
  });
  it("ajouterMesureCustom refuse une échéance inexistante, accepte une vraie", async () => {
    const fd = (echeance: string) => {
      const f = new FormData();
      f.set("libelle", "Former");
      f.set("type", "formation");
      f.set("statut", "prevue");
      f.set("echeance", echeance);
      return f;
    };
    expect((await ajouterMesureCustom("r1", { status: "idle" }, fd("2026-04-31"))).status).toBe("error");
    expect(ecrit("action")).toHaveLength(0);
    expect((await ajouterMesureCustom("r1", { status: "idle" }, fd("2026-04-30"))).status).toBe("success");
  });
});

describe("schémas de saisie — une date qui n'existe pas est refusée", () => {
  it("prescriptions : date de l'acte", () => {
    const r = prescriptionRenforceSchema.safeParse({
      source: "arrete_municipal", reference: "A-1", dateDocument: "2025-02-29",
      periodicite: "annuelle", effet: "renforce_periodicite",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.dateDocument).toBeDefined();
  });
  it("salariés : date d'entrée", () => {
    const ko = salarieSchema.safeParse({ prenom: "A", nom: "B", entreLe: "2026-02-30" });
    expect(ko.success).toBe(false);
    expect(salarieSchema.safeParse({ prenom: "A", nom: "B", entreLe: "2026-02-28" }).success).toBe(true);
  });
  it("équipements : mise en service", () => {
    expect(equipementSchema.shape.dateMiseEnService.safeParse("2026-06-31").success).toBe(false);
    expect(equipementSchema.shape.dateMiseEnService.safeParse("2026-06-30").success).toBe(true);
  });
  it("permis de feu : une date-heure qui n'existe pas, ou à secondes, ne lève plus d'exception", () => {
    for (const v of ["2026-02-30T10:00", "2026-01-01T25:00", "2026-01-01T10:00:00"]) {
      expect(() => permisFeuSchema.safeParse({ dateDebut: v }), v).not.toThrow();
      const r = permisFeuSchema.safeParse({ dateDebut: v });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.flatten().fieldErrors.dateDebut, v).toBeDefined();
    }
  });
});

// LA CATÉGORIE, PAS L'OCCURRENCE. Un `.regex()` de date dans un schéma ne dit
// rien de l'existence du jour : chaque motif « AAAA-MM-JJ » posé en `.regex()`
// doit être suivi, dans la même chaîne, du prédicat qui la vérifie. Le relevé
// lit les sources : un schéma ajouté demain sans le prédicat fait échouer ce test.
describe("aucune date de saisie validée par le seul motif", () => {
  const racine = path.resolve(__dirname);
  const fichiers: string[] = [];
  const parcourir = (dir: string) => {
    for (const nom of readdirSync(dir)) {
      const p = path.join(dir, nom);
      if (statSync(p).isDirectory()) parcourir(p);
      else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) fichiers.push(p);
    }
  };
  parcourir(racine);

  const MOTIF_DATE = /\\d\{4\}-\\d\{2\}-\\d\{2\}/;

  it("chaque `.regex()` de date porte le prédicat du jour réel", () => {
    const fautifs: string[] = [];
    let releves = 0;
    for (const f of fichiers) {
      const lignes = readFileSync(f, "utf8").split("\n");
      // Les constantes qui portent un motif de date : `const DATE_FMT = /^\d{4}-…/`.
      const constantes = new Set<string>();
      for (const l of lignes) {
        const m = /const\s+(\w+)\s*=\s*\/(.*)\/\w*;/.exec(l);
        if (m && MOTIF_DATE.test(m[2])) constantes.add(m[1]);
      }
      lignes.forEach((l, i) => {
        const m = /\.regex\(\s*([^,)]+)/.exec(l);
        if (!m) return;
        const arg = m[1].trim();
        if (!constantes.has(arg) && !MOTIF_DATE.test(arg)) return;
        releves++;
        const suite = lignes.slice(i, i + 4).join("\n");
        if (!/estJourCivilReel|estSaisieDateHeureReelle/.test(suite)) {
          fautifs.push(`${path.relative(racine, f)}:${i + 1}`);
        }
      });
    }
    // Borne basse : le relevé trouve bien les schémas (une quinzaine au
    // 2026-10-13) ; un relevé qui ne lit plus rien passerait sans rien dire.
    expect(releves).toBeGreaterThanOrEqual(10);
    expect(fautifs).toEqual([]);
  });
});
