import "server-only";
// Vérification publique d'intégrité d'une signature (ADR-006, page
// `/verifier/[signatureId]`).
//
// HORS du module `"use server"` des signatures (audit OWASP B14, audit Next.js
// M11, 2026-10-14). Exportée de `./actions`, elle était aussi une action
// serveur : n'importe qui pouvait la déclencher par POST sur n'importe quelle
// page, hors de toute limite, et elle recalcule une empreinte qui lit jusqu'à
// 20 Mo. Son seul appelant légitime est la page, qui la précède de la
// limitation de débit par IP (`LIMITES.verificationIp`).

import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ipClient } from "@/lib/securite/ip-client";
import { cleLimite, consommer, LIMITES } from "@/lib/securite/limite-debit";
import { calculerHashObjet, versionDeHash } from "./hash-objet";
import { SELECT_PREUVE } from "./preuve";
import { clientDuProprietaire } from "@/lib/auth/compte-hors-session";

/**
 * Élément de preuve exposé publiquement par `/verifier/[signatureId]`.
 *
 * **Volontairement restreint.** La page de vérification est publique par
 * conception : un tiers (inspecteur, assureur, acquéreur) doit pouvoir
 * contrôler qu'une signature porte bien sur un document non modifié, sans
 * compte. Elle n'expose donc que ce qui sert la preuve — identité du
 * signataire, horodatage, méthode, empreinte, nom du document. L'adresse
 * IP, le user-agent, l'identifiant d'établissement et l'objet signé
 * restent côté serveur : ils n'apportent rien à la vérification et
 * dessineraient la carte interne du compte.
 */
export type PreuveSignature = Prisma.SignatureGetPayload<{ select: typeof SELECT_PREUVE }>;

/**
 * Vérifie l'intégrité d'une signature : recalcule le hash du document et
 * le compare à la valeur stockée.
 *
 * Accessible sans authentification (page publique de vérification). Le
 * recalcul est borné à l'établissement porté par la signature elle-même :
 * l'appelant ne choisit ni l'objet, ni le périmètre, il ne fournit qu'un
 * identifiant de signature.
 */
export async function verifierIntegriteSignature(
  signatureId: string,
): Promise<
  | { ok: true; signature: PreuveSignature }
  | { ok: false; raison: "inexistante" }
  | { ok: false; raison: "document_modifie"; hashAttendu: string; hashActuel: string }
  | { ok: false; raison: "document_introuvable" }
  | { ok: false; raison: "version_anterieure"; signature: PreuveSignature }
> {
  const signature = await prisma.signature.findUnique({
    where: { id: signatureId },
  });
  if (!signature) return { ok: false, raison: "inexistante" };

  // Le recalcul lit par le client borné au compte propriétaire de
  // l'établissement que porte la signature (ADR-051) : sans session, le
  // compte vient de la preuve, jamais de l'appelant.
  const db = await clientDuProprietaire(signature.etablissementId);
  if (!db) return { ok: false, raison: "document_introuvable" };
  const h = await calculerHashObjet(
    db,
    signature.objetType,
    signature.objetId,
    signature.etablissementId,
  );
  if (!h.ok) return { ok: false, raison: "document_introuvable" };

  // DEUX EMPREINTES DE FORMES DIFFÉRENTES NE SE COMPARENT PAS, ET LE DIRE EST
  // LE CŒUR DE CE CORRECTIF. Le 2026-09-07, la forme d'entrée du plan de
  // prévention a gagné les cinq rubriques de R. 4512-8. Comparer une empreinte
  // v1 à une empreinte v2 rend forcément un écart — et la page publique aurait
  // annoncé « document modifié » à un inspecteur, sur des plans que personne
  // n'a touchés. Une accusation de falsification par effet de bord.
  //
  // On ne fait pas non plus semblant que la vérification a réussi : ce serait
  // le mensonge symétrique, et le plus grave des deux sur un outil de preuve.
  // On rend un troisième état, qui dit la vérité — la signature est un témoin
  // authentique de ce qui a été signé ce jour-là, et le recalcul ne peut pas
  // l'éprouver parce que le document ne s'écrit plus de la même façon.
  if (versionDeHash(h.hash) !== versionDeHash(signature.hashDocument)) {
    return {
      ok: false,
      raison: "version_anterieure",
      signature: enPreuve(signature),
    };
  }

  if (h.hash !== signature.hashDocument) {
    return {
      ok: false,
      raison: "document_modifie",
      hashAttendu: signature.hashDocument,
      hashActuel: h.hash,
    };
  }

  return { ok: true, signature: enPreuve(signature) };
}

/**
 * La signature réduite à ce qui sert la preuve, et rien de plus.
 *
 * Extrait pour que les deux sorties qui rendent une signature — la
 * vérification réussie et la version antérieure — ne divergent pas : c'est
 * ici, et nulle part ailleurs, que se décide ce qu'un tiers sans compte peut
 * voir. L'adresse IP, le user-agent, l'établissement et l'objet signé restent
 * dehors.
 */
function enPreuve(signature: PreuveSignature): PreuveSignature {
  return {
    id: signature.id,
    signataireNom: signature.signataireNom,
    signataireEmail: signature.signataireEmail,
    signataireRole: signature.signataireRole,
    horodatageIso: signature.horodatageIso,
    methode: signature.methode,
    hashDocument: signature.hashDocument,
    nomDocument: signature.nomDocument,
  };
}

/**
 * Ce que la page appelle : la limite par IP d'abord, la vérification ensuite.
 * Le refus ne dit rien de la signature demandée — il tombe avant toute lecture.
 */
export async function verifierSousLimite(
  signatureId: string,
): Promise<
  | Awaited<ReturnType<typeof verifierIntegriteSignature>>
  | { ok: false; raison: "trop_de_demandes"; reessayerDansSecondes: number }
> {
  const ip = ipClient(await headers());
  if (ip) {
    const verdict = await consommer([
      { cle: cleLimite("verification", "ip", ip), limite: LIMITES.verificationIp },
    ]);
    if (!verdict.ok) {
      return {
        ok: false,
        raison: "trop_de_demandes",
        reessayerDansSecondes: verdict.reessayerDansSecondes,
      };
    }
  }
  return verifierIntegriteSignature(signatureId);
}

/**
 * Lit une signature par son identifiant, **sans authentification**.
 *
 * C'est délibéré : l'identifiant `sig_…` est communiqué avec le document
 * pour permettre à un tiers (inspecteur, assureur, acquéreur) de contrôler
 * la signature sans compte — c'est tout l'objet de la page publique
 * de vérification ; ici, pour la confirmation `/signe/[signatureId]`, sœur de
 * `/verifier/[signatureId]`. L'identifiant est un UUID aléatoire, donc non
 * énumérable.
 *
 * En contrepartie, la projection est limitée à ce qui sert la preuve.
 * L'adresse IP, le user-agent, l'identifiant d'établissement et l'objet
 * signé ne sortent pas d'ici : ils ne participent pas à la vérification et
 * exposeraient la structure interne du compte.
 */
export async function getSignature(id: string) {
  return prisma.signature.findUnique({
    where: { id },
    select: SELECT_PREUVE,
  });
}
