"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { assertEtablissementOwnership } from "@/lib/auth/scope";
import { formaterDateFr } from "@/lib/dates";
import { z } from "zod";
import { emettreAccessToken } from "@/lib/access-tokens/emission";
import { envoyerMailAcces, urlAccesPourToken } from "@/lib/access-tokens/mail";
import {
  decrementOtpEssais,
  marquerUtilise,
  renouvelerOtp,
  verifierAccessToken,
} from "@/lib/access-tokens/verify";
import {
  generateOtp,
  hashOtp,
  otpEstExpire,
  otpExpirationDate,
  renvoiOtpAutorise,
  verifyOtp,
} from "./otp";
import { calculerHashObjet, versionDeHash } from "./hash-objet";
import { objetEstSignable } from "./etat-signable";
import { ObjetSignable } from "@prisma/client";
import type { MethodeSignature } from "@prisma/client";
import { libelleDocumentSignable } from "./libelle-document";
import { notFound } from "next/navigation";

/**
 * Server actions de signature électronique simple (ADR-006 / ADR-008).
 *
 * Rappel de sécurité : dans un module `"use server"`, **tout export est un
 * point d'entrée réseau**. Chaque fonction ci-dessous doit donc porter
 * elle-même son autorisation — soit un user connecté propriétaire de
 * l'établissement, soit un token d'accès dont la connaissance vaut
 * autorisation. C'est la raison pour laquelle `calculerHashObjet` a été
 * déplacée dans `./hash-objet` : exportée d'ici, elle exposait l'empreinte
 * et le nom des documents de n'importe quel établissement.
 */

const MESSAGE_NON_SIGNABLE =
  "Ce document n'est plus à signer : il a été clos ou annulé.";

/**
 * Les entrées de `demanderSignature`, validées. C'est une server action,
 * donc un point d'entrée réseau : ces valeurs sont celles que l'appelant a
 * choisies, pas celles qu'un formulaire a envoyées. Le nom part dans le
 * corps du courriel (« Bonjour … ») : aucun caractère de contrôle, pour
 * qu'il ne puisse ni fabriquer des lignes, ni rien injecter.
 *
 * Il n'y a plus de `libelleDocument` : le nom du document se dérive de
 * l'objet, côté serveur (`./libelle-document.ts`). Une clé inconnue envoyée
 * quand même est ignorée — `z.object` ne la laisse pas passer. Plus de
 * `prestataireId` non plus : aucun appelant ne le passait, et rien ne
 * vérifiait qu'il appartenait à l'établissement.
 */
const demandeSignatureSchema = z.object({
  etablissementId: z.string().min(1).max(100),
  objetType: z.enum(ObjetSignable),
  objetId: z.string().min(1).max(100),
  signataireEmail: z
    .string({ error: "Adresse électronique requise." })
    .trim()
    .toLowerCase()
    .email({ error: "Adresse électronique invalide." })
    .max(254, { error: "Adresse électronique trop longue." }),
  signataireNom: z
    .string({ error: "Nom du signataire requis." })
    .trim()
    .min(1, { error: "Nom du signataire requis." })
    .max(120, { error: "Nom du signataire trop long (120 caractères au plus)." })
    .regex(/^[^\p{Cc}]*$/u, {
      error: "Le nom du signataire ne doit pas contenir de saut de ligne.",
    }),
  signataireRole: z
    .string()
    .trim()
    .max(120)
    .regex(/^[^\p{Cc}]*$/u)
    .optional(),
});

export type DemandeSignature = z.input<typeof demandeSignatureSchema>;

/**
 * Émet une demande de signature : crée un AccessToken scope "signature",
 * envoie le lien par email. Le destinataire viendra signer via OTP sur
 * `/acces/[token]`.
 *
 * Dans l'ordre : validation des entrées, propriété de l'établissement, état
 * signable de l'objet, dérivation du libellé (qui établit aussi que l'objet
 * est dans l'établissement), puis `emettreAccessToken` — qui revérifie
 * l'appartenance et applique la limite de fréquence.
 *
 * **Le texte du courriel ne vient plus du client.** Sujet et corps sont
 * écrits ici, autour d'un libellé lu sur l'objet : un compte ne choisit plus
 * le texte d'un message envoyé sous l'identité Rojer.
 *
 * **Rien de ce qui permet de signer ne revient ici** — ni le lien, ni le
 * code. Le retour est un accusé de réception, ou un refus lisible : le
 * demandeur ne doit pas tenir ce qui n'est adressé qu'au signataire, sans
 * quoi il signe à sa place. Le raisonnement complet est dans
 * `@/lib/access-tokens/emission`.
 */
