#!/usr/bin/env tsx
/**
 * Les comptes du test de charge (`docs/plan-test-de-charge.md` § 4) : N comptes,
 * un dossier chacun, les G premiers grossis à la limite de la cible (dix ans
 * d'historique), et un fichier de sessions que k6 rejoue.
 *
 *   pnpm exec tsx --import ./scripts/server-only-hors-next.mjs \
 *     scripts/charge/semer-comptes.ts --comptes 50 --gros 5 --sortie <fichier.json>
 *
 * Exige DATABASE_URL, BETTER_AUTH_SECRET (celui du serveur testé) et
 * PUBLIC_APP_URL (la même adresse que le serveur : elle fixe le nom du cookie).
 *
 * POURQUOI N DOSSIERS ET NON UN. Cinquante utilisateurs sur le même dossier
 * donneraient un cache de PostgreSQL toujours chaud et des verrous sur les
 * mêmes lignes à l'écriture : un test plus optimiste et plus pessimiste à la
 * fois que la réalité.
 *
 * REJOUABLE. Un compte qui a déjà son dossier n'est pas resemé : seule sa
 * session est rouverte (le fichier de sessions se régénère sans tout refaire).
 *
 * GARDE-FOUS. Base locale seulement (la campagne Clever Cloud ajoutera une base
 * désignée explicitement, jamais la production). Refus si la base porte un
 * dossier qui n'est pas un dossier de charge : ce script ne se lance pas sur une
 * base de travail.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import { prisma } from "../../src/lib/prisma";
import { ouvrirSession } from "../perf/ouvrir-session";

const PREFIXE_DOSSIER = "Charge ";
const MOT_DE_PASSE = "charge-k6-mot-de-passe";

const arg = (nom: string, defaut?: string): string | undefined => {
  const i = process.argv.indexOf(`--${nom}`);
  return i === -1 ? defaut : process.argv[i + 1];
};

function baseLocaleOuRefus(): void {
  let hote = "";
  try {
    hote = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    /* illisible : refusé ci-dessous */
  }
  if (hote !== "localhost" && hote !== "127.0.0.1") {
    throw new Error(`REFUS : DATABASE_URL ne pointe pas une base locale (« ${hote || "illisible"} »).`);
  }
}

const tsx = (script: string, args: string[]) =>
  execFileSync(
    "pnpm",
    ["exec", "tsx", "--import", "./scripts/server-only-hors-next.mjs", script, ...args],
    { stdio: ["ignore", "ignore", "inherit"], env: process.env },
  );

export type DossierDeCharge = {
  n: number;
  taille: "gros" | "demo";
  nom: string;
  etablissementId: string;
  duerpId: string;
  /** L'appareil et le contrôle qui portent le plus de rapports (fiches lues). */
  equipementId: string | null;
  controleId: string | null;
  cookie: string;
};

async function dossierDuCompte(userId: string) {
  return prisma.etablissement.findFirst({
    where: { entreprise: { compte: { membres: { some: { userId, role: "owner" } } } } },
    select: { id: true, raisonDisplay: true, duerps: { select: { id: true }, take: 1 } },
  });
}

/** Même choix que `mesurer.mjs` : l'appareil au plus long historique. */
async function ficheLaPlusLourde(etablissementId: string) {
  const [ligne] = await prisma.$queryRaw<{ equipementId: string; id: string }[]>`
    SELECT v."equipementId", v.id FROM "Verification" v
      JOIN "Equipement" e ON e.id = v."equipementId"
      LEFT JOIN "RapportVerification" r ON r."verificationId" = v.id
     WHERE v."etablissementId" = ${etablissementId}
     GROUP BY v.id, e.id
     ORDER BY count(r.id) DESC, v."obligationId", e.libelle
     LIMIT 1`;
  return ligne ?? null;
}

async function main(): Promise<void> {
  baseLocaleOuRefus();
  const comptes = Number(arg("comptes", "50"));
  const gros = Number(arg("gros", "5"));
  const sortie = arg("sortie");
  if (!sortie) throw new Error("--sortie <fichier.json> est obligatoire.");
  if (!Number.isInteger(comptes) || comptes < 1 || comptes > 99) throw new Error("--comptes : de 1 à 99.");
  if (!Number.isInteger(gros) || gros < 0 || gros > comptes) throw new Error("--gros : de 0 à --comptes.");

  const etrangers = await prisma.entreprise.count({
    where: { NOT: { raisonSociale: { startsWith: PREFIXE_DOSSIER } } },
  });
  if (etrangers > 0) {
    throw new Error(`REFUS : la base porte ${etrangers} dossier(s) hors test de charge. Base dédiée seulement.`);
  }

  const dossiers: DossierDeCharge[] = [];
  for (let n = 1; n <= comptes; n++) {
    const email = `charge-${String(n).padStart(2, "0")}@rojer.invalid`;
    const { userId, cookie } = await ouvrirSession(email, MOT_DE_PASSE);
    let dossier = await dossierDuCompte(userId);
    const taille = n <= gros ? "gros" : "demo";
    if (!dossier) {
      tsx("scripts/seed-dossier-complet.ts", ["--user", userId, "--dossier-de-charge", String(n)]);
      dossier = await dossierDuCompte(userId);
      if (!dossier) throw new Error(`Dossier ${n} absent après le semis.`);
      if (taille === "gros") tsx("scripts/perf/grossir-dossier.ts", ["--etablissement", dossier.id]);
    }
    if (!dossier.duerps[0]) throw new Error(`Dossier ${n} sans DUERP.`);
    const fiche = await ficheLaPlusLourde(dossier.id);
    dossiers.push({
      n,
      taille,
      nom: dossier.raisonDisplay,
      etablissementId: dossier.id,
      duerpId: dossier.duerps[0].id,
      equipementId: fiche?.equipementId ?? null,
      controleId: fiche?.id ?? null,
      cookie,
    });
    process.stderr.write(`  ${n}/${comptes} ${taille} ${dossier.raisonDisplay}\n`);
  }

  writeFileSync(sortie, JSON.stringify(dossiers, null, 2));
  console.log(`${dossiers.length} dossiers de charge (${gros} gros), sessions écrites dans ${sortie}.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
