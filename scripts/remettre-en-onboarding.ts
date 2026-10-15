/**
 * Remet un compte à l'état « jamais renseigné », pour rejouer l'onboarding.
 *
 * **Pourquoi un script de remise à zéro plutôt qu'un compte figé.** Un compte
 * qu'on maintiendrait vide en permanence ne serait jamais celui qu'on veut :
 * dès qu'on renseigne le formulaire pour voir ce qu'il produit, il cesse d'être
 * en onboarding. Ce qu'il faut n'est pas un compte spécial, c'est un geste
 * répétable — remplir, regarder, remettre à zéro, recommencer.
 *
 * Ce qu'il fait : supprime l'`Entreprise` du compte. Tout le dossier part avec
 * elle par cascade — établissement, équipements, vérifications, salariés,
 * DUERP, prestataires, registres. Le compte Supabase, lui, n'est pas touché :
 * l'utilisateur reste connecté, et l'application le renvoie à `/onboarding`
 * parce qu'il n'a plus d'entreprise (`app/entreprises/page.tsx:15`).
 *
 * **Ce script détruit des données et n'a aucun moyen de les rendre.** Trois
 * garde-fous, dans cet ordre :
 *
 *   1. il refuse de s'exécuter si `DATABASE_URL` ne pointe pas sur localhost ;
 *   2. il exige l'adresse e-mail en argument, jamais de valeur par défaut ;
 *   3. sans `--vraiment`, il montre ce qu'il supprimerait et s'arrête.
 *
 * Le premier garde-fou n'est pas décoratif : une base de production a été
 * effacée sur ce projet le 2026-08-27 par une commande qui semblait sûre.
 *
 * **Le TROISIÈME ne l'était pas non plus, et il a menti d'un facteur deux du
 * 2026-09-01 au 2026-09-04.** Il lisait `entreprise.etablissements[0]` et n'en
 * affichait que quatre compteurs, alors que la suppression part de
 * l'`Entreprise` et cascade sur tous ses établissements : un compte à deux
 * établissements s'y voyait annoncer « 10 équipements, 36 vérifications,
 * 5 salariés, 3 bâtiments » et en perdait le double. Le `[0]` était juste tant
 * qu'un compte n'avait qu'un établissement ; l'ADR-028 a retiré l'unicité de
 * `Etablissement.entrepriseId` et l'aperçu a rétréci sans rien casser.
 * `cascadeDepuis` le remplace en **dérivant la cascade du schéma**, pour qu'une
 * relation ajoutée demain y entre d'elle-même. Un garde-fou dont l'aperçu se
 * répare en le recopiant ne garde rien.
 *
 * Ce parcours a quitté ce fichier le 2026-09-04 pour `src/lib/suppression/
 * cascade.ts` : la carte de confirmation de `/entreprises/<id>/modifier`
 * mentait exactement de la même façon, et deux endroits ne doivent pas décrire
 * la même cascade de mémoire.
 *
 *   pnpm tsx --import ./scripts/server-only-hors-next.mjs scripts/remettre-en-onboarding.ts                      # liste les dossiers
 *   pnpm tsx --import ./scripts/server-only-hors-next.mjs scripts/remettre-en-onboarding.ts <userId>
 *   pnpm tsx --import ./scripts/server-only-hors-next.mjs scripts/remettre-en-onboarding.ts <userId> --vraiment
 *
 * **On désigne un dossier par son `userId`, pas par une adresse e-mail**, et la
 * première rédaction de ce script se trompait sur ce point : elle interrogeait
 * `auth.users`, qui n'existe pas dans la base locale. L'identité vit chez
 * Supabase, seul le dossier est ici — la seule clé commune aux deux mondes est
 * l'UUID que `Entreprise.userId` porte. Sans argument, le script liste les
 * dossiers présents avec leur `userId` : c'est là qu'on lit celui qu'on veut.
 */

import { PrismaClient } from "@prisma/client";

