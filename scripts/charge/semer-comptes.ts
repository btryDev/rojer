#!/usr/bin/env tsx
/**
 * Les comptes du test de charge (`docs/plan-test-de-charge.md` § 4) : N comptes,
 * un dossier chacun, les G premiers grossis à la limite de la cible (dix ans
 * d'historique), et un fichier de sessions que k6 rejoue.
 *
 *   pnpm exec tsx --import ./scripts/server-only-hors-next.mjs \
 *     scripts/charge/semer-comptes.ts --comptes 50 --gros 5 --sortie <fichier.json> [--premier 1]
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
 * GARDE-FOUS. Base locale, ou base distante désignée par CHARGE_BASE_DESIGNEE
 * (son hôte exact ; la préproduction Clever Cloud). Refus si une base locale
 * porte un dossier qui n'est pas un dossier de charge, ou si une base désignée
 * porte un compte hors `@rojer.invalid` : jamais une base avec de vrais
 * utilisateurs. Sur une base désignée, le mot de passe des comptes vient de
 * CHARGE_MOT_DE_PASSE (le dépôt est public) et --gros doit valoir 0.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import { prisma } from "../../src/lib/prisma";
import { ouvrirSession } from "../perf/ouvrir-session";

const PREFIXE_DOSSIER = "Charge ";
/** Mot de passe des comptes d'une base LOCALE seulement : il est écrit ici. */
const MOT_DE_PASSE_LOCAL = "charge-k6-mot-de-passe";

/**
 * Le dépôt est public : sur une base désignée (joignable d'internet), le mot
 * de passe vient de CHARGE_MOT_DE_PASSE, jamais de ce fichier. Les cookies de
 * session suffisent à k6 ; le mot de passe ne sert qu'à les ouvrir.
 */
function motDePasse(base: "locale" | "designee"): string {
  if (base === "locale") return MOT_DE_PASSE_LOCAL;
  const secret = process.env.CHARGE_MOT_DE_PASSE ?? "";
  if (secret.length < 16 || secret === MOT_DE_PASSE_LOCAL) {
    throw new Error("REFUS : base désignée sans CHARGE_MOT_DE_PASSE (16 caractères au moins, propre à la campagne).");
  }
  return secret;
}

const arg = (nom: string, defaut?: string): string | undefined => {
  const i = process.argv.indexOf(`--${nom}`);
  return i === -1 ? defaut : process.argv[i + 1];
};

const DOMAINE_DE_TEST = "@rojer.invalid";

/**
 * Base locale, ou base distante DÉSIGNÉE : `CHARGE_BASE_DESIGNEE` doit porter
 * exactement l'hôte de DATABASE_URL (la préproduction, plan § 8). Rien n'est
 * deviné : sans la variable, toute base distante est refusée.
 */
function baseAutoriseeOuRefus(): "locale" | "designee" {
  let hote = "";
  try {
    hote = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    /* illisible : refusé ci-dessous */
  }
  if (hote === "localhost" || hote === "127.0.0.1") return "locale";
  if (hote !== "" && hote === process.env.CHARGE_BASE_DESIGNEE) return "designee";
  throw new Error(
    `REFUS : DATABASE_URL ne pointe ni une base locale ni la base désignée par CHARGE_BASE_DESIGNEE (« ${hote || "illisible"} »).`,
  );
}

/**
 * Une base locale ne porte que des dossiers de charge. Une base désignée peut
 * porter d'autres dossiers de test, mais aucun compte réel : tout utilisateur
 * y est au domaine réservé `.invalid` (RFC 2606).
 */
