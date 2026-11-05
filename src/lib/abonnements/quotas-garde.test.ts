// Toute création d'un modèle plafonné passe par la porte des plafonds
// (ADR-053 § 14) : `prendreQuota`, `creerSousPlafond` qui l'appelle, ou
// `placesSousLePlafond`, juste avant, dans la transaction qui crée. La garde
// relit le code, comme celle du SQL brut : une création ajoutée demain
// ailleurs, ou hors de la transaction, la fait échouer.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sansCommentairesNiChaines } from "@/lib/auth/tenancy-sonde";

const DEPOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Le plafond de chaque modèle plafonné (client Prisma), et son nom de modèle. */
const MODELES: Record<string, { nom: string; cle: string }> = {
  etablissement: { nom: "Etablissement", cle: "etablissements" },
  prestataire: { nom: "Prestataire", cle: "prestataires" },
  permisFeu: { nom: "PermisFeu", cle: "permisDeFeuParAn" },
  planPrevention: { nom: "PlanPrevention", cle: "plansDePreventionParAn" },
  equipement: { nom: "Equipement", cle: "equipements" },
  uniteTravail: { nom: "UniteTravail", cle: "unitesTravail" },
  batiment: { nom: "Batiment", cle: "zones" },
  prescriptionParticuliere: { nom: "PrescriptionParticuliere", cle: "prescriptions" },
};

/** Les modules qui créent un élément plafonné. */
const CREATEURS = [
  "src/lib/onboarding/actions.ts",
  "src/lib/prestataires/actions.ts",
  "src/lib/permis-feu/actions.ts",
  "src/lib/plan-prevention/actions.ts",
  "src/lib/equipements/actions.ts",
  "src/lib/batiments/actions.ts",
  "src/lib/prescriptions/actions.ts",
  "src/lib/duerps/actions.ts",
  "src/lib/duerps/import/actions.ts",
];

/** Les créations hors plafond, liste FERMÉE, chacune avec son motif. */
const EXEMPTEES: Record<string, string> = {
  "src/lib/transverses/risque-transverse.ts:uniteTravail":
    "l'unité « Risques transverses », hors plafond comme à l'ADR-033 (comptée hors `estTransverse`)",
  "src/lib/duerps/actions.ts:unites":
    "le DUERP naît avec son unité « Risques transverses », hors plafond (ADR-033)",
  "src/lib/onboarding/actions.ts:batiments":
    "la zone principale naît avec l'établissement (ADR-019), lui-même plafonné dans la même transaction",
};

const NOMS = Object.keys(MODELES).join("|");
const CREATION_DIRECTE = new RegExp(`\\.\\s*(${NOMS})\\s*\\.\\s*(create|createMany|createManyAndReturn|upsert)\\b`, "g");
// Relation imbriquée (`batiments: { create`, `unites: { create`) : les noms
// des champs de relation vers un modèle plafonné, lus dans le schéma — un nom
// écrit à la main en avait manqué un.
const SCHEMA = readFileSync(join(DEPOT, "prisma/schema.prisma"), "utf8");
const NOMS_MODELES_ = Object.values(MODELES).map((m) => m.nom).join("|");
const RELATIONS = [
  ...new Set([...SCHEMA.matchAll(new RegExp(`^\\s+(\\w+)\\s+(?:${NOMS_MODELES_})(?:\\[\\]|\\?)?\\s`, "gm"))].map((m) => m[1])),
].join("|");
const CREATION_IMBRIQUEE = new RegExp(`\\b(${RELATIONS})\\s*:\\s*\\{\\s*(create|createMany|connectOrCreate|upsert)\\b`, "g");
// En lot par son nom de modèle : lu sur le texte BRUT (les chaînes sont effacées du code analysé).
const NOMS_MODELES = Object.values(MODELES).map((m) => m.nom).join("|");
const CREATION_PAR_NOM = new RegExp(`creerEnLotVerifie\\(\\s*(\\w+)\\s*,\\s*["'\`](${NOMS_MODELES})["'\`]`, "g");
const CROCHETS = new RegExp(`\\[\\s*["'\`](${NOMS}|consommationQuota)["'\`]\\s*\\]\\s*\\.\\s*(create|createMany|createManyAndReturn|upsert)\\b`);
const PORTE = /\b(prendreQuota|creerSousPlafond|placesSousLePlafond)\(/;
/** La porte doit précéder chaque création, à cette distance au plus (en caractères). */
const PORTEE_DE_LA_PORTE = 700;

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(ts|tsx)$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}

