import "server-only";
// Ce que la synchronisation de l'agenda du préventeur (ADR-064) lit et écrit
// en base. Hors session, hors compte : `CreneauAssistance` et `ImportAgenda`
// en SQL paramétré (nommé dans la garde du SQL brut) ; la lecture des
// rendez-vous qui donne leur titre aux créneaux réservés passe par la
// transaction ; le client brut ne sert qu'à la purge, à la cadence et au lien d'un
// événement créé après la transaction (nommé
// dans `portee/imports.test.ts`).
//
// Les colonnes sont des TIMESTAMP(3) sans fuseau où Prisma range de l'UTC
// (ADR-011 § 1), comme `assistance/creneaux.ts`.

import type { ModeRendezVous, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { surUneLigne } from "@/lib/validation/texte";
import type { Fenetre } from "../creneaux";
import { TITRE, type CreneauConnu } from "./reconciliation";

type Tx = Prisma.TransactionClient;

/** Une seule synchronisation à la fois : deux exécutions qui se chevauchent passent l'une après l'autre. */
export async function verrouillerLaSynchronisation(tx: Tx): Promise<void> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('rojer:agenda-preventeur'))::text AS "verrou"`;
}

/**
 * L'heure du dernier passage, accepté ou refusé : la cadence se lit dessus
 * (`tache.ts`). Lue sous le verrou, elle départage deux instances que la
 * crontab lance à la même minute.
 */
export async function dernierPassage(tx: Tx): Promise<Date | null> {
  const [ligne] = await tx.$queryRaw<{ recuLe: Date | null }[]>`
    SELECT max("recuLe") AS "recuLe" FROM "ImportAgenda"`;
  return ligne?.recuLe ?? null;
}

/** La même heure, lue sans verrou : une économie avant d'appeler Google. */
export async function dernierPassageHorsVerrou(): Promise<Date | null> {
  const [ligne] = await prisma.$queryRaw<{ recuLe: Date | null }[]>`
    SELECT max("recuLe") AS "recuLe" FROM "ImportAgenda"`;
  return ligne?.recuLe ?? null;
}

/**
 * Lie un créneau à l'événement que Rojer vient de créer, s'il porte encore
 * l'événement d'avant (`ancien`). `false` : le créneau a changé entre-temps ;
 * l'événement créé sera repris par son heure au passage suivant.
 */
export async function lierEvenement(l: { creneauId: string; ancien: string | null; evenementId: string }): Promise<boolean> {
  const lignes = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "CreneauAssistance" SET "evenementAgendaId" = ${l.evenementId}
    WHERE "id" = ${l.creneauId}::uuid AND "evenementAgendaId" IS NOT DISTINCT FROM ${l.ancien}
    RETURNING "id"`;
  return lignes.length > 0;
}

type LigneCreneau = { id: string; debut: Date; fin: Date; evenementAgendaId: string | null; reserve: boolean };

/** Les créneaux qui commencent dans la fenêtre, et ceux que portent les événements reçus. */
export async function creneauxConcernes(tx: Tx, fenetre: Fenetre, evenementIds: string[]): Promise<LigneCreneau[]> {
  return tx.$queryRaw<LigneCreneau[]>`
    SELECT "id", "debut", "fin", "evenementAgendaId", ("reserveLe" IS NOT NULL) AS "reserve"
    FROM "CreneauAssistance"
    WHERE ("debut" >= (${fenetre.depuis}::timestamptz AT TIME ZONE 'UTC')
           AND "debut" < (${fenetre.jusqua}::timestamptz AT TIME ZONE 'UTC'))
       OR "evenementAgendaId" = ANY(${evenementIds}::text[])
    ORDER BY "debut"`;
}

/** La raison sociale dans un titre d'agenda : sur une ligne, 40 caractères au plus. */
const LONGUEUR_RAISON_SOCIALE = 40;

/** « Réservé — <raison sociale> — visio » : la raison sociale de la première entreprise du compte. */
export function titreReserve(raisonSociale: string | null, mode: ModeRendezVous): string {
  // Coupée par caractères, pas par unités UTF-16 : un emoji n'est jamais tranché.
  const nom = raisonSociale ? Array.from(surUneLigne(raisonSociale)).slice(0, LONGUEUR_RAISON_SOCIALE).join("").trim() : "";
  const comment = mode === "visio" ? "visio" : "téléphone";
  return nom ? `${TITRE.reserve} — ${nom} — ${comment}` : `${TITRE.reserve} — ${comment}`;
}

/** Les titres des créneaux réservés, par créneau : ni téléphone ni sujet, qui restent à l'équipe. */
export async function titresDesReserves(tx: Tx, creneauIds: string[]): Promise<Map<string, string>> {
  if (creneauIds.length === 0) return new Map();
  // Dans la transaction qui tient le verrou : une seule connexion par
  // synchronisation (revue du 2026-11-25).
  const rendezVous = await tx.rendezVousAssistance.findMany({
    where: { creneauId: { in: creneauIds }, annuleLe: null },
    select: {
      creneauId: true,
      mode: true,
      compte: { select: { entreprises: { select: { raisonSociale: true }, orderBy: { createdAt: "asc" }, take: 1 } } },
    },
  });
  return new Map(
    rendezVous.map((r) => [r.creneauId, titreReserve(r.compte.entreprises[0]?.raisonSociale ?? null, r.mode)]),
  );
}