async function baseDeTestOuRefus(base: "locale" | "designee"): Promise<void> {
  if (base === "locale") {
    const etrangers = await prisma.entreprise.count({
      where: { NOT: { raisonSociale: { startsWith: PREFIXE_DOSSIER } } },
    });
    if (etrangers > 0) {
      throw new Error(`REFUS : la base porte ${etrangers} dossier(s) hors test de charge. Base dédiée seulement.`);
    }
    return;
  }
  const reels = await prisma.user.count({ where: { NOT: { email: { endsWith: DOMAINE_DE_TEST } } } });
  if (reels > 0) {
    throw new Error(`REFUS : la base désignée porte ${reels} compte(s) hors ${DOMAINE_DE_TEST}. Jamais une base avec des utilisateurs réels.`);
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
  /** Contrôles d'appareil ouverts où déposer un rapport (parcours Saisie). */
  controles: { equipementId: string; id: string }[];
  cookie: string;
};

async function dossierDuCompte(userId: string) {
  return prisma.etablissement.findFirst({
    where: { entreprise: { compte: { membres: { some: { userId, role: "owner" } } } } },
    select: { id: true, raisonDisplay: true, duerps: { select: { id: true }, take: 1 } },
  });
}

/** Jusqu'à dix contrôles d'appareil ouverts : le parcours Saisie y dépose. */
async function controlesOuverts(etablissementId: string) {
  return prisma.$queryRaw<{ equipementId: string; id: string }[]>`
    SELECT v."equipementId", v.id FROM "Verification" v
      JOIN "Equipement" e ON e.id = v."equipementId" AND e.actif
     WHERE v."etablissementId" = ${etablissementId} AND v."archiveLe" IS NULL
     ORDER BY v."obligationId", e.libelle
     LIMIT 10`;
}

/** Grossi par `grossir-dossier.ts` : il porte le parc de la cible (≈ 100). */
async function estGros(etablissementId: string): Promise<boolean> {
  return (await prisma.equipement.count({ where: { etablissementId, actif: true } })) >= 100;
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
  const base = baseAutoriseeOuRefus();
  const comptes = Number(arg("comptes", "50"));
  const gros = Number(arg("gros", "5"));
  // Premier numéro de dossier : une base désignée peut déjà porter des
  // dossiers de test aux premiers numéros (même nom, même slug public).
  const premier = Number(arg("premier", "1"));
  const sortie = arg("sortie");
  if (!sortie) throw new Error("--sortie <fichier.json> est obligatoire.");
  if (!Number.isInteger(comptes) || comptes < 1 || comptes > 99) throw new Error("--comptes : de 1 à 99.");
  if (!Number.isInteger(gros) || gros < 0 || gros > comptes) throw new Error("--gros : de 0 à --comptes.");
  if (!Number.isInteger(premier) || premier < 1 || premier + comptes - 1 > 99) {
    throw new Error("--premier : les numéros vont de 1 à 99.");
  }

  await baseDeTestOuRefus(base);
  // Grossir un dossier passe par grossir-dossier.ts, qui refuse toute base
  // non locale : mieux vaut le dire avant d'avoir créé quoi que ce soit.
  if (base === "designee" && gros > 0) {
    throw new Error("REFUS : --gros doit valoir 0 sur une base désignée (grossir-dossier.ts n'y tourne pas).");
  }
  const mdp = motDePasse(base);

  const dossiers: DossierDeCharge[] = [];
  for (let n = premier; n < premier + comptes; n++) {
    const email = `charge-${String(n).padStart(2, "0")}@rojer.invalid`;
    const { userId, cookie } = await ouvrirSession(email, mdp);
    let dossier = await dossierDuCompte(userId);
    if (!dossier) {
      tsx("scripts/seed-dossier-complet.ts", ["--user", userId, "--dossier-de-charge", String(n)]);
      dossier = await dossierDuCompte(userId);
      if (!dossier) throw new Error(`Dossier ${n} absent après le semis.`);
    }
    // La taille se lit sur le dossier, pas sur le rang : une relance avec un
    // autre --gros grossit ce qui doit l'être, et n'étiquette jamais « gros »
    // un dossier qui ne l'est pas.
    if (n - premier < gros && !(await estGros(dossier.id))) {
      tsx("scripts/perf/grossir-dossier.ts", ["--etablissement", dossier.id]);
    }
    const taille = (await estGros(dossier.id)) ? "gros" : "demo";
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
      controles: await controlesOuverts(dossier.id),
      cookie,
    });
    process.stderr.write(`  ${n - premier + 1}/${comptes} ${taille} ${dossier.raisonDisplay}\n`);
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
