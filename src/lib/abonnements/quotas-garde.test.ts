// Toute création d'un modèle plafonné passe par la porte des plafonds
// (ADR-053 § 14) : `prendreQuota`, `creerSousPlafond` qui l'appelle, ou
// `placesSousLePlafond`, juste avant, dans la transaction qui crée. La garde
// relit le code, comme celle du SQL brut : une création ajoutée demain
// ailleurs, ou hors de la transaction, la fait échouer.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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
  accessToken: { nom: "AccessToken", cle: "liensAccesActifs" },
  signature: { nom: "Signature", cle: "signaturesParAn" },
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
  "src/lib/access-tokens/emission.ts",
  "src/lib/signatures/actions.ts",
];

/**
 * Les créations hors plafond, liste FERMÉE : chacune désigne UNE création
 * (fichier, relation ou modèle), avec son motif et ce que la création doit
 * porter, lu juste après elle — une autre création au même endroit n'est pas
 * exemptée.
 */
const EXEMPTEES: Record<string, { motif: string; preuve: RegExp }> = {
  "src/lib/transverses/risque-transverse.ts:uniteTravail": {
    motif: "l'unité « Risques transverses », hors plafond comme à l'ADR-033 (comptée hors `estTransverse`)",
    preuve: /^[^;]*estTransverse:\s*true/,
  },
  "src/lib/duerps/actions.ts:unites": {
    motif: "le DUERP naît avec son unité « Risques transverses », hors plafond (ADR-033)",
    preuve: /^[^;]*estTransverse:\s*true/,
  },
  "src/lib/signatures/actions.ts:signature": {
    motif: "la signature d'un tiers par son lien : comptée à la demande (`emettreAccessToken`), comme une enveloppe",
    preuve: /^[^;]*etablissementId:\s*token\.etablissementId/,
  },
  "src/lib/onboarding/actions.ts:batiments": {
    motif: "la zone principale naît avec l'établissement (ADR-019), lui-même plafonné dans la même transaction",
    preuve: /^\s*:\s*\{\s*create:\s*\{\s*nom:\s*NOM_BATIMENT_PRINCIPAL/,
  },
};

const NOMS = Object.keys(MODELES).join("|");
const CREATION_DIRECTE = new RegExp(`\\.\\s*(${NOMS})\\s*\\.\\s*(create|createMany|createManyAndReturn|upsert)\\b`, "g");
// Relation imbriquée (`batiments: { create`, `unites: { create`) : les noms
// des champs de relation vers un modèle plafonné, lus dans le schéma — un nom
// écrit à la main en avait manqué un.
const SCHEMA = readFileSync(join(DEPOT, "prisma/schema.prisma"), "utf8");
const NOMS_MODELES = Object.values(MODELES).map((m) => m.nom).join("|");
const RELATIONS = [
  ...new Set([...SCHEMA.matchAll(new RegExp(`^\\s+(\\w+)\\s+(?:${NOMS_MODELES})(?:\\[\\]|\\?)?\\s`, "gm"))].map((m) => m[1])),
].join("|");
const CREATION_IMBRIQUEE = new RegExp(`\\b(${RELATIONS})\\s*:\\s*\\{\\s*(create|createMany|connectOrCreate|upsert)\\b`, "g");
// En lot par son nom de modèle (`creerEnLotVerifie(tx, "Equipement", …)`).
const CREATION_PAR_NOM = new RegExp(`creerEnLotVerifie\\(\\s*(\\w+)\\s*,\\s*["'\`](${NOMS_MODELES})["'\`]`, "g");
const CROCHETS = new RegExp(`\\[\\s*["'\`](${NOMS}|consommationQuota)["'\`]\\s*\\]\\s*\\.\\s*(create|createMany|createManyAndReturn|upsert)\\b`);
/** La porte, avec le compte de la garde et la clé du plafond (le verrou, en SQL brut, n'est pas borné). */
const porte = (cle: string) => new RegExp(`\\b(prendreQuota|creerSousPlafond|placesSousLePlafond)\\([^;]*?compte\\.compteId,\\s*"${cle}"`);
/** La porte doit précéder chaque création, à cette distance au plus (en caractères). */
const PORTEE_DE_LA_PORTE = 700;

/**
 * Le texte sans ses commentaires, à longueur égale (les positions restent
 * celles du fichier) ; les chaînes restent, la clé d'un plafond en est une.
 */
function sansCommentaires(src: string): string {
  let sortie = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") {
      const fin = src.indexOf("\n", i);
      const j = fin === -1 ? src.length : fin;
      sortie += " ".repeat(j - i);
      i = j;
    } else if (c === "/" && src[i + 1] === "*") {
      const fin = src.indexOf("*/", i + 2);
      const j = fin === -1 ? src.length : fin + 2;
      sortie += src.slice(i, j).replace(/[^\n]/g, " ");
      i = j;
    } else if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) j += src[j] === "\\" ? 2 : 1;
      sortie += src.slice(i, j + 1);
      i = j + 1;
    } else {
      sortie += c;
      i++;
    }
  }
  return sortie;
}

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
    return [relative(DEPOT, f), { brut, code: sansCommentaires(brut) }] as const;
  }),
);