const TEXTES = new Map(
  fichiers(join(DEPOT, "src")).map((f) => {
    const brut = readFileSync(f, "utf8");
    return [relative(DEPOT, f), { brut, code: sansCommentairesNiChaines(brut) }] as const;
  }),
);

type Creation = { fichier: string; modele: string; avant: string; client: string };

/** Toutes les créations de modèles plafonnés du dépôt, hors exemptées. */
const CREATIONS: Creation[] = [...TEXTES].flatMap(([fichier, t]) => {
  const trouvees: Creation[] = [];
  for (const m of t.code.matchAll(CREATION_DIRECTE)) {
    const client = /(\w+)\s*$/.exec(t.code.slice(Math.max(0, m.index - 40), m.index))?.[1] ?? "";
    if (!(`${fichier}:${m[1]}` in EXEMPTEES))
      trouvees.push({ fichier, modele: m[1], client, avant: t.code.slice(Math.max(0, m.index - PORTEE_DE_LA_PORTE), m.index) });
  }
  for (const m of t.code.matchAll(CREATION_IMBRIQUEE))
    if (!(`${fichier}:${m[1]}` in EXEMPTEES)) trouvees.push({ fichier, modele: m[1], client: "imbriquee", avant: "" });
  for (const m of t.brut.matchAll(CREATION_PAR_NOM)) {
    const modele = Object.keys(MODELES).find((k) => MODELES[k].nom === m[2])!;
    trouvees.push({ fichier, modele, client: m[1], avant: t.brut.slice(Math.max(0, m.index - PORTEE_DE_LA_PORTE), m.index) });
  }
  return trouvees;
});

describe("plafonds : une seule porte (ADR-053 § 14)", () => {
  it("seuls les modules nommés créent un élément plafonné", () => {
    expect([...new Set(CREATIONS.map((c) => c.fichier))].sort()).toEqual([...CREATEURS].sort());
  });

  it("chaque exemption désigne encore une création", () => {
    for (const cle of Object.keys(EXEMPTEES)) {
      const [fichier, modele] = cle.split(":");
      const code = TEXTES.get(fichier)?.code ?? "";
      expect(code, cle).toMatch(new RegExp(`(\\.\\s*${modele}\\s*\\.\\s*create|\\b${modele}\\s*:\\s*\\{\\s*create)`));
    }
  });

  it("aucune création imbriquée d'un modèle plafonné (la porte ne la verrait pas)", () => {
    expect(CREATIONS.filter((c) => c.client === "imbriquee").map((c) => `${c.fichier}:${c.modele}`)).toEqual([]);
  });

  it("aucun accès par crochets à un modèle plafonné", () => {
    expect([...TEXTES].filter(([, t]) => CROCHETS.test(t.brut)).map(([f]) => f)).toEqual([]);
  });

  it("chaque création se fait sur la transaction, la porte juste avant, avec le compte de la garde et le bon plafond", () => {
    for (const c of CREATIONS.filter((c) => c.client !== "imbriquee")) {
      const ou = `${c.fichier} (${c.modele})`;
      expect(c.client, ou).toBe("tx");
      expect(c.avant, `${ou} : création sans porte juste avant`).toMatch(PORTE);
      // Le compte de la garde : le verrou, en SQL brut, n'est pas borné.
      const brut = TEXTES.get(c.fichier)!.brut;
      expect(brut, ou).toMatch(
        new RegExp(`(prendreQuota|creerSousPlafond|placesSousLePlafond)\\([^;]*?compte\\.compteId,\\s*"${MODELES[c.modele].cle}"`),
      );
    }
  });

  it("les utilisateurs : les deux limites du plugin lisent le plafond", () => {
    const code = TEXTES.get("src/lib/auth/better-auth.ts")!.brut;
    expect(code).toMatch(/const limitesMembres = [^;]*limitesMembresDuPlugin\(prisma, compteId\);/);
    expect(code).toMatch(/invitationLimit: async \(\{ organization \}\) => \(await limitesMembres\(organization\.id\)\)\.invitations,/);
    expect(code).toMatch(/membershipLimit: async \(_user, organization\) => \(await limitesMembres\(organization\.id\)\)\.membres,/);
  });
});
