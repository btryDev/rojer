import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

vi.mock("@/lib/mcp/prisma", () => ({ prismaMcp: {} }));

const { evaluerEtatDuerp, EFFECTIF_MAJ_ANNUELLE } = await import("./duerp");
const { mentionAConfirmer } = await import(
  "@/lib/matching/effectif-entreprise"
);
const { ligneDuerp } = await import("@/lib/pdf/checklist-controle");
const { formaterEtatDuerp } = await import("@/lib/mcp/tools");
const { genererRecommandations } = await import("./recommandations");
const { phraseDuerp } = await import("./brief");

/**
 * LA MISE À JOUR ANNUELLE RETENUE PAR PRUDENCE SE DIT « À CONFIRMER » PARTOUT
 * (C37, contre-lecture M1 de la vérification de `c5972c7`).
 *
 * Le défaut : entreprise 10, site 11, dernière version au 2025-01-01. Le lot
 * avait fait passer ce dossier de « non soumis » à « soumis, à confirmer » —
 * mais `majAnnuelleAConfirmer` n'avait aucun lecteur, et la checklist du ZIP
 * remis au contrôleur imprimait « [!] DUERP : mise à jour annuelle échue
 * (art. R. 4121-2) ». Une échéance échue affirmée, article à l'appui, sur un
 * seuil qu'on ne sait pas atteint.
 *
 * Deux gardes : chaque sortie, sur ce dossier, porte la mention commune ; et
 * tout fichier qui lit l'état de la mise à jour annuelle lit aussi le doute.
 */

const MAINTENANT = new Date("2026-09-26T10:00:00Z");
const etat = evaluerEtatDuerp(
  {
    ouvert: true,
    dateDerniereVersion: new Date("2025-01-01T10:00:00Z"),
    effectifs: { entreprise: 10, site: 11 },
  },
  MAINTENANT,
);
const MENTION = mentionAConfirmer(EFFECTIF_MAJ_ANNUELLE);

describe("le dossier témoin — entreprise 10, site 11, version de 2025", () => {
  it("est soumis par prudence et échu", () => {
    expect(etat.soumisMajAnnuelle).toBe(true);
    expect(etat.majAnnuelleAConfirmer).toBe(true);
    expect(etat.majEchue).toBe(true);
  });
});

describe("chaque sortie le dit « à confirmer », dans les mêmes mots", () => {
  it("checklist du ZIP de contrôle : ni « [!] » ni « échue »", () => {
    const l = ligneDuerp(etat);
    expect(l).not.toContain("[!]");
    expect(l).not.toContain("échue");
    expect(l).toContain(MENTION);
  });

  it("outil MCP", () => {
    const t = formaterEtatDuerp({
      existe: true,
      etat,
      derniereVersionNumero: 1,
      derniereVersionAu: new Date("2025-01-01T10:00:00Z"),
      effectifEntreprise: 10,
      unites: [],
    });
    expect(t).toContain(MENTION);
  });

  it("recommandations du tableau de bord", () => {
    const recos = genererRecommandations(
      {
        etablissementId: "etab-x",
        verifications: [],
        actions: [],
        nbEquipements: 3,
        duerpSecteurChoisi: true,
        nbRapports: 2,
        transmissions: {
          domainesSansPrestataire: [],
          obligationsSupposantUnePersonne: [],
        },
        duerp: etat,
        duerpId: "duerp-x",
      },
      { now: MAINTENANT },
    );
    const r = recos.find((x) => x.kind === "duerp_a_jour");
    expect(r?.sousTitre).toContain(MENTION);
  });

  it("brief du tableau de bord", () => {
    expect(phraseDuerp({ existe: true, estAJour: false, etat })).toContain(
      MENTION,
    );
  });

  it("et rien de tout cela quand l'entreprise établit le seuil", () => {
    const franc = evaluerEtatDuerp(
      {
        ouvert: true,
        dateDerniereVersion: new Date("2025-01-01T10:00:00Z"),
        effectifs: { entreprise: 11, site: 11 },
      },
      MAINTENANT,
    );
    expect(ligneDuerp(franc)).toContain("[!]");
    expect(ligneDuerp(franc)).not.toContain(MENTION);
  });
});

describe("tout lecteur de l'état de la mise à jour annuelle lit aussi le doute", () => {
  // La garde structurelle : un lecteur neuf de `soumisMajAnnuelle`,
  // `majEchue`, `rappelMajProche` ou `dateLimiteMaj` qui ignorerait
  // `majAnnuelleAConfirmer` affirmerait une échéance que la prudence seule
  // retient. Les tests et le module qui calcule l'état sont hors balayage.
  it("aucun fichier ne lit l'échéance sans lire `majAnnuelleAConfirmer`", () => {
    const racine = fileURLToPath(new URL("../..", import.meta.url));
    const fichiers: string[] = [];
    const parcourir = (dir: string) => {
      for (const nom of readdirSync(dir)) {
        const p = join(dir, nom);
        if (statSync(p).isDirectory()) parcourir(p);
        else if (/\.(ts|tsx)$/.test(nom) && !/\.test\.tsx?$/.test(nom))
          fichiers.push(p);
      }
    };
    parcourir(racine);
    const LECTURE = /\.(soumisMajAnnuelle|majEchue|rappelMajProche|dateLimiteMaj)\b|\{[^}]*\b(majEchue|soumisMajAnnuelle)\b[^}]*\}\s*=\s*etat/;
    const sourds = fichiers
      .filter((f) => !f.endsWith(join("dashboard", "duerp.ts")))
      .filter((f) => {
        const s = readFileSync(f, "utf8");
        return LECTURE.test(s) && !s.includes("majAnnuelleAConfirmer");
      })
      .map((f) => relative(racine, f));
    expect(sourds).toEqual([]);
  });
});