// Le parcours du graphe des arêtes `onDelete` vit dans `src/lib/suppression/
// cascade.ts` depuis le 2026-09-04. Il a été écrit ici, pour cet aperçu ; il
// en est sorti le jour où l'on a découvert que la carte de confirmation de
// `/entreprises/<id>/modifier` mentait de la même façon — « L'établissement
// s'en va avec elle », au singulier, sans rien compter. Deux endroits
// décrivaient la même cascade de mémoire ; il n'y en a plus qu'un, et il la
// lit au schéma.
import {
  bloqueraient,
  cascadeDepuis,
} from "@/lib/suppression/cascade";

const prisma = new PrismaClient();

function exigerBaseLocale(): void {
  const url = process.env.DATABASE_URL ?? "";
  const locale = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  if (!locale) {
    console.error(
      "REFUS : DATABASE_URL ne pointe pas sur localhost.\n" +
        "Ce script supprime un dossier complet ; il ne s'exécute que sur la base locale.",
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  exigerBaseLocale();

  const userId = process.argv[2];
  const vraiment = process.argv.includes("--vraiment");

  const dossiers = await prisma.entreprise.findMany({
    include: { etablissements: { select: { id: true, raisonDisplay: true } } },
  });

  // Sans argument : on montre ce qu'il y a, avec la clé qui sert à le désigner.
  // Un script destructif ne doit jamais avoir à deviner sa cible.
  if (!userId || userId.startsWith("--")) {
    console.log(`${dossiers.length} dossier(s) dans la base locale :\n`);
    for (const d of dossiers) {
      console.log(`  ${d.userId ?? "(sans compte)"}  ${d.raisonSociale}`);
    }
    console.log(
      "\nUsage : pnpm tsx --import ./scripts/server-only-hors-next.mjs scripts/remettre-en-onboarding.ts <userId> [--vraiment]",
    );
    return;
  }

  const entreprise = dossiers.find((d) => d.userId === userId);
  if (!entreprise) {
    console.error(
      `Aucun dossier pour ${userId}. Relance sans argument pour voir la liste.`,
    );
    process.exit(1);
  }

  console.log(`Compte    : ${userId}`);
  console.log(
    `Entreprise: ${entreprise.raisonSociale} (SIRET ${entreprise.siret ?? "—"})`,
  );
  console.log(
    `Établ.    : ${entreprise.etablissements.length} — ` +
      entreprise.etablissements.map((e) => e.raisonDisplay).join(", "),
  );

  // L'aperçu compte SUR TOUS LES ÉTABLISSEMENTS, parce que la suppression part
  // de l'Entreprise. Le compte de tête est celui qui se compare à un total,
  // et le détail par table dit d'où il vient.
  const emporte = await cascadeDepuis(prisma, "Entreprise", [entreprise.id]);
  const lignes = [...emporte]
    .filter(([modele]) => modele !== "Entreprise")
    .map(([modele, ids]) => [modele, ids.size] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = lignes.reduce((s, [, n]) => s + n, 0);

  console.log(`\nCe que la suppression emporte — ${total} ligne(s) :`);
  if (lignes.length === 0) {
    console.log("  (rien : l'entreprise n'a aucune ligne rattachée)");
  }
  for (const [modele, n] of lignes) {
    console.log(`  ${String(n).padStart(5)}  ${modele}`);
  }
  console.log(
    "\n  Compté en parcourant les relations onDelete: Cascade du schéma ; une\n" +
      "  relation ajoutée au schéma apparaîtra ici sans toucher ce script.",
  );

  const blocages = await bloqueraient(prisma, emporte);
  if (blocages.length > 0) {
    console.log("\nCE QUI EMPÊCHERAIT LA SUPPRESSION (contrainte non-cascade) :");
    for (const { relation, nombre } of blocages) {
      console.log(
        `  ${String(nombre).padStart(5)}  ${relation.enfant}.${relation.cle}` +
          ` → ${relation.parent}  [${relation.action}]`,
      );
    }
    console.log(
      "\n  PostgreSQL refusera de supprimer le parent tant que ces lignes existent.\n" +
        "  La suppression échouera sur une erreur de contrainte, sans rien effacer.",
    );
  }

  if (!vraiment) {
    console.log("\nRien n'a été supprimé. Relance avec --vraiment pour effacer.");
    return;
  }

  await prisma.entreprise.delete({ where: { id: entreprise.id } });
  console.log(`\nSupprimé. Ce compte est de nouveau en onboarding.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
