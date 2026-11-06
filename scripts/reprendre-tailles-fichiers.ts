#!/usr/bin/env tsx
//
// Reprise des tailles des fichiers déjà déposés (ADR-053 § 14, plafond de
// stockage) : pour chaque fichier référencé par un compte et dont la taille
// n'est pas encore connue (`FichierStocke`), prend la taille déjà en base
// quand la ligne la porte (rapport, pièce de correction), sinon lit l'objet
// au stockage. À lancer avant le lancement de l'offre, et de nouveau AU
// lancement (un dépôt sans session lisible n'a pas laissé sa taille).
// Rejouable : ce qui est connu n'est pas relu, et une clé déjà écrite par une
// exécution concurrente est sautée.
//
// `--dry-run` par défaut : compte et mesure, n'écrit rien. N'écrit qu'avec
// `--appliquer`. La base lue est celle de `DATABASE_URL`, affichée en tête,
// mot de passe masqué ; seuls des nombres s'impriment.
//
//   pnpm tsx --import ./scripts/server-only-hors-next.mjs --env-file=.env scripts/reprendre-tailles-fichiers.ts
//   pnpm tsx --import ./scripts/server-only-hors-next.mjs --env-file=.env scripts/reprendre-tailles-fichiers.ts --appliquer

import { PrismaClient } from "@prisma/client";
import { getStorage } from "@/lib/storage";
import { CLES_STOCKEES } from "@/lib/suppression/fichiers";

const appliquer = process.argv.includes("--appliquer");
const prisma = new PrismaClient();
const LOT = 1000;

/** Le chemin de chaque modèle vers son compte (`correspondance.ts`), et la taille qu'il porte déjà. */
const RATTACHEMENT: Record<keyof typeof CLES_STOCKEES, { compte: string[]; taille?: Record<string, string> }> = {
  Etablissement: { compte: ["entreprise"] },
  RapportVerification: { compte: ["etablissement", "entreprise"], taille: { fichierCle: "fichierTaille" } },
  Action: { compte: ["etablissement", "entreprise"], taille: { leveeFichierCle: "leveeFichierTaille" } },
  Prestataire: { compte: ["etablissement", "entreprise"] },
  PiecePrestataire: { compte: ["prestataire", "etablissement", "entreprise"] },
  AnalyseLegionelle: { compte: ["carnet", "etablissement", "entreprise"] },
};

type Lecteur = { findMany(a: object): Promise<Record<string, unknown>[]> };

/** `{ a: { select: { b: { select: { compteId: true } } } } }` pour le chemin `[a, b]`. */
const selectionDuCompte = (chemin: string[]): object =>
  chemin.reduceRight<object>((suite, champ) => ({ [champ]: { select: suite } }), { compteId: true });
const compteDe = (ligne: Record<string, unknown>, chemin: string[]): string | null =>
  (chemin.reduce<unknown>((o, champ) => (o as Record<string, unknown> | null)?.[champ] ?? null, ligne) as { compteId?: string } | null)
    ?.compteId ?? null;

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  console.log(`Base : ${url.replace(/:[^:@/]+@/, ":***@")}`);
  console.log(appliquer ? "Mode : APPLIQUER" : "Mode : dry-run (rien n'est écrit)");

  // clé → compte, et la taille si la ligne la porte déjà.
  const aReprendre = new Map<string, { compteId: string; taille: number | null }>();
  for (const [modele, champs] of Object.entries(CLES_STOCKEES) as [keyof typeof CLES_STOCKEES, readonly string[]][]) {
    const { compte, taille = {} } = RATTACHEMENT[modele];
    const delegue = (prisma as unknown as Record<string, Lecteur>)[modele.charAt(0).toLowerCase() + modele.slice(1)];
    const lignes = await delegue.findMany({
      select: {
        ...Object.fromEntries(champs.flatMap((c) => [[c, true], ...(taille[c] ? [[taille[c], true]] : [])])),
        ...selectionDuCompte(compte),
      },
    });
    for (const l of lignes) {
      const compteId = compteDe(l, compte);
      if (!compteId) continue;
      for (const c of champs) {
        const cle = l[c];
        if (typeof cle !== "string") continue;
        const t = taille[c] ? l[taille[c]] : null;
        aReprendre.set(cle, { compteId, taille: typeof t === "number" ? t : null });
      }
    }
  }
  const cles = [...aReprendre.keys()];
  for (let i = 0; i < cles.length; i += LOT) {
    const connues = await prisma.fichierStocke.findMany({ where: { cle: { in: cles.slice(i, i + LOT) } }, select: { cle: true } });
    for (const { cle } of connues) aReprendre.delete(cle);
  }
  console.log(`Fichiers référencés sans taille connue : ${aReprendre.size}`);

  const storage = getStorage();
  let total = 0;
  let introuvables = 0;
  let enBase = 0;
  const lignes: { cle: string; compteId: string; octets: number }[] = [];
  for (const [cle, { compteId, taille }] of aReprendre) {
    let octets = taille;
    if (octets === null) {
      try {
        octets = (await storage.get(cle)).length;
      } catch {
        introuvables++;
        continue;
      }
    } else enBase++;
    total += octets;
    lignes.push({ cle, compteId, octets });
  }
  if (appliquer)
    for (let i = 0; i < lignes.length; i += LOT)
      await prisma.fichierStocke.createMany({ data: lignes.slice(i, i + LOT), skipDuplicates: true });
  console.log(
    `Mesurés : ${lignes.length} (${(total / 1e6).toFixed(1)} Mo ; ${enBase} par la taille en base) ; introuvables au stockage : ${introuvables}`,
  );
  if (!appliquer) console.log("Rien n'a été écrit. Relancer avec --appliquer.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