export async function demanderSignature(
  entree: DemandeSignature,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = demandeSignatureSchema.safeParse(entree);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Demande invalide.",
    };
  }
  const params = parsed.data;

  await assertEtablissementOwnership(params.etablissementId);
  // Aucun lien ne part pour un objet clos ou annulé : il serait refusé au
  // moment de signer (`poserSignatureAvecToken`), autant ne pas envoyer au
  // tiers un courriel qui ne mène à rien.
  if (
    !(await objetEstSignable(
      params.objetType,
      params.objetId,
      params.etablissementId,
    ))
  ) {
    return { ok: false, message: MESSAGE_NON_SIGNABLE };
  }

  const libelle = await libelleDocumentSignable(
    params.objetType,
    params.objetId,
    params.etablissementId,
  );
  if (!libelle) notFound();

  const r = await emettreAccessToken({
    etablissementId: params.etablissementId,
    scope: "signature",
    objetType: params.objetType,
    objetId: params.objetId,
    emailDestinataire: params.signataireEmail,
    nomDestinataire: params.signataireNom,
    sujetMail: `Signature à apporter : ${libelle}`,
    messageMail:
      // ~~« la même valeur probatoire qu'une signature manuscrite (art.
      // 1366-1367 du Code civil, règlement eIDAS niveau simple) »~~ — une
      // qualification (contre-lecture du 2026-09-26) : l'al. 2 de l'art. 1367
      // ne présume la fiabilité que « dans des conditions fixées par décret en
      // Conseil d'Etat ». Même texte que la page `/signe`.
      `Vous êtes invité(e) à signer électroniquement le document suivant : ` +
      `« ${libelle} ». ` +
      `Rojer enregistrera votre signature avec son horodatage et l'empreinte ` +
      `du document tel qu'il se présentait.`,
  });
  if (!r.ok) return { ok: false, message: r.message };
  // Un accusé de réception, rien d'autre. Aucun appelant n'a besoin de
  // l'identifiant du jeton, et ce qui n'est pas rendu ne peut pas fuir.
  return { ok: true };
}

/**
 * Consomme un token de signature + OTP, crée la Signature finale.
 * Server action appelée depuis la page publique /acces/[token].
 */
export type PoserSignatureState =
  | { status: "idle" }
  | { status: "error"; message: string; restants?: number; otpExpire?: boolean }
  | { status: "success"; signatureId: string };

