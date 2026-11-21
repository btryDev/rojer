"use server";

import { z } from "zod";
import { assertEtablissementDuCompte } from "@/lib/auth/scope";
import { verifierSignature, type VerdictSignature } from "./verification";

const ID = z.string().min(1).max(200);

/**
 * « Vérifier » une signature depuis l'application (2026-11-21, ADR-006
 * amendée) : l'utilisateur connecté, borné à son compte et à
 * l'établissement, recalcule l'empreinte du document signé. Lecture seule :
 * un membre en lecture seule vérifie aussi, et rien n'est écrit.
 */
export async function verifierSignatureDuCompte(
  etablissementId: string,
  signatureId: string,
): Promise<VerdictSignature> {
  const etab = ID.parse(etablissementId);
  const sig = ID.parse(signatureId);
  const { user, db } = await assertEtablissementDuCompte(etab);
  return verifierSignature(db, etab, sig, user.id);
}
