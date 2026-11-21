"use server";

import { z } from "zod";
import { ObjetSignable } from "@prisma/client";
import { verifierSaisie } from "@/lib/abonnements/saisie";
import { assertEtablissementDuCompte } from "@/lib/auth/scope";
import { envoyerCodeSignatureCompte, poserSignatureCompteAvecCode, type EnvoiCodeCompte } from "./code-compte";
import { texteConsentementPour } from "./consentement";

/**
 * La signature depuis le compte, pour tout objet signable (2026-11-21,
 * décision de la propriétaire) : une seule voie, le code par e-mail et le
 * consentement enregistré (`code-compte.ts`). ~~`signerEnCompteConnecte`~~,
 * qui signait d'un clic, est retirée. La fiche du plan garde ses actions
 * (`plan-prevention/signature-fiche-actions.ts`), qui envoient en plus le
 * lien à l'entreprise extérieure ; elles appellent le même module.
 */

const OBJET = z.object({
  etablissementId: z.string().min(1).max(200),
  objetType: z.nativeEnum(ObjetSignable),
  objetId: z.string().min(1).max(200),
});
type Objet = z.infer<typeof OBJET>;

export type SignerDuCompteState =
  | { status: "idle" }
  | { status: "error"; message: string; codeAReDemander?: boolean }
  | { status: "success"; message: string };

/** Envoie le code de signature à l'adresse du compte connecté. */
export async function demanderCodeSignatureDuCompte(objet: Objet): Promise<EnvoiCodeCompte> {
  await verifierSaisie();
  const o = OBJET.parse(objet);
  // L'appartenance établie ici (garde `tenancy-ecritures`), refaite par le module.
  await assertEtablissementDuCompte(o.etablissementId);
  return envoyerCodeSignatureCompte(o);
}

/**
 * Pose la signature du compte avec le bon code et la case cochée. Le texte
 * enregistré est recomposé ici depuis les données du dossier — jamais un
 * texte venu du navigateur.
 */
export async function signerDuCompteAvecCode(
  objet: Objet,
  _prev: SignerDuCompteState,
  formData: FormData,
): Promise<SignerDuCompteState> {
  await verifierSaisie();
  const o = OBJET.parse(objet);
  const { db } = await assertEtablissementDuCompte(o.etablissementId);
  const etab = await db.etablissement.findFirst({
    where: { id: o.etablissementId },
    select: { entreprise: { select: { raisonSociale: true } } },
  });
  const coche = formData.get("consentement") === "on";
  const r = await poserSignatureCompteAvecCode({
    ...o,
    code: String(formData.get("code") ?? ""),
    consentement: coche
      ? { texte: texteConsentementPour(o.objetType, etab?.entreprise.raisonSociale ?? "") }
      : null,
  });
  if (!r.ok) return { status: "error", message: r.message, codeAReDemander: r.codeAReDemander };
  return { status: "success", message: "Votre signature est posée." };
}