export async function poserSignatureAvecToken(
  tokenClair: string,
  _prev: PoserSignatureState,
  formData: FormData,
): Promise<PoserSignatureState> {
  const otp = (formData.get("otp") ?? "").toString().trim();
  const signataireRole = (formData.get("signataireRole") ?? "").toString().trim();

  const res = await verifierAccessToken(tokenClair);
  if (!res.ok) {
    switch (res.raison) {
      case "inexistant":
        return { status: "error", message: "Ce lien est invalide." };
      case "expire":
        return {
          status: "error",
          message: `Ce lien a expiré le ${formaterDateFr(res.expireLe)}.`,
        };
      case "revoque":
        return {
          status: "error",
          message: `Ce lien a été révoqué${res.motif ? ` : ${res.motif}` : ""}.`,
        };
      case "deja_utilise":
        return {
          status: "error",
          message: "Ce lien a déjà servi à signer ce document.",
        };
    }
  }
  const token = res.token;
  if (token.scope !== "signature") {
    return { status: "error", message: "Ce lien ne sert pas à signer." };
  }
  if (!token.otpHash) {
    return { status: "error", message: "Configuration OTP manquante." };
  }

  // LA GARDE DE FOND. La clôture et l'annulation révoquent les liens en vol
  // (`revoquerLiensEnVol`), mais un jeton émis par un autre chemin, ou
  // pendant la clôture, y échapperait : c'est ici, au moment de signer, que
  // l'état de l'objet décide. Placée avant le code, elle ne consomme pas
  // d'essai. Bornée à l'établissement du jeton.
  if (
    !(await objetEstSignable(
      token.objetType,
      token.objetId,
      token.etablissementId,
    ))
  ) {
    return { status: "error", message: MESSAGE_NON_SIGNABLE };
  }

  // Expiration du **code**, distincte de celle du lien. Elle se vérifie
  // avant le hash : un code périmé n'a pas à consommer un essai, et le
  // message doit orienter vers le renvoi plutôt que vers une ressaisie.
  if (otpEstExpire(token.otpExpireLe, new Date())) {
    return {
      status: "error",
      message:
        "Ce code de confirmation a expiré (validité 10 minutes). Demandez un nouveau code pour continuer.",
      otpExpire: true,
    };
  }

  if (!verifyOtp(otp, token.otpHash)) {
    const dec = await decrementOtpEssais(token.id);
    if (dec.revoque) {
      return {
        status: "error",
        message: "Trop d'essais OTP. Ce lien est révoqué.",
      };
    }
    return {
      status: "error",
      message: `Code incorrect. Il vous reste ${dec.restants} essai${dec.restants > 1 ? "s" : ""}.`,
      restants: dec.restants,
    };
  }

  // OTP ok → calcul du hash + création de la signature. Le périmètre vient
  // du token lui-même (`token.etablissementId`), jamais du formulaire.
  const h = await calculerHashObjet(
    token.objetType as ObjetSignable,
    token.objetId,
    token.etablissementId,
  );
  if (!h.ok) {
    return {
      status: "error",
      message:
        h.raison === "fichier_introuvable"
          ? "Le document à signer n'est plus accessible sur le serveur. Demandez à votre interlocuteur de le re-téléverser."
          : h.raison === "objet_introuvable"
            ? "Le document à signer n'existe plus."
            : "La signature de ce type de document n'est pas encore disponible.",
    };
  }
  const { hash, nomDocument } = h;

  const hh = await headers();
  const ip = hh.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = hh.get("user-agent");

  const signature = await prisma.signature.create({
    data: {
      id: `sig_${randomUUID()}`,
      etablissementId: token.etablissementId,
      objetType: token.objetType as ObjetSignable,
      objetId: token.objetId,
      signataireNom: token.nomDestinataire ?? token.emailDestinataire,
      signataireEmail: token.emailDestinataire,
      signataireRole: signataireRole || null,
      userId: null,
      hashDocument: hash,
      nomDocument,
      methode: "otp_email",
      ipAddress: ip,
      userAgent: ua?.slice(0, 500) ?? null,
    },
  });

  await marquerUtilise(token.id, { ip: ip ?? undefined, userAgent: ua ?? undefined });

  return { status: "success", signatureId: signature.id };
}

/**
 * Renvoie un nouveau code de confirmation sur un lien encore valide.
 *
 * Indispensable depuis que le code expire au bout de 10 minutes : sans ce
 * chemin, un destinataire qui ouvre son mail le lendemain se retrouve avec
 * un lien encore valide (72 h) mais un code mort, donc un document
 * impossible à signer.
 *
 * Autorisation : la connaissance du token clair, comme pour la signature
 * elle-même. Le nouveau code part à l'adresse enregistrée sur le token, pas
 * à une adresse fournie par l'appelant — un tiers qui aurait intercepté le
 * lien ne peut pas se faire adresser le code ailleurs.
 *
 * Le délai minimal entre deux envois (`renvoiOtpAutorise`) évite d'en faire
 * un outil de saturation de boîte mail et de remise à zéro illimitée du
 * compteur d'essais.
 */
export type RenvoiOtpState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; message: string };

