#!/usr/bin/env tsx
//
// Jeu de démonstration du porteur salarié (ADR-023) — **additif, idempotent,
// réversible**, comme `seed-demo.ts` dont il reprend les trois règles.
//
// POURQUOI CE SCRIPT EXISTE. Le lot du porteur salarié livre le modèle, le
// moteur et une obligation, mais aucun écran de saisie (l'écran Équipe est arrivé depuis, ce script reste utile pour peupler vite) : il n'existe aujourd'hui
// aucun moyen de créer un `Salarie` ni de déclarer un `TitreSalarie`. Tout le
// chemin est donc inatteignable, et une relecture l'a relevé comme le défaut
// structurant du lot. Ce script est la passerelle en attendant l'écran — il
// permet de voir la ligne apparaître au calendrier, de vérifier qu'elle nomme
// la personne et non « Tout l'établissement », et que la fiche refuse le
// téléversement d'une pièce médicale.
//
// CE QU'IL N'EST PAS : un substitut à l'écran. Un script de démonstration ne
// remplace pas une saisie, et personne d'autre que nous ne le lancera.
//
// LES DONNÉES SONT FICTIVES, et le fait mérite d'être dit dans un fichier qui
// écrit des noms de personnes : ce sont des personnages, pas des salariés.
// Le suivi nominatif traite de vraies données de santé-sécurité (RGPD 6.1.c,
// cf. docs/rgpd.md) ; y verser des identités réelles « pour tester » serait
// exactement ce que ce produit s'interdit.
//
// AVANT DE LANCER — vérifier sur quelle base pointe le `.env`. Ce script écrit.
// Le 2026-08-27, une commande Prisma banale a vidé la production parce que
// personne ne vérifiait cette ligne-là. `npx prisma migrate status` le dit en
// une seconde.
//
// Usage :
//   pnpm tsx scripts/seed-salaries-demo.ts            # crée
//   pnpm tsx scripts/seed-salaries-demo.ts --annuler  # retire ce qu'il a créé

import { PrismaClient } from "@prisma/client";
import { obligationParId } from "@/lib/referentiels/conformite";
import { estPorteeParSalarie } from "@/lib/referentiels/conformite/types";
import { portantUnePreuve } from "@/lib/calendrier/portee";

const prisma = new PrismaClient();

/** L'obligation à porteur salarié livrée par l'ADR-023. */
const OBLIGATION = "elec-salarie-attestation-medicale-voisinage";

/**
 * Les personnages. Le préfixe rend le nettoyage sûr : `--annuler` ne supprime
 * que ce qui le porte, jamais un salarié réel saisi entre-temps.
 */
const PREFIXE = "[démo] ";

type Personnage = {
  prenom: string;
  nom: string;
  poste: string;
  entreLe: string;
  /** Délivrance du titre. */
  delivreLe: string;
  /**
   * Échéance déclarée, ou `null` pour la laisser calculer depuis la
   * périodicité. Les deux chemins méritent d'être vus.
   */
  echeanceLe: string | null;
  note: string;
};

const PERSONNAGES: Personnage[] = [
  {
    prenom: "Camille",
    nom: `${PREFIXE}Roussel`,
    poste: "Technicien de maintenance",
    entreLe: "2021-03-01",
    delivreLe: "2024-06-12",
    // Échéance laissée au calcul : cinq ans après la délivrance, comme
    // R. 4544-11-1 l'écrit. Donne une ligne « planifiée ».
    echeanceLe: null,
    note: "Habilitation BR — organisme : APAVE",
  },
  {
    prenom: "Samir",
    nom: `${PREFIXE}Benali`,
    poste: "Responsable technique",
    entreLe: "2018-09-15",
    delivreLe: "2019-04-02",
    // Échéance DÉCLARÉE, et volontairement incohérente avec un calcul à cinq
    // ans : c'est le cas de la transition de R. 4544-10, qui laisse valides
    // jusqu'au 2030-10-01 les attestations du régime antérieur. Sert à vérifier
    // que la date déclarée prime bien sur tout calcul.
    echeanceLe: "2030-10-01",
    note: "Régime antérieur au décret 2025-355 — transition jusqu'au 01/10/2030",
  },
  {
    prenom: "Léa",
    nom: `${PREFIXE}Fontaine`,
    poste: "Électricienne",
    entreLe: "2023-01-09",
    delivreLe: "2019-11-20",
    // Échéance PASSÉE : donne une ligne « dépassée », pour voir le rendu en
    // retard et le compteur du tableau de bord.
    echeanceLe: "2024-11-20",
    note: "Attestation expirée — à renouveler",
  },
];

