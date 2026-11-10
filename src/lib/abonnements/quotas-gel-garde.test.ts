// Le gel (ADR-053 § 14) relit le code : le refus vit dans le client borné de
// la SESSION, le SQL brut d'une saisie le demande explicitement, et ce qui y
// échappe est une liste fermée, chacune avec son motif.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sansCommentairesNiChaines } from "@/lib/auth/tenancy-sonde";

const DEPOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(ts|tsx)$/.test(nom) && !/\.test\.tsx?$/.test(nom) ? [chemin] : [];
  });
}
const TEXTES = new Map(fichiers(join(DEPOT, "src")).map((f) => [relative(DEPOT, f), readFileSync(f, "utf8")]));
const code = (f: string) => sansCommentairesNiChaines(TEXTES.get(f) ?? "");

/** Ce qui échappe au gel, liste FERMÉE : la portée ne le porte pas, ou le client est brut. */
const HORS_GEL: Record<string, string> = {
  "src/lib/auth/compte-hors-session.ts":
    "accès sans session (signature d'un tiers, dépôt d'un rapport par jeton, MCP en lecture, webhook Stripe) : une preuve réglementaire d'un tiers n'est pas une saisie du titulaire",
  "src/lib/calendrier/actions.ts": "régénération du calendrier par le client brut : elle suit le dossier, ce n'est pas une saisie",
};

/** Les modules qui écrivent en SQL brut (`$executeRaw`), et ce qui les garde. */
const SQL_BRUT_ECRIT: Record<string, string> = {
  "src/lib/registre/actions.ts": "refuserSiGele dans `preparer`, avant l'UPDATE",
  "src/lib/duerps/ecrire-reponse-fermee.ts": "aide : chacun de ses appelants appelle refuserSiGele",
  "src/lib/securite/limite-debit.ts": "compteurs techniques, hors de tout compte",
  "src/lib/stripe/file.ts": "file des relectures Stripe, hors de tout compte (aucune saisie)",
  "src/lib/auth/portee/client.ts": "l'extension (lecture seule)",
};

/**
 * Les gestes qu'un gel laisse ouverts, liste FERMÉE : supprimer (règle 9,
 * et c'est ce qui dégèle), retirer un accès, une page publique, une
 * déclaration ou une photo, demander de l'aide.
 */
const OUVERTS_AU_GEL: Record<string, string[]> = {
  // L'essai s'écrit quand la saisie est encore fermée (ADR-053 § 3).
  "src/lib/abonnements/actions.ts": ["demarrerEssaiAction"],
  "src/lib/assistance/actions.ts": ["demanderAssistance"],
  "src/lib/batiments/actions.ts": ["supprimerBatiment"],
  "src/lib/equipements/actions.ts": ["supprimerEquipement"],
  "src/lib/carnet-sanitaire/actions.ts": ["supprimerPointReleve", "supprimerReleve", "supprimerAnalyseLegionelle"],
  "src/lib/rapports/actions.ts": ["supprimerRapport"],
  "src/lib/access-tokens/actions.ts": ["revoquerAccessToken"],
  "src/lib/risques/actions.ts": ["supprimerRisque"],
  "src/lib/salaries/actions.ts": ["retirerTitre", "supprimerSalarie"],
  "src/lib/permis-feu/actions.ts": ["supprimerPermisFeu"],
  "src/lib/actions/actions.ts": ["supprimerMesure"],
  "src/lib/actions/plan.ts": ["supprimerActionPlan"],
  "src/lib/plan-prevention/actions.ts": ["supprimerPlan"],
  "src/lib/duerps/actions.ts": ["supprimerUnite"],
  "src/lib/entreprises/actions.ts": ["supprimerEntreprise"],
  "src/lib/accessibilite/actions.ts": ["depublierRegistre"],
  "src/lib/etats-permanents/actions.ts": ["retirerDeclaration"],
  "src/lib/etablissements/photo.ts": ["retirerPhotoEtablissement"],
  "src/lib/etablissements/actions.ts": ["supprimerEtablissement"],
  "src/lib/prescriptions/actions.ts": ["supprimerPrescription"],
  "src/lib/prestataires/actions.ts": ["supprimerPrestataire"],
};

