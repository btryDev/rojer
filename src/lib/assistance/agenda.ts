import "server-only";
// Le fichier `.ics` du rendez-vous annuel (ADR-063 § 6) : « Ajouter à mon
// agenda », et l'invitation jointe à la confirmation. Côté serveur seulement —
// sorti du module partagé avec l'écran (relecture React du 2026-11-24).

import type { ModeRendezVous } from "@prisma/client";
import { CONTACT } from "@/lib/contact/message";
import { commentSeParler } from "./rendez-vous-libelles";

/** Un texte d'iCalendar échappé (RFC 5545, § 3.3.11) : antislash, virgule, point-virgule, retour à la ligne. */
function texteIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** « 20261202T080000Z » : un instant en UTC, sans séparateurs. */
function instantIcs(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

const OCTETS = new TextEncoder();

/**
 * Une ligne de contenu pliée à 75 octets au plus (RFC 5545, § 3.1) : la suite
 * repart sur une ligne qui commence par une espace. Coupée entre deux
 * caractères, jamais au milieu d'un caractère UTF-8.
 */
function plier(ligne: string): string {
  const morceaux: string[] = [];
  let courant = "";
  for (const c of ligne) {
    const limite = morceaux.length === 0 ? 75 : 74;
    if (OCTETS.encode(courant + c).length > limite) {
      morceaux.push(courant);
      courant = c;
    } else courant += c;
  }
  morceaux.push(courant);
  return morceaux.join("\r\n ");
}

/**
 * Le fichier `.ics` du rendez-vous : un événement, en UTC, avec des fins de
 * ligne CRLF comme le veut la norme. Le même identifiant d'un bout à l'autre ;
 * `SEQUENCE` croît à chaque changement (`revision`, l'instant du dernier),
 * pour qu'un agenda remplace l'événement déplacé ; `annule` en fait une
 * annulation (`METHOD:CANCEL`), qui le retire (relecture du 2026-11-24).
 */
export function calendrierDuRendezVous(
  r: { id: string; debut: Date; fin: Date; mode: ModeRendezVous; telephone: string | null },
  maintenant: Date,
  { annule = false, revision = maintenant }: { annule?: boolean; revision?: Date } = {},
): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rojer//Assistance//FR",
    "CALSCALE:GREGORIAN",
    `METHOD:${annule ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${r.id}@rojer.fr`,
    // L'organisateur, que la RFC 5546 exige pour PUBLISH et pour CANCEL : sans
    // lui, un agenda peut ignorer l'annulation (relecture du 2026-11-25).
    `ORGANIZER;CN=Rojer:mailto:${CONTACT}`,
    `SEQUENCE:${Math.floor(revision.getTime() / 1000)}`,
    `STATUS:${annule ? "CANCELLED" : "CONFIRMED"}`,
    `DTSTAMP:${instantIcs(maintenant)}`,
    `DTSTART:${instantIcs(r.debut)}`,
    `DTEND:${instantIcs(r.fin)}`,
    `SUMMARY:${texteIcs("Rendez-vous annuel Rojer")}`,
    `DESCRIPTION:${texteIcs(commentSeParler(r.mode, r.telephone))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(plier)
    .join("\r\n")
    .concat("\r\n");
}
