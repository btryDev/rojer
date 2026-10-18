import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sansCommentaires } from "./textes-un-batiment.test";

// Revue du 2026-10-17 : le « Zone * » du formulaire d'équipement rendait
// `{b.nom}` nu, et « Bâtiment principal » s'y lisait comme un second
// bâtiment. Un nom de zone affiché passe par `nomDeZone` — partout, et cette
// garde le lit dans les sources plutôt que de compter sur la mémoire.
//
// Ce qu'elle reconnaît comme un nom de zone : `batiment.nom`, `….batiment.nom`,
// `zone.nom` et les variables d'une lettre `b`, `a`, `z` (`.map((b) => …)`),
// avec ou sans `?.`. Ce qu'elle ne voit pas : une déstructuration
// (`({ nom }) => …`) ou un autre nom de variable. Elle borne le défaut
// observé, elle ne prouve pas l'absence de tout autre chemin.

/** Les répertoires d'où sortent les textes affichés. */
const SURFACES = [
  "src/app",
  "src/components",
  "src/lib/pdf",
  "src/lib/registre",
  "src/lib/mcp",
  "src/lib/dashboard",
  "src/lib/calendrier",
];

/** La chaîne entière (`v.equipement.batiment.nom`), pour lire ce qui la précède. */
const NOM_DE_ZONE = /(?<![\w$.])(?:[\w$]+\??\.)*(?:batiment|zone|[abz])\??\.nom\b/g;

/**
 * Les seuls accès nus permis, chacun avec sa raison. Le renommage préremplit
 * le nom STOCKÉ : le traduire ferait lever l'unicité (P2002, `nom-zone.ts`).
 */
const PERMIS: { fichier: string; texte: string }[] = [
  { fichier: "src/components/batiments/BatimentsManager.tsx", texte: "defaultValue={batiment.nom}" },
];

function fichiers(dossier: string): string[] {
  const out: string[] = [];
  const descendre = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) descendre(p);
      else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) out.push(p);
    }
  };
  descendre(join(process.cwd(), dossier));
  return out;
}

export function nomsNus(fichier: string, source: string): string[] {
  const texte = sansCommentaires(source);
  const out: string[] = [];
  for (const m of texte.matchAll(NOM_DE_ZONE)) {
    const avant = texte.slice(Math.max(0, m.index - 40), m.index);
    if (/nomDeZone\(\s*$/.test(avant)) continue;
    const contexte = texte.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20);
    if (PERMIS.some((p) => p.fichier === fichier && contexte.includes(p.texte))) continue;
    out.push(`${fichier} : « …${contexte.trim()}… »`);
  }
  return out;
}

const SOURCES = SURFACES.flatMap(fichiers).map((f) => ({
  fichier: f.replace(process.cwd() + "/", ""),
  source: readFileSync(f, "utf8"),
}));

describe("un nom de zone affiché passe par `nomDeZone` (revue du 2026-10-17)", () => {
  it("aucune surface ne rend `b.nom`, `batiment.nom` ou `zone.nom` nu", () => {
    expect(SOURCES.flatMap((s) => nomsNus(s.fichier, s.source))).toEqual([]);
  });

  it("borne basse : la garde lit les écrans qui affichent des zones", () => {
    const lus = SOURCES.map((s) => s.fichier);
    for (const f of [
      "src/components/equipements/EquipementForm.tsx",
      "src/components/batiments/SelecteurBatiment.tsx",
      "src/components/batiments/ChampBatiment.tsx",
      "src/components/calendrier/FiltresCalendrier.tsx",
      "src/lib/pdf/builders.ts",
    ]) {
      expect(lus, f).toContain(f);
    }
    // Et elle y voit des noms de zone : une expression qui ne reconnaîtrait
    // plus rien passerait la première garde sans rien lire.
    const vus = SOURCES.flatMap((s) => [...sansCommentaires(s.source).matchAll(NOM_DE_ZONE)]).length;
    expect(vus).toBeGreaterThanOrEqual(10);
  });

  it("cassure : un nom nu est vu, traduit il ne l'est plus, un commentaire ne compte pas", () => {
    expect(nomsNus("x.tsx", "<option>{b.nom}</option>")).toHaveLength(1);
    expect(nomsNus("x.tsx", "`${eq.batiment?.nom} — ${eq.libelle}`")).toHaveLength(1);
    expect(nomsNus("x.tsx", "<option>{nomDeZone(b.nom)}</option>")).toEqual([]);
    expect(nomsNus("x.tsx", "// {b.nom}\nconst a = 1;")).toEqual([]);
    expect(nomsNus("x.tsx", "<input defaultValue={batiment.nom} />")).toHaveLength(1);
  });
});