/** Le corps d'une fonction exportée (jusqu'à la prochaine fonction exportée). */
function corps(f: string, nom: string): string {
  const c = code(f);
  const i = c.indexOf(`export async function ${nom}(`);
  if (i < 0) return "";
  const j = c.indexOf("export ", i + 10);
  return c.slice(i, j < 0 ? undefined : j);
}

describe("le gel (ADR-053 § 14)", () => {
  it("l'extension vérifie le gel avant chaque opération, avec la portée", () => {
    expect(code("src/lib/auth/portee/client.ts")).toMatch(
      /\$allOperations\(\{[^}]*\}\)\s*\{\s*if \(portee\.saisieFermee\) verifierSaisieOuverte\(model, operation\);\s*if \(portee\.geles\) await verifierGel\(base, model, operation, args, \{ \.\.\.portee, geles: portee\.geles \}\);/,
    );
  });

  it("l'extension refuse aussi une écriture quand la saisie est fermée — modèles et SQL brut (piste 2 de l'audit du 2026-11-10)", () => {
    const c = code("src/lib/auth/portee/client.ts");
    expect(c).toMatch(/\{\s*if \(portee\.saisieFermee\) verifierSaisieOuverte\(model, operation\);\s*if \(portee\.geles\)/);
    expect(c).toMatch(/async \$executeRaw\(\{ args, query \}\)\s*\{\s*refuserEnLecture\([^)]*\);\s*if \(portee\.saisieFermee\) verifierSaisieOuverte\(/);
    // La session pose la saisie fermée, de la même lecture que le gel ; seule elle.
    const posent = [...TEXTES.keys()].filter((f) => /clientBorne(Sur)?\([^)]*saisieFermee/.test(code(f)));
    expect(posent).toEqual(["src/lib/auth/compte.ts"]);
    expect(code("src/lib/auth/compte.ts")).toMatch(/etatDeSaisieDuCompte/);
  });

  it("seule la session pose le gel sur la portée ; ce qui y échappe est nommé", () => {
    const posent = [...TEXTES.keys()].filter((f) => /clientBorne(Sur)?\([^)]*geles/.test(code(f)));
    expect(posent).toEqual(["src/lib/auth/compte.ts"]);
    for (const f of Object.keys(HORS_GEL)) expect(TEXTES.has(f), f).toBe(true);
    expect(code("src/lib/auth/compte-hors-session.ts")).not.toMatch(/geles/);
  });

  it("chaque écriture en SQL brut est nommée, et celles d'une saisie demandent le gel", () => {
    const ecrivent = [...TEXTES.keys()].filter((f) => /\$executeRaw/.test(code(f)));
    expect(ecrivent.sort()).toEqual(Object.keys(SQL_BRUT_ECRIT).sort());
    expect(code("src/lib/registre/actions.ts")).toMatch(/refuserSiGele\(/);
    const appelants = [...TEXTES.keys()].filter((f) => /\becrireReponseFermee\(/.test(code(f)) && !f.endsWith("ecrire-reponse-fermee.ts"));
    expect(appelants.length).toBeGreaterThan(0);
    for (const f of appelants) expect(code(f), f).toMatch(/refuserSiGele\(/);
  });

  it("les gestes ouverts au gel sont nommés, et s'ouvrent juste après leur garde", () => {
    const appelants = [...TEXTES.keys()].filter((f) => f !== "src/lib/auth/portee/gel.ts" && /\bouvrirAuGel\(\)/.test(code(f)));
    expect(appelants.sort()).toEqual(Object.keys(OUVERTS_AU_GEL).sort());
    for (const [f, noms] of Object.entries(OUVERTS_AU_GEL)) {
      const c = code(f);
      expect((c.match(/\bouvrirAuGel\(\)/g) ?? []).length, f).toBe(noms.length);
      // Après le premier `await` (la garde) : le contexte de l'appelant n'en hérite pas.
      // Une garde inconditionnelle — `await f();` ou `const … = await f();` —, jamais
      // un `await` qu'une condition peut sauter (`x ?? await f()`).
      for (const nom of noms)
        expect(corps(f, nom), `${f}:${nom}`).toMatch(/^[^{]*\{\s*(?:const [^=;]+=\s*)?await [\w.]+\([^;?|&]*\);\s*ouvrirAuGel\(\);/);
    }
  });
});
