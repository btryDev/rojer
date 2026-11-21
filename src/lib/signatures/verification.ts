import "server-only";
// Vérifier une signature, dans l'application (2026-11-21, décision de la
// propriétaire, ADR-006 amendée) : plus de page publique `/verifier` ni
// `/signe`. Un utilisateur connecté, borné à son compte, recalcule
// l'empreinte de l'objet ou du fichier signé et apprend si le document a
// changé depuis la signature. La preuve transmise aux tiers est le PDF, avec
// les empreintes.
//
// HORS d'un module `"use server"` : seule l'action
// `verifierSignatureDuCompte` (`./verification-actions`) l'appelle, après
// `assertEtablissementDuCompte`.

import type { Prisma } from "@prisma/client";
import { creerLimiteur } from "@/lib/securite/limiteur";
import { calculerHashObjet, versionDeHash } from "./hash-objet";

/** Ce que la vérification rend à l'écran : des dates en ISO, jamais d'objet. */
export type VerdictSignature =
  /** L'empreinte recalculée est celle de la signature : le document n'a pas changé. */
  | { etat: "intacte"; revoqueLe: string | null }
  /** Le document a changé depuis la signature. */
  | { etat: "modifiee"; hashAttendu: string; hashActuel: string; revoqueLe: string | null }
  /**
   * L'empreinte de la signature a une forme antérieure : le recalcul ne peut
   * pas l'éprouver (deux formes ne se comparent pas, `versionDeHash`).
   */
  | { etat: "version_anterieure"; revoqueLe: string | null }
  /** La signature, l'objet ou le fichier n'existe plus dans ce dossier. */
  | { etat: "introuvable" }
  /** Trop de recalculs à la fois : réessayer dans quelques secondes. */
  | { etat: "occupe" };

/**
 * Recalculs menés de front : chacun peut lire un rapport entier (20 Mo) en
 * mémoire (audit de sécurité du 2026-11-10, repris de l'ancienne page
 * publique). Deux à la fois, quatre en attente, deux au plus par personne.
 */
const recalculs = creerLimiteur({
  simultanes: 2,
  enAttenteMax: 4,
  attenteMaxMs: 10_000,
  parDemandeurMax: 2,
});

/**
 * Vérifie une signature de l'établissement : relue PAR CET ÉTABLISSEMENT
 * (un identifiant d'un autre dossier rend « introuvable »), puis l'empreinte
 * de l'objet signé recalculée et comparée.
 *
 * Une signature révoquée (ADR-061) se vérifie aussi : elle porte sur une
 * version que la correction a remplacée, et l'écran dit qu'elle est révoquée
 * avant de dire si le document a changé — la modification est celle qui a
 * motivé la révocation, décidée et datée.
 */
export async function verifierSignature(
  db: Prisma.TransactionClient,
  etablissementId: string,
  signatureId: string,
  demandeur: string,
): Promise<VerdictSignature> {
  const signature = await db.signature.findFirst({
    where: { id: signatureId, etablissementId },
    select: { objetType: true, objetId: true, hashDocument: true, revoqueLe: true, active: true },
  });
  if (!signature) return { etat: "introuvable" };
  const revoqueLe = signature.active === null ? (signature.revoqueLe?.toISOString() ?? null) : null;

  const liberer = await recalculs.reserver(demandeur);
  if (!liberer) return { etat: "occupe" };
  try {
    const h = await calculerHashObjet(db, signature.objetType, signature.objetId, etablissementId);
    if (!h.ok) return { etat: "introuvable" };
    // Deux empreintes de formes différentes ne se comparent pas : on ne
    // conclut ni « modifié » ni « intact » (le correctif du 2026-09-07).
    if (versionDeHash(h.hash) !== versionDeHash(signature.hashDocument)) {
      return { etat: "version_anterieure", revoqueLe };
    }
    if (h.hash !== signature.hashDocument) {
      return { etat: "modifiee", hashAttendu: signature.hashDocument, hashActuel: h.hash, revoqueLe };
    }
    return { etat: "intacte", revoqueLe };
  } finally {
    liberer();
  }
}
