// Figer la table des matières du livre II de l'arrêté du 25 juin 1980.
//
//   pnpm exec tsx --env-file=<fichier> --import ./scripts/server-only-hors-next.mjs \
//     scripts/figer-table-des-matieres-1980.ts --date 2026-10-17
//
// Écrit `src/lib/referentiels/corpus/table-des-matieres-1980.ts` depuis
// `/consult/legi/tableMatieres` (LEGITEXT000020303557, à la date demandée),
// sans aucune recopie à la main : c'est ce que le module affirme, et ce script
// est ce qui permet de le vérifier depuis le dépôt (revue du 2026-10-17).
// Relancé à la même date et dans le même environnement, il doit rendre le
// fichier identique, empreinte comprise.
//
// Variables : LEGIFRANCE_CLIENT_ID, LEGIFRANCE_CLIENT_SECRET, LEGIFRANCE_ENV
// (sandbox | production) — lues par le client, jamais affichées.

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { configurationDepuisEnv, creerClientLegifrance } from "../src/lib/legifrance/client";

const TEXTE = "LEGITEXT000020303557";
const SORTIE = path.join(process.cwd(), "src/lib/referentiels/corpus/table-des-matieres-1980.ts");

type Section = { title?: string; articles?: { num: string; etat: string; id: string }[]; sections?: Section[] };
type Chapitre = { titre: "I" | "II"; chapitre: string; intitule: string; articles: { ref: string; etat: string; id: string }[] };

function aplatir(s: Section): { num: string; etat: string; id: string }[] {
  return [...(s.articles ?? []), ...(s.sections ?? []).flatMap(aplatir)];
}

/** Les chapitres des titres Ier et II du livre II ; annexes et appendice prennent le préfixe du chapitre. */
export function chapitresDuLivre2(reponse: { sections: Section[] }): Chapitre[] {
  const livre2 = reponse.sections[0].sections![1];
  return livre2.sections!.flatMap((titre, i) =>
    titre.sections!.map((ch) => {
      const arts = aplatir(ch);
      const prefixe = arts.map((a) => a.num).find((n) => /^[A-Z]+ \d/.test(n))!.split(" ")[0];
      return {
        titre: i === 0 ? ("I" as const) : ("II" as const),
        chapitre: prefixe,
        intitule: (ch.title ?? "").replace(/\s+/g, " ").trim(),
        articles: arts.map((a) => {
          const num = a.num.trim();
          const ref = /^(Annexe|Appendice)/.test(num) ? `${prefixe} ${num[0].toLowerCase()}${num.slice(1)}` : num;
          if (a.etat !== "VIGUEUR" && a.etat !== "ABROGE") throw new Error(`${ref} : état « ${a.etat} » inattendu`);
          return { ref, etat: a.etat, id: a.id };
        }),
      };
    }),
  );
}

export function rendreModule(chapitres: Chapitre[], date: string, env: string): string {
  const empreinte = createHash("sha256").update(JSON.stringify(chapitres)).digest("hex").slice(0, 16);
  const q = (x: string) => JSON.stringify(x);
  let s = `// Table des matières de l'arrêté du 25 juin 1980 (règlement de sécurité ERP),
// livre II — titres Ier et II, chapitre par chapitre, telle que l'API Légifrance
// la rend. DONNÉE, pas lecture : elle dit quels articles existent, pas ce
// qu'ils imposent. Le classement de chacun est au corpus (\`arrete-1980-livre-2\`
// pour le titre Ier, \`arrete-1980-livre-2-titre-2\` pour le titre II), et
// \`table-des-matieres.test.ts\` vérifie, chapitre par chapitre, que les deux
// listes sont égales (garde-fou 1, décision de la propriétaire du 2026-10-17).
//
// D'OÙ ELLE VIENT. POST \`/consult/legi/tableMatieres\` { textId: ${TEXTE},
// date: ${date}, nature: ARRETE }, API PISTE en ${env === "sandbox" ? "BAC À SABLE — son égalité avec la\n// production n'est pas vérifiée" : "PRODUCTION"}. ÉCRIT PAR
// \`scripts/figer-table-des-matieres-1980.ts\`, jamais à la main : un numéro
// ajouté ou retiré ici vient d'une nouvelle lecture de la table, datée.
// Empreinte SHA-256 (16 premiers caractères) des chapitres extraits : ${empreinte}.
//
// Les annexes et l'appendice prennent le préfixe de leur chapitre
// (« Annexe » du chapitre T → « T annexe », « Appendice » du chapitre GE →
// « GE appendice »), comme au corpus. État : « VIGUEUR » ou « ABROGE », tel
// que la table le donne.
//
// Module **pur**.

export type ArticleTable = { ref: string; etat: "VIGUEUR" | "ABROGE"; id: string };
export type ChapitreTable = {
  titre: "I" | "II";
  /** Le préfixe des articles du chapitre (GE, CO, …, L, M, …). */
  chapitre: string;
  intitule: string;
  articles: readonly ArticleTable[];
};

export const TABLE_DES_MATIERES_1980_LIVRE_2 = {
  texte: ${q(TEXTE)},
  date: ${q(date)},
  environnement: ${q(env)},
  empreinteChapitres: ${q(empreinte)},
} as const;

export const CHAPITRES_LIVRE_2: readonly ChapitreTable[] = [
`;
  for (const c of chapitres) {
    s += `  {\n    titre: "${c.titre}",\n    chapitre: "${c.chapitre}",\n    intitule: ${q(c.intitule)},\n    articles: [\n`;
    for (const a of c.articles) s += `      { ref: ${q(a.ref)}, etat: "${a.etat}", id: "${a.id}" },\n`;
    s += `    ],\n  },\n`;
  }
  return s + `];\n`;
}

async function main() {
  const i = process.argv.indexOf("--date");
  const date = i > 0 ? process.argv[i + 1] : new Date().toISOString().slice(0, 10);
  const conf = configurationDepuisEnv(process.env);
  const client = creerClientLegifrance({ ...conf });
  const reponse = await client.post<{ sections: Section[] }>("/consult/legi/tableMatieres", {
    textId: TEXTE,
    date,
    nature: "ARRETE",
  });
  const chapitres = chapitresDuLivre2(reponse);
  writeFileSync(SORTIE, rendreModule(chapitres, date, conf.env));
  console.log(`Écrit : ${path.relative(process.cwd(), SORTIE)} — ${chapitres.length} chapitres, ${chapitres.reduce((n, c) => n + c.articles.length, 0)} articles (${conf.env}, ${date}).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
