#!/usr/bin/env tsx
//
// Étalement des échéances de vérification des jeux de démonstration.
//
// À la déclaration des équipements, le générateur de calendrier crée toutes
// les premières occurrences à la même date : trente-huit échéances au même
// jour chez Maak. C'est fidèle au fonctionnement du produit pour un
// établissement qui vient de s'inscrire, mais ça produit deux défauts en
// démonstration — un dossier qui n'a manifestement pas vécu, et un bloc
// d'échéances identiques qui masque la lecture (« tout est en retard depuis
// deux jours » dit peu de chose sur la conformité réelle).
//
// L'étalement est **déterministe** : le décalage se dérive d'une empreinte
// du couple obligation + équipement. Relancer le script ne rebat donc pas
// les cartes, et deux exécutions donnent le même dossier — ce qui compte
// quand on prépare une démonstration qu'on rejouera.
//
// Ce que le script ne touche pas : toute ligne qui porte une preuve (rapport,
// action, statut réalisé) ou qui ne s'applique plus. Son échéance ouverte a
// été posée par un dépôt, ou elle appartient à l'historique (`jamaisControlees`).
//
// Réversible : `--annuler` rend aux lignes déplacées leur date d'origine et
// « à planifier », d'après le journal que l'étalement a écrit (voir
// `lignesAEtaler`). À lancer depuis la racine du dépôt.
//
//   pnpm etaler:echeances maak
//   pnpm etaler:echeances maak --annuler

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Prisma, PrismaClient } from "@prisma/client";
import { cleDeLigne } from "@/lib/calendrier/generateur";
import {
  echeancesAnnoncables,
  portantUnePreuve,
} from "@/lib/calendrier/portee";

const ETABLISSEMENTS = {
  paloa: "cmocnriid0002rlti0taekm4y",
  maak: "cmoa4442t0002rlwitios33tc",
} as const;

type Cible = keyof typeof ETABLISSEMENTS;

/** Fenêtre d'étalement, en jours autour d'aujourd'hui. Le bord négatif
 *  laisse quelques retards — un dossier sans aucun retard ne montre pas
 *  grand-chose — sans en faire un dossier sinistré. */
const JOUR_MIN = -100;
const JOUR_MAX = 250;

const prisma = new PrismaClient({ log: [] });

const AUJOURDHUI = new Date();

/**
 * Décalage déterministe pour une occurrence, tiré d'une empreinte de sa clé
 * métier. Deux occurrences de la même obligation sur deux équipements
 * différents tombent à des dates différentes, ce qui est le comportement
 * réel : chaque appareil a son propre historique.
 */
function decalage(cle: string): number {
  const h = createHash("sha256").update(cle).digest();
  const brut = h.readUInt32BE(0);
  return JOUR_MIN + (brut % (JOUR_MAX - JOUR_MIN + 1));
}

/**
 * Les seules lignes que l'étalement a le droit de déplacer : ouvertes,
 * attendues, et sans aucune preuve. Pour la plupart, leur date n'est qu'une
 * date de génération. Deux familles passent aussi le filtre sans l'être : les
 * titres de salarié (date déclarée) et les lignes datées par héritage d'une
 * obligation retirée. La régénération suivante leur rend leur date — le
 * déplacement ne tient pas, il ne détruit rien.
 *
 * Le filtre d'origine était `dateRealisee: null`. Au retrait de la colonne
 * (ADR-034, N5), il avait été ôté sans être remplacé : l'étalement et
 * `--annuler` réécrivaient TOUTES les lignes — l'échéance ouverte qu'un dépôt
 * venait de rouler, et la date d'une ponctuelle consommée, qui est sa seule
 * date (revue du 2026-09-14). Composé des clauses du produit, jamais recopié.
 */
function jamaisControlees(): Prisma.VerificationWhereInput {
  return { AND: [echeancesAnnoncables(), { NOT: portantUnePreuve() }] };
}

/*
 * LA DATE ET LE STATUT S'ÉCRIVENT ENSEMBLE (relecture système du 2026-09-14).
 *
 * Depuis le retrait de `depassee`, le statut dit si une date est une vraie
 * échéance : « à planifier » = date de génération, jamais affichée
 * (`aUnRendezVous`). Le script écrivait la date seule : sur une « à
 * planifier », l'étalement ne se voyait nulle part, et les lignes poussées
 * dans le futur sortaient du retard sans rien montrer.
 *
 * Désormais :
 *  - l'étalement ne prend que les « à planifier » d'appareil ou
 *    d'établissement, et les écrit « planifiée » — la démonstration simule un
 *    planning posé ; les titres de salarié gardent la date que
 *    `echeanceDuTitre` leur calcule ;
 *  - `--annuler` ne touche QUE les lignes que l'étalement a déplacées, lues
 *    dans un journal local (`scripts/.etalement/<cible>.json`, hors git), et
 *    leur rend leur date et « à planifier ». Il prenait toutes les
 *    « planifiée » sans preuve : le générateur en pose lui-même — une mise en
 *    service à venir, une première échéance calculée —, et l'annulation les
 *    rendait « à planifier » à une date passée, que la régénération ne
 *    rattrape plus (garde placeholder du réconciliateur). Relecture du
 *    2026-09-14.
 */