type Creation = { fichier: string; modele: string; avant: string; client: string };

const exemptionsVues = new Map<string, number>();

/** Vrai si la création à `index` est l'une des exemptées (et la compte). */
function exemptee(fichier: string, nom: string, code: string, fin: number): boolean {
  const cle = `${fichier}:${nom}`;
  const e = EXEMPTEES[cle];
  if (!e || !e.preuve.test(code.slice(fin, fin + 400))) return false;
  exemptionsVues.set(cle, (exemptionsVues.get(cle) ?? 0) + 1);
  return true;
}

/** Toutes les créations de modèles plafonnés du dépôt, hors exemptées. */
const CREATIONS: Creation[] = [...TEXTES].flatMap(([fichier, { code }]) => {
  const trouvees: Creation[] = [];
  const avant = (i: number) => code.slice(Math.max(0, i - PORTEE_DE_LA_PORTE), i);
  for (const m of code.matchAll(CREATION_DIRECTE)) {
    const client = /(\w+)\s*$/.exec(code.slice(Math.max(0, m.index - 40), m.index))?.[1] ?? "";
    if (!exemptee(fichier, m[1], code, m.index + m[0].length)) trouvees.push({ fichier, modele: m[1], client, avant: avant(m.index) });
  }
  for (const m of code.matchAll(CREATION_IMBRIQUEE))
    if (!exemptee(fichier, m[1], code, m.index + m[1].length)) trouvees.push({ fichier, modele: m[1], client: "imbriquee", avant: "" });
  for (const m of code.matchAll(CREATION_PAR_NOM)) {
    const modele = Object.keys(MODELES).find((k) => MODELES[k].nom === m[2])!;
    trouvees.push({ fichier, modele, client: m[1], avant: avant(m.index) });
  }
  return trouvees;
});

describe("plafonds : une seule porte (ADR-053 § 14)", () => {
  it("seuls les modules nommés créent un élément plafonné", () => {
    expect([...new Set(CREATIONS.map((c) => c.fichier))].sort()).toEqual([...CREATEURS].sort());
  });

  it("chaque exemption désigne exactement une création, qui porte sa preuve", () => {
    for (const cle of Object.keys(EXEMPTEES)) expect(exemptionsVues.get(cle) ?? 0, cle).toBe(1);
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
      expect(c.avant, `${ou} : création sans sa porte juste avant`).toMatch(porte(MODELES[c.modele].cle));
    }
  });

  it("l'import d'un DUERP prend son plafond annuel dans sa transaction", () => {
    expect(TEXTES.get("src/lib/duerps/import/actions.ts")!.code).toMatch(
      /\$transaction\(async \(tx\) => \{\s*await prendreQuota\(tx, compte\.compteId, "importsDuerp"\);/,
    );
  });

  it("les utilisateurs : les deux limites du plugin lisent le plafond", () => {
    const code = TEXTES.get("src/lib/auth/better-auth.ts")!.brut;
    expect(code).toMatch(/const limitesMembres = [^;]*limitesMembresDuPlugin\(prisma, compteId\);/);
    expect(code).toMatch(/invitationLimit: async \(\{ organization \}\) => \(await limitesMembres\(organization\.id\)\)\.invitations,/);
    expect(code).toMatch(/membershipLimit: async \(_user, organization\) => \(await limitesMembres\(organization\.id\)\)\.membres,/);
  });
});