export function enCreneauxConnus(lignes: LigneCreneau[], titres: Map<string, string>): CreneauConnu[] {
  return lignes.map((l) => ({
    id: l.id,
    debut: l.debut,
    fin: l.fin,
    evenementId: l.evenementAgendaId,
    reserve: l.reserve,
    titreReserve: l.reserve ? (titres.get(l.id) ?? null) : null,
  }));
}

// Les écritures. Chacune est conditionnelle : elle ne touche un créneau que
// s'il est encore libre (`reserveLe IS NULL`) et encore dans l'état lu — une
// réservation prise entre-temps gagne toujours (§ 3, point 6). `false` : rien
// n'a été écrit.
//
// Un créneau déplacé se ferme et se rouvre, sous un NOUVEL identifiant
// (revue du 2026-11-25) : la réservation prend un créneau par son
// identifiant, et un client qui a choisi mardi 10 h ne doit pas se retrouver
// jeudi 15 h parce que le préventeur l'a déplacé entre-temps. Sa demande
// tombe alors sur « créneau déjà pris ou retiré ».

export async function ouvrir(tx: Tx, o: { evenementId: string | null; debut: Date; fin: Date }): Promise<boolean> {
  const lignes = await tx.$queryRaw<{ id: string }[]>`
    INSERT INTO "CreneauAssistance" ("debut", "fin", "evenementAgendaId")
    VALUES ((${o.debut}::timestamptz AT TIME ZONE 'UTC'), (${o.fin}::timestamptz AT TIME ZONE 'UTC'), ${o.evenementId})
    ON CONFLICT DO NOTHING
    RETURNING "id"`;
  return lignes.length > 0;
}

export async function fermer(tx: Tx, f: { creneauId: string; evenementId: string | null }): Promise<boolean> {
  const lignes = await tx.$queryRaw<{ id: string }[]>`
    DELETE FROM "CreneauAssistance"
    WHERE "id" = ${f.creneauId}::uuid AND "reserveLe" IS NULL
      AND "evenementAgendaId" IS NOT DISTINCT FROM ${f.evenementId}
    RETURNING "id"`;
  return lignes.length > 0;
}

/**
 * Les créneaux de la fenêtre sans événement : heures découpées, ouvertes par
 * script, ou dont la création d'événement a échoué. Leur événement est créé
 * après la transaction (`tache.ts`).
 */
export async function creneauxSansEvenement(tx: Tx, fenetre: Fenetre): Promise<LigneCreneau[]> {
  return tx.$queryRaw<LigneCreneau[]>`
    SELECT "id", "debut", "fin", "evenementAgendaId", ("reserveLe" IS NOT NULL) AS "reserve"
    FROM "CreneauAssistance"
    WHERE "evenementAgendaId" IS NULL
      AND "debut" >= (${fenetre.depuis}::timestamptz AT TIME ZONE 'UTC')
      AND "debut" < (${fenetre.jusqua}::timestamptz AT TIME ZONE 'UTC')
    ORDER BY "debut"`;
}

export async function rattacher(
  tx: Tx,
  r: { creneauId: string; evenementId: string | null; ancien: string | null },
): Promise<boolean> {
  const lignes = await tx.$queryRaw<{ id: string }[]>`
    UPDATE "CreneauAssistance" SET "evenementAgendaId" = ${r.evenementId}
    WHERE "id" = ${r.creneauId}::uuid AND "evenementAgendaId" IS NOT DISTINCT FROM ${r.ancien}
    RETURNING "id"`;
  return lignes.length > 0;
}

export type Bilan = { ouverts: number; deplaces: number; fermes: number; rattaches: number; conflits: number };

export async function journaliser(
  tx: Tx,
  // `quand` : l'heure du passage, celle que lit la cadence — une seule horloge.
  j: { quand: Date; accepte: boolean; motif: string | null; bilan?: Bilan },
): Promise<void> {
  const b = j.bilan ?? { ouverts: 0, deplaces: 0, fermes: 0, rattaches: 0, conflits: 0 };
  await tx.$executeRaw`
    INSERT INTO "ImportAgenda" ("recuLe", "accepte", "motif", "ouverts", "deplaces", "fermes", "rattaches", "conflits")
    VALUES ((${j.quand}::timestamptz AT TIME ZONE 'UTC'), ${j.accepte}, ${j.motif},
            ${b.ouverts}, ${b.deplaces}, ${b.fermes}, ${b.rattaches}, ${b.conflits})`;
}

/**
 * Un passage qui n'a pas pu lire l'agenda (Google en panne, accès retiré) :
 * journalisé comme refusé, pour que la cadence vaille aussi en panne — sans
 * lui, la crontab rappellerait Google chaque minute.
 */
export async function journaliserUnEchec(quand: Date, motif: "google" | "configuration"): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "ImportAgenda" ("recuLe", "accepte", "motif")
    VALUES ((${quand}::timestamptz AT TIME ZONE 'UTC'), false, ${motif})`;
}

/** La tâche quotidienne : le journal se garde un an. */
export async function purgerLeJournalDeLAgenda(maintenant: Date): Promise<number> {
  return prisma.$executeRaw`
    DELETE FROM "ImportAgenda"
    WHERE "recuLe" < ((${maintenant}::timestamptz AT TIME ZONE 'UTC') - interval '1 year')`;
}