export async function renvoyerCodeOtp(
  tokenClair: string,
): Promise<RenvoiOtpState> {
  const res = await verifierAccessToken(tokenClair);
  if (!res.ok) {
    return {
      status: "error",
      message:
        res.raison === "expire"
          ? `Ce lien a expiré le ${formaterDateFr(res.expireLe)}. Demandez-en un nouveau à votre interlocuteur.`
          : res.raison === "revoque"
            ? "Ce lien a été révoqué."
            : res.raison === "deja_utilise"
              ? "Ce lien a déjà servi."
              : "Ce lien est invalide.",
    };
  }

  const token = res.token;
  if (!token.otpHash) {
    return {
      status: "error",
      message: "Ce lien ne demande pas de code de confirmation.",
    };
  }

  const maintenant = new Date();
  const renvoi = renvoiOtpAutorise(token.otpExpireLe, maintenant);
  if (!renvoi.autorise) {
    return {
      status: "error",
      message: `Un code vient d'être envoyé. Patientez ${renvoi.attendreSecondes} seconde${renvoi.attendreSecondes > 1 ? "s" : ""} avant d'en demander un autre.`,
    };
  }

  const otp = generateOtp();
  await renouvelerOtp(token.id, {
    otpHash: hashOtp(otp),
    otpExpireLe: otpExpirationDate(maintenant),
  });

  await envoyerMailAcces({
    to: token.emailDestinataire,
    nom: token.nomDestinataire,
    sujet: "Votre nouveau code de confirmation",
    message:
      "Voici un nouveau code de confirmation pour l'action qui vous a été demandée. " +
      "Le précédent n'est plus valable.",
    urlAcces: urlAccesPourToken(tokenClair),
    otp,
    expireLe: token.expireLe,
  });

  return {
    status: "success",
    message: `Un nouveau code vient d'être envoyé à ${token.emailDestinataire}.`,
  };
}

/**
 * Signature directe par un utilisateur connecté (pas de token externe).
 * Utilisé pour la co-signature du donneur d'ordre sur ses propres documents.
 *
 * `assertEtablissementOwnership` est le garde décisif : `requireUser` seul
 * établissait qu'il y a *un* utilisateur, pas qu'il a quoi que ce soit à
 * voir avec `etablissementId` et `objetId`. On pouvait ainsi signer le
 * document d'un tiers — et en récupérer l'empreinte au passage.
 */
export async function signerEnCompteConnecte(params: {
  etablissementId: string;
  objetType: ObjetSignable;
  objetId: string;
  role?: string;
}): Promise<
  | { ok: true; signatureId: string }
  | {
      ok: false;
      raison:
        | "objet_introuvable"
        | "fichier_introuvable"
        | "non_implemente"
        | "non_signable";
    }
> {
  const user = await requireUser();
  await assertEtablissementOwnership(params.etablissementId);

  // Même garde que pour le signataire externe : un objet clos ou annulé ne
  // se signe plus, par personne.
  if (
    !(await objetEstSignable(
      params.objetType,
      params.objetId,
      params.etablissementId,
    ))
  ) {
    return { ok: false, raison: "non_signable" };
  }

  // L'objet est cherché dans ce seul établissement : un objetId d'un autre
  // périmètre ressort « introuvable ».
  const h = await calculerHashObjet(
    params.objetType,
    params.objetId,
    params.etablissementId,
  );
  if (!h.ok) return { ok: false, raison: h.raison };
  const { hash, nomDocument } = h;
  const hh = await headers();
  const ip = hh.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = hh.get("user-agent");

  const signature = await prisma.signature.create({
    data: {
      id: `sig_${randomUUID()}`,
      etablissementId: params.etablissementId,
      objetType: params.objetType,
      objetId: params.objetId,
      signataireNom: user.email ?? "Utilisateur",
      signataireEmail: user.email ?? "",
      signataireRole: params.role ?? null,
      userId: user.id,
      hashDocument: hash,
      nomDocument,
      methode: "compte_connecte",
      ipAddress: ip,
      userAgent: ua?.slice(0, 500) ?? null,
    },
  });
  return { ok: true, signatureId: signature.id };
}

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
export type PreuveSignature = {
  id: string;
  signataireNom: string;
  signataireEmail: string;
  signataireRole: string | null;
  horodatageIso: Date;
  methode: MethodeSignature;
  hashDocument: string;
  nomDocument: string | null;
};

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

  const h = await calculerHashObjet(
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
function enPreuve(signature: {
  id: string;
  signataireNom: string;
  signataireEmail: string;
  signataireRole: string | null;
  horodatageIso: Date;
  methode: MethodeSignature;
  hashDocument: string;
  nomDocument: string | null;
}): PreuveSignature {
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
