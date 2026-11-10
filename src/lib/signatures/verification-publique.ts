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
import { ipPourLimite } from "@/lib/securite/ip-client";
import { cleLimite, consommer, LIMITES } from "@/lib/securite/limite-debit";
import { creerLimiteur } from "@/lib/securite/limiteur";
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

/** Le refus de la limite par IP, commun aux deux pages publiques d'une signature. */
type TropDeDemandes = { ok: false; raison: "trop_de_demandes"; reessayerDansSecondes: number };

/**
/**
 * La limite par IP des deux pages publiques d'une signature, un compteur PAR
 * PAGE au même plafond (`LIMITES.verificationIp`). `null` : la requête passe.
 * Le refus tombe avant toute lecture et ne dit rien de la signature.
 *
 * Deux compteurs, et pas un, c'est voulu (revue medium de #253) : `/signe`
 * suit chaque signature, et un compteur partagé faisait payer aux liens
 * `/verifier` d'un bureau les signatures qui en partent — et inversement.
 * Le détour d'une page à l'autre ne fait que doubler le budget d'un visiteur,
 * au même plafond des deux côtés, sur des identifiants aléatoires (UUID) :
 * acceptable. Ne pas « réparer » vers un compteur unique, ni vers deux
 * plafonds différents.
 */
async function limiteParIp(page: "verification" | "confirmation", ip: string | null): Promise<TropDeDemandes | null> {
  if (!ip) return null;
  const verdict = await consommer([{ cle: cleLimite(page, "ip", ip), limite: LIMITES.verificationIp }]);
  return verdict.ok ? null : { ok: false, raison: "trop_de_demandes", reessayerDansSecondes: verdict.reessayerDansSecondes };
}

/**
 * Recalculs d'empreinte menés de front par la page publique (audit de
 * sécurité du 2026-11-10) : chacun peut lire un rapport entier (20 Mo) en
 * mémoire, et la limite par IP compte les requêtes, pas celles en cours —
 * trente demandes simultanées d'une seule adresse tenaient 600 Mo. Deux à la
 * fois, quatre en attente : la mémoire tenue reste bornée quel que soit le
 * nombre de demandeurs.
 */
const recalculsPublics = creerLimiteur({
  simultanes: 2,
  enAttenteMax: 4,
  attenteMaxMs: 10_000,
  // Une adresse ne tient que deux places : sans part, un seul visiteur, sous
  // sa limite de requêtes, gardait les six et refusait tous les autres.
  parDemandeurMax: 2,
});
/** Ce que dit la page quand elle refuse, en secondes. */
const REESSAYER_RECALCUL_S = 5;
/** Les vérifications en cours, par signature : une même signature ne se recalcule qu'une fois à la fois. */
const verificationsEnCours = new Map<string, Promise<ResultatSousLimite>>();

type ResultatSousLimite =
  | Awaited<ReturnType<typeof verifierIntegriteSignature>>
  | { ok: false; raison: "trop_de_demandes" | "serveur_occupe"; reessayerDansSecondes: number };

/**
 * Ce que `/verifier` appelle : la limite par IP d'abord, une place de
 * recalcul ensuite, la vérification enfin. Le refus ne dit rien de la
 * signature demandée — il tombe avant toute lecture.
 */
export async function verifierSousLimite(signatureId: string): Promise<ResultatSousLimite> {
  const ip = ipPourLimite(await headers());
  const refus = await limiteParIp("verification", ip);
  if (refus) return refus;
  // La même signature déjà en cours de vérification : on partage son
  // recalcul au lieu d'en lancer un second. Occuper toutes les places exige
  // alors autant de rapports signés que de places — pas autant d'adresses
  // (revue de sécurité de la PR #273).
  const dejaEnCours = verificationsEnCours.get(signatureId);
  if (dejaEnCours) {
    const partage = await dejaEnCours;
    // Un refus « service occupé » appartient au premier demandeur : celui qui
    // s'est greffé tente sa propre place (relecture de la PR #273).
    if (!(partage.ok === false && partage.raison === "serveur_occupe")) return partage;
  }
  // Ses propres vérifications d'abord (« depuis votre connexion »), puis
  // l'occupation du service (« réessayez ») : la page ne dit pas la même chose.
  if (ip && recalculsPublics.partAtteinte(ip)) {
    return { ok: false, raison: "trop_de_demandes", reessayerDansSecondes: REESSAYER_RECALCUL_S };
  }
  // Inscrite AVANT toute attente : une demande simultanée la trouve.
  const verification = (async (): Promise<ResultatSousLimite> => {
    const liberer = await recalculsPublics.reserver(ip ?? undefined);
    if (!liberer) {
      return { ok: false, raison: "serveur_occupe", reessayerDansSecondes: REESSAYER_RECALCUL_S };
    }
    try {
      return await verifierIntegriteSignature(signatureId);
    } finally {
      liberer();
    }
  })().finally(() => verificationsEnCours.delete(signatureId));
  verificationsEnCours.set(signatureId, verification);
  return verification;
}

/** Ce que `/signe` appelle : la même limite par IP, puis la signature (`null` si elle n'existe pas). */
export async function lireSignatureSousLimite(
  signatureId: string,
): Promise<TropDeDemandes | { ok: true; signature: Awaited<ReturnType<typeof getSignature>> }> {
  return (await limiteParIp("confirmation", ipPourLimite(await headers()))) ?? { ok: true, signature: await getSignature(signatureId) };
}

/**
 * Lit une signature par son identifiant, **sans authentification**.
 *
 * Privée au module (simplify de #253) : la seule porte est
 * `lireSignatureSousLimite`, pour la page de confirmation
 * `/signe/[signatureId]`, que voit le signataire juste après avoir signé. La
 * page publique de vérification `/verifier/[signatureId]`, sa sœur, passe par
 * `verifierSousLimite` ; chacune a son compteur par IP, au même plafond.
 * L'identifiant `sig_…` est un UUID aléatoire, donc non énumérable.
 *
 * En contrepartie, la projection est limitée à ce qui sert la preuve.
 * L'adresse IP, le user-agent, l'identifiant d'établissement et l'objet
 * signé ne sortent pas d'ici : ils ne participent pas à la vérification et
 * exposeraient la structure interne du compte.
 */
async function getSignature(id: string) {
  return prisma.signature.findUnique({
    where: { id },
    select: SELECT_PREUVE,
  });
}