function jour(iso: string): Date {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Date invalide : ${iso}`);
  return d;
}

async function creer(): Promise<void> {
  // Garde-fou : le script n'a de sens que si l'obligation existe encore et
  // qu'elle est bien nominative. Sans ça, il créerait des titres que le
  // générateur ignorerait en silence — et on chercherait l'erreur ailleurs.
  const o = obligationParId(OBLIGATION);
  if (!o) {
    throw new Error(
      `L'obligation « ${OBLIGATION} » n'existe plus au référentiel. ` +
        "Le script est périmé : vérifier `OBLIGATIONS_RETIREES`.",
    );
  }
  if (!estPorteeParSalarie(o)) {
    throw new Error(
      `L'obligation « ${OBLIGATION} » n'est plus portée par un salarié. ` +
        "Des titres déclarés dessus ne produiraient aucune ligne.",
    );
  }

  const etablissements = await prisma.etablissement.findMany({
    select: { id: true, raisonDisplay: true },
  });
  if (etablissements.length === 0) {
    console.log("Aucun établissement en base : rien à faire.");
    return;
  }

  for (const etab of etablissements) {
    for (const p of PERSONNAGES) {
      // Idempotence : reconnu par (établissement, nom, prénom).
      const existant = await prisma.salarie.findFirst({
        where: { etablissementId: etab.id, nom: p.nom, prenom: p.prenom },
        select: { id: true },
      });

      const salarie =
        existant ??
        (await prisma.salarie.create({
          data: {
            etablissementId: etab.id,
            nom: p.nom,
            prenom: p.prenom,
            poste: p.poste,
            entreLe: jour(p.entreLe),
          },
          select: { id: true },
        }));

      // `upsert` sur la clé (salarié, obligation) : un salarié ne détient
      // qu'une fois le même titre, le renouvellement met à jour les dates.
      await prisma.titreSalarie.upsert({
        where: {
          salarieId_obligationId: {
            salarieId: salarie.id,
            obligationId: OBLIGATION,
          },
        },
        create: {
          salarieId: salarie.id,
          obligationId: OBLIGATION,
          delivreLe: jour(p.delivreLe),
          echeanceLe: p.echeanceLe ? jour(p.echeanceLe) : null,
          note: p.note,
        },
        update: {
          delivreLe: jour(p.delivreLe),
          echeanceLe: p.echeanceLe ? jour(p.echeanceLe) : null,
          note: p.note,
        },
      });
    }
    console.log(
      `${etab.raisonDisplay} : ${PERSONNAGES.length} salarié(s) de démonstration et leurs titres.`,
    );
  }

  console.log(
    "\nOuvrez le calendrier de l'établissement : la régénération se déclenche " +
      "toute seule (la version du référentiel a changé) et les lignes doivent " +
      "porter le NOM des personnes, pas « Tout l'établissement ».",
  );
}

async function annuler(etablissementId: string): Promise<void> {
  // Les titres partent avec le salarié par cascade ; les lignes de calendrier,
  // elles, sont en `Restrict` (ADR-023) — c'est délibéré, la preuve d'une
  // habilitation ne doit pas disparaître avec la fiche de la personne. On les
  // retire donc explicitement, ce qui n'est acceptable QUE parce que ces
  // salariés-là sont fictifs.
  //
  // TROIS GARDES, et chacune ferme un trou réel de la première version :
  //
  //  1. `etablissementId` dans le `where` — mais ATTENTION à ce que cette
  //     garde fait vraiment, parce que je l'ai d'abord décrite faux. Elle rend
  //     chaque `deleteMany` précis ; elle ne RÉDUIT PAS l'ensemble atteint.
  //     `main()` boucle sur tous les établissements de la base, sans filtre
  //     d'utilisateur ni d'entreprise — exactement comme `creer()`. Le
  //     périmètre est donc le même qu'avant.
  //
  //     La garde qui borne réellement, c'est la DEUXIÈME — le refus si une
  //     ligne porte une preuve.
  //  2. Un `deleteMany` sur `Verification` contourne le `ON DELETE RESTRICT`
  //     posé exprès, et emporte en cascade les `RapportVerification` et les
  //     `Action` attachés. On refuse donc de toucher une ligne qui porte une
  //     preuve : le commentaire ci-dessus énonçait la condition de sûreté
  //     (« ces salariés-là sont fictifs ») sans jamais la vérifier.
  //  3. Le préfixe reste, mais il ne suffit pas seul : rien n'empêche un vrai
  //     salarié de porter un nom qui commence par la même chaîne.
  const salaries = await prisma.salarie.findMany({
    where: { etablissementId, nom: { startsWith: PREFIXE } },
    select: { id: true },
  });
  if (salaries.length === 0) {
    console.log("Aucun salarié de démonstration à retirer.");
    return;
  }
  const ids = salaries.map((s) => s.id);

  const avecPreuve = await prisma.verification.findMany({
    // La définition du produit, jamais une copie : la copie d'ici avait perdu
    // son témoin de réalisation au retrait de `dateRealisee` sans gagner le
    // statut réalisé qui le remplace, et le `deleteMany` qui suit emportait
    // une ligne dont le statut était la seule preuve (revue du 2026-09-14).
    where: { salarieId: { in: ids }, ...portantUnePreuve() },
    select: { id: true, libelleObligation: true },
  });
  if (avecPreuve.length > 0) {
    console.error(
      `REFUS : ${avecPreuve.length} ligne(s) de calendrier de ces salariés ` +
        `portent une preuve (réalisation, rapport ou action). Les supprimer ` +
        `contournerait le garde-fou du schéma et détruirait des pièces.\n` +
        avecPreuve.map((v) => `  - ${v.libelleObligation}`).join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const verifs = await prisma.verification.deleteMany({
    where: { salarieId: { in: ids }, etablissementId },
  });
  const supprimes = await prisma.salarie.deleteMany({
    where: { id: { in: ids }, etablissementId },
  });

  console.log(
    `${supprimes.count} salarié(s) de démonstration retiré(s), ` +
      `${verifs.count} ligne(s) de calendrier avec.`,
  );
}

async function main(): Promise<void> {
  const annulation = process.argv.includes("--annuler");
  if (annulation) {
    // Établissement par établissement, et non d'un seul `deleteMany` global :
    // le filtre de tenancy n'a de sens que s'il porte une valeur, et chaque
    // établissement doit pouvoir être refusé séparément si l'un d'eux porte
    // une preuve.
    const etablissements = await prisma.etablissement.findMany({
      select: { id: true, raisonDisplay: true },
    });
    for (const etab of etablissements) {
      console.log(`— ${etab.raisonDisplay}`);
      await annuler(etab.id);
    }
  } else {
    await creer();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
