#!/usr/bin/env tsx
//
// Reprise des tailles des fichiers déjà déposés (ADR-053 § 14, plafond de
// stockage) : pour chaque fichier référencé par un compte et dont la taille
// n'est pas encore connue (`FichierStocke`), lit l'objet au stockage et
// enregistre sa taille. À lancer une fois, avant le lancement de l'offre ;
// rejouable (ce qui est connu n'est pas relu).
//
// `--dry-run` par défaut : compte et mesure, n'écrit rien. N'écrit qu'avec
// `--appliquer`. La base lue est celle de `DATABASE_URL`, affichée en tête,
// mot de passe masqué ; seuls des identifiants et des tailles s'impriment.
//
//   pnpm tsx --import ./scripts/server-only-hors-next.mjs --env-file=.env scripts/reprendre-tailles-fichiers.ts
//   pnpm tsx --import ./scripts/server-only-hors-next.mjs --env-file=.env scripts/reprendre-tailles-fichiers.ts --appliquer

import { PrismaClient } from "@prisma/client";
import { getStorage } from "@/lib/storage";

const appliquer = process.argv.includes("--appliquer");
const prisma = new PrismaClient();

/** Les champs qui portent une clé de fichier, et le chemin de leur modèle vers le compte. */
const SOURCES: { modele: string; champs: string[]; compte: string[] }[] = [
  { modele: "etablissement", champs: ["photoCle"], compte: ["entreprise"] },
  { modele: "rapportVerification", champs: ["fichierCle"], compte: ["etablissement", "entreprise"] },
  { modele: "action", champs: ["leveeFichierCle"], compte: ["etablissement", "entreprise"] },
  { modele: "prestataire", champs: ["attestationUrssafCle", "assuranceRcProCle", "kbisCle"], compte: ["etablissement", "entreprise"] },
  { modele: "piecePrestataire", champs: ["fichierCle"], compte: ["prestataire", "etablissement", "entreprise"] },
  { modele: "registreAccessibilite", champs: ["attestationCle", "agendaAdapCle", "attestationFormationCle"], compte: ["etablissement", "entreprise"] },
  { modele: "analyseLegionelle", champs: ["rapportCle"], compte: ["carnet", "etablissement", "entreprise"] },
];

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

  const aReprendre = new Map<string, string>(); // clé → compte
  for (const { modele, champs, compte } of SOURCES) {
    const lignes = await (prisma as unknown as Record<string, Lecteur>)[modele].findMany({
      where: { OR: champs.map((c) => ({ [c]: { not: null } })) },
      select: { ...Object.fromEntries(champs.map((c) => [c, true])), ...selectionDuCompte(compte) },
    });
    for (const l of lignes) {
      const compteId = compteDe(l, compte);
      if (!compteId) continue;
      for (const c of champs) if (typeof l[c] === "string") aReprendre.set(l[c] as string, compteId);
    }
  }
  const connues = new Set(
    (await prisma.fichierStocke.findMany({ where: { cle: { in: [...aReprendre.keys()] } }, select: { cle: true } })).map((f) => f.cle),
  );
  for (const cle of connues) aReprendre.delete(cle);
  console.log(`Fichiers référencés sans taille connue : ${aReprendre.size}`);

  const storage = getStorage();
  let total = 0;
  let introuvables = 0;
  for (const [cle, compteId] of aReprendre) {
    let octets: number;
    try {
      octets = (await storage.get(cle)).length;
    } catch {
      introuvables++;
      continue;
    }
    total += octets;
    if (appliquer) await prisma.fichierStocke.create({ data: { cle, compteId, octets } });
  }
  console.log(`Mesurés : ${aReprendre.size - introuvables} (${(total / 1e6).toFixed(1)} Mo) ; introuvables au stockage : ${introuvables}`);
  if (!appliquer) console.log("Rien n'a été écrit. Relancer avec --appliquer.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
