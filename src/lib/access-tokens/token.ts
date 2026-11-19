import { randomBytes } from "node:crypto";
import { sha256Hex } from "@/lib/signatures/hash";

/**
 * Génération et manipulation de tokens d'accès externe (ADR-007).
 *
 * - Format : 32 octets aléatoires, encodés en base64url = 43 caractères.
 *   Suffisamment long pour être unique (2^256) et court pour l'URL.
 * - Le clair n'existe qu'en mémoire le temps de l'envoi email ; seul son
 *   SHA-256 est stocké (`tokenHash`).
 */

export const TOKEN_TTL_HOURS_DEFAULT = 168; // 7 jours
// ~~72 h~~ [2026-11-19, décision de la propriétaire : 7 jours. Une entreprise
// extérieure de TPE n'ouvre pas toujours sa boîte dans les trois jours ; le
// code, lui, garde ses 10 minutes et ses 3 essais par lien.]
export const TOKEN_TTL_HOURS_SIGNATURE = 168;
export const TOKEN_TTL_HOURS_CONSULTATION = 30 * 24;

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return sha256Hex(token);
}

export function ttlHoursFor(
  scope: "signature" | "depot_rapport" | "consultation",
): number {
  switch (scope) {
    case "signature":
      return TOKEN_TTL_HOURS_SIGNATURE;
    case "consultation":
      return TOKEN_TTL_HOURS_CONSULTATION;
    case "depot_rapport":
    default:
      return TOKEN_TTL_HOURS_DEFAULT;
  }
}

export function expirationFromNow(ttlHours: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
}