function lignesAEtaler(): Prisma.VerificationWhereInput {
  return { AND: [jamaisControlees(), { salarieId: null, statut: "a_planifier" }] };
}

type Journal = Record<string, string>; // id → datePrevue d'origine (ISO)

const DOSSIER_JOURNAL = join(process.cwd(), "scripts", ".etalement");

function cheminJournal(cible: Cible): string {
  return join(DOSSIER_JOURNAL, `${cible}.json`);
}

function lireJournal(cible: Cible): Journal {
  const chemin = cheminJournal(cible);
  return existsSync(chemin) ? (JSON.parse(readFileSync(chemin, "utf8")) as Journal) : {};
}

function ecrireJournal(cible: Cible, journal: Journal): void {
  mkdirSync(DOSSIER_JOURNAL, { recursive: true });
  writeFileSync(cheminJournal(cible), JSON.stringify(journal, null, 2));
}

function auJour(n: number): Date {
  const d = new Date(AUJOURDHUI);
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function etaler(cible: Cible): Promise<void> {
  const etablissementId = ETABLISSEMENTS[cible];

  const occurrences = await prisma.verification.findMany({
    where: { etablissementId, ...lignesAEtaler() },
    select: {
      id: true,
      datePrevue: true,
      obligationId: true,
      equipementId: true,
      salarieId: true,
    },
  });

  // Le journal AVANT l'écriture : une coupure en cours de boucle laisse des
  // lignes déplacées que `--annuler` doit encore retrouver. Une ligne déjà
  // journalisée garde sa date d'origine, pas celle d'un étalement précédent.
  const journal = lireJournal(cible);
  for (const o of occurrences) {
    journal[o.id] ??= o.datePrevue.toISOString();
  }
  ecrireJournal(cible, journal);

  let deplacees = 0;
  for (const o of occurrences) {
    // Même clé que la réconciliation, produite par la même fonction : le
    // décalage d'une échéance doit rester stable d'un lancement à l'autre, et
    // une seconde construction de la clé divergerait tôt ou tard (ADR-022).
    const nouvelle = auJour(decalage(cleDeLigne(o.obligationId, {
        equipementId: o.equipementId,
        salarieId: o.salarieId,
      })));
    await prisma.verification.update({
      where: { id: o.id },
      data: { datePrevue: nouvelle, statut: "planifiee" },
    });
    deplacees += 1;
  }

  console.log(`${cible} : ${deplacees} échéance(s) étalée(s).`);
}

async function annuler(cible: Cible): Promise<void> {
  const etablissementId = ETABLISSEMENTS[cible];
  const journal = lireJournal(cible);
  let ramenees = 0;
  for (const [id, origine] of Object.entries(journal)) {
    // Toujours ouverte, sans preuve, et encore « planifiée » : un dépôt de
    // rapport depuis l'étalement a fait du rendez-vous un fait, qu'on ne
    // défait pas.
    const r = await prisma.verification.updateMany({
      where: {
        id,
        etablissementId,
        statut: "planifiee",
        ...jamaisControlees(),
      },
      data: { datePrevue: new Date(origine), statut: "a_planifier" },
    });
    ramenees += r.count;
    // Seules les lignes RAMENÉES quittent le journal. Une ligne sautée —
    // archivée entre-temps, ou dont un rapport a été déposé puis retiré —
    // doit rester annulable au prochain passage.
    if (r.count === 1) delete journal[id];
  }
  ecrireJournal(cible, journal);
  console.log(`${cible} : ${ramenees} échéance(s) rendue(s) à leur date d'origine.`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inverse = args.includes("--annuler");
  const demande = args.find((a) => !a.startsWith("--"));

  if (!demande) {
    console.error(
      "Précisez la cible : paloa, maak ou tout. Exemple : pnpm etaler:echeances maak",
    );
    process.exit(1);
  }

  const cibles: Cible[] =
    demande === "tout"
      ? (Object.keys(ETABLISSEMENTS) as Cible[])
      : demande in ETABLISSEMENTS
        ? [demande as Cible]
        : [];

  if (cibles.length === 0) {
    console.error(`Cible inconnue : « ${demande} ». Attendu : paloa, maak ou tout.`);
    process.exit(1);
  }

  for (const cible of cibles) {
    if (inverse) await annuler(cible);
    else await etaler(cible);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
