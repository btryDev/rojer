"use server";

// « Me prévenir » (`/bientot`, 2026-11-23, décision de la propriétaire :
// inscriptions fermées tant que Stripe n'a pas validé le compte,
// `lib/ouverture.ts`). Une adresse s'enregistre dans `DemandeOuverture`, et
// rien d'autre : aucun e-mail ne part, la liste ne se lit nulle part dans
// l'application. Le jour de l'ouverture, un seul envoi, puis la table se vide.

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ipPourLimite } from "@/lib/securite/ip-client";
import { cleLimite, consommer, LIMITES, messageTropDeTentatives } from "@/lib/securite/limite-debit";
import { CHAMP_PIEGE, schemaDemandeOuverture, type EtatDemandeOuverture } from "./formulaire";

/**
 * Enregistre l'adresse. La même deux fois = le même succès (une ligne,
 * `ON CONFLICT DO NOTHING`) : la page ne dit pas qui s'est déjà inscrit. Le
 * champ piège rempli rend aussi le succès, sans rien écrire ni consommer.
 */
export async function demanderOuvertureAction(
  _prev: EtatDemandeOuverture,
  formData: FormData,
): Promise<EtatDemandeOuverture> {
  const piege = formData.get(CHAMP_PIEGE);
  const parsed = schemaDemandeOuverture.safeParse({ email: formData.get("email") });
  if (typeof piege === "string" && piege.trim() !== "") {
    return parsed.success ? { email: parsed.data.email } : {};
  }
  if (!parsed.success) {
    return { erreur: parsed.error.issues[0]?.message ?? "Adresse e-mail invalide." };
  }

  // Par réseau, et tous réseaux confondus (contrôle de sécurité du
  // 2026-11-23). Sans IP lisible (appel direct, en-tête absent), toutes ces
  // requêtes partagent une même clé : la limite s'applique toujours — comme
  // l'enregistrement des clients OAuth (`api/auth/[...all]`).
  const ip = ipPourLimite(await headers()) ?? "inconnue";
  const verdict = await consommer([
    { cle: cleLimite("demande-ouverture", "ip", ip), limite: LIMITES.demandeOuvertureIp },
    { cle: cleLimite("demande-ouverture", "global", "tout"), limite: LIMITES.demandeOuvertureGlobale },
  ]);
  if (!verdict.ok) return { erreur: messageTropDeTentatives(verdict.reessayerDansSecondes) };

  try {
    await prisma.demandeOuverture.createMany({ data: [{ email: parsed.data.email }], skipDuplicates: true });
  } catch (erreur) {
    console.error(
      "[demande-ouverture] enregistrement impossible :",
      erreur instanceof Error ? erreur.message : erreur,
    );
    return { erreur: "L'enregistrement n'a pas abouti. Réessayez dans un instant." };
  }
  return { email: parsed.data.email };
}
