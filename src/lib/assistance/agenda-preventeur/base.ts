import "server-only";
// Ce que la synchronisation de l'agenda du préventeur (ADR-064) lit et écrit
// en base. Hors session, hors compte : `CreneauAssistance` et `ImportAgenda`
// en SQL paramétré (nommé dans la garde du SQL brut) ; la lecture des
// rendez-vous qui donne leur titre aux créneaux réservés passe par la
// transaction. Le client brut sert à prendre et à marquer un passage, à lier
// un événement créé après la transaction et à la purge (nommé dans
// `portee/imports.test.ts`).
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
 * Prend le passage : une ligne « en cours » au journal, si aucun passage n'a
 * eu lieu depuis `intervalleMs`. Sous le verrou : deux instances que la
 * crontab lance à la même minute n'en prennent qu'un, AVANT d'appeler Google ;
 * un passage en échec compte aussi, la cadence vaut en panne. Rend
 * l'identifiant de la ligne, ou `null`.
 */
export async function prendreLePassage(quand: Date, intervalleMs: number): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    await verrouillerLaSynchronisation(tx);
    const [ligne] = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO "ImportAgenda" ("recuLe", "accepte", "motif")
      SELECT (${quand}::timestamptz AT TIME ZONE 'UTC'), false, 'en-cours'
      WHERE NOT EXISTS (
        SELECT 1 FROM "ImportAgenda"
        WHERE "recuLe" > ((${quand}::timestamptz AT TIME ZONE 'UTC') - make_interval(secs => ${intervalleMs / 1000})))
      RETURNING "id"`;
    return ligne?.id ?? null;
  });
}

export type Bilan = { ouverts: number; deplaces: number; fermes: number; rattaches: number; conflits: number };

/** Clôt la ligne du passage : accepté avec son bilan, ou refusé avec son motif. */
export async function clorePassage(tx: Tx, id: string, j: { accepte: boolean; motif: string | null; bilan?: Bilan }): Promise<void> {
  const b = j.bilan ?? { ouverts: 0, deplaces: 0, fermes: 0, rattaches: 0, conflits: 0 };
  await tx.$executeRaw`
    UPDATE "ImportAgenda" SET "accepte" = ${j.accepte}, "motif" = ${j.motif},
      "ouverts" = ${b.ouverts}, "deplaces" = ${b.deplaces}, "fermes" = ${b.fermes},
      "rattaches" = ${b.rattaches}, "conflits" = ${b.conflits}
    WHERE "id" = ${id}::uuid`;
}

/** Un passage qui n'a pas pu lire l'agenda (Google en panne, accès retiré). */
export async function marquerEchec(id: string): Promise<void> {
  await prisma.$executeRaw`UPDATE "ImportAgenda" SET "motif" = 'google' WHERE "id" = ${id}::uuid`;
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

/**
 * Les créneaux de la fenêtre sans événement : heures découpées, détachés,
 * ouverts par script, ou dont la création d'événement a échoué. Leur
 * événement est créé après la transaction (`tache.ts`).
 */
export async function creneauxSansEvenement(tx: Tx, fenetre: Fenetre): Promise<{ id: string; debut: Date; fin: Date }[]> {
  return tx.$queryRaw<{ id: string; debut: Date; fin: Date }[]>`
    SELECT "id", "debut", "fin"
    FROM "CreneauAssistance"
    WHERE "evenementAgendaId" IS NULL
      AND "debut" >= (${fenetre.depuis}::timestamptz AT TIME ZONE 'UTC')
      AND "debut" < (${fenetre.jusqua}::timestamptz AT TIME ZONE 'UTC')
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

/**
 * Les lignes lues, avec le titre de celles qui sont réservées : ni téléphone
 * ni sujet, qui restent à l'équipe. Dans la transaction qui tient le verrou :
 * une seule connexion par synchronisation (revue du 2026-11-25).
 */
export async function enCreneauxConnus(tx: Tx, lignes: LigneCreneau[]): Promise<CreneauConnu[]> {
  const reserves = lignes.filter((l) => l.reserve).map((l) => l.id);
  const rendezVous =
    reserves.length === 0
      ? []
      : await tx.rendezVousAssistance.findMany({
          where: { creneauId: { in: reserves }, annuleLe: null },
          select: {
            creneauId: true,
            mode: true,
            compte: { select: { entreprises: { select: { raisonSociale: true }, orderBy: { createdAt: "asc" }, take: 1 } } },
          },
        });
  const titres = new Map(
    rendezVous.map((r) => [r.creneauId, titreReserve(r.compte.entreprises[0]?.raisonSociale ?? null, r.mode)]),
  );
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

/** Lie le créneau à un événement — ou l'en détache (`null`) —, s'il porte encore `ancien`. */
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

/**
 * Lie un créneau sans événement à celui que Rojer vient de créer, s'il est
 * encore sans événement ; sinon, l'événement créé est repris par son heure au
 * passage suivant.
 */
export async function lierEvenement(creneauId: string, evenementId: string): Promise<void> {
  await prisma.$transaction((tx) => rattacher(tx, { creneauId, evenementId, ancien: null }));
}

/** La tâche quotidienne : le journal se garde un an. */
export async function purgerLeJournalDeLAgenda(maintenant: Date): Promise<number> {
  return prisma.$executeRaw`
    DELETE FROM "ImportAgenda"
    WHERE "recuLe" < ((${maintenant}::timestamptz AT TIME ZONE 'UTC') - interval '1 year')`;
}
