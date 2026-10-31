"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { assertEtablissementDuCompte } from "@/lib/auth/scope";
import { clientDuProprietaire } from "@/lib/auth/compte-hors-session";
import { formaterDateFr, formaterHeureFr } from "@/lib/dates";
import { z } from "zod";
import { emettreAccessToken } from "@/lib/access-tokens/emission";
import { envoyerMailAcces, urlAccesPourToken } from "@/lib/access-tokens/mail";
import { envoiEnService, motifErreur } from "@/lib/email";
import {
  consommerJeton,
  rendreEnvoiOtp,
  renouvelerOtp,
  reserverEnvoiOtp,
  reserverEssaiOtp,
  revoquerOtpEpuise,
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
import { calculerHashObjet } from "./hash-objet";
import { verrouillerObjetSigne } from "./verrou-contenu";
import { objetEstSignable } from "./etat-signable";
import { validerSiCoSigne } from "./statut-objet";
import { ObjetSignable, PartieSignataire } from "@prisma/client";
import {
  MESSAGE_PARTIE_DEJA_SIGNEE,
  estPartieDejaSignee,
  partieRecevable,
  partiesAttendues,
} from "./parties";
import { libelleDocumentSignable } from "./libelle-document";
import { notFound } from "next/navigation";
import { ipClient } from "@/lib/securite/ip-client";

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

/** Vrai à la lettre : le refus arrive avant le renouvellement du code. */
const MESSAGE_RENVOI_HORS_SERVICE =
  "Aucun nouveau code n'a été envoyé : l'envoi d'e-mails n'est pas encore en service dans Rojer. Le code précédent n'a pas été modifié.";

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
/**
 * La fonction déclarée du signataire : imprimée sur la preuve de signature et
 * dans le bloc des documents. Une seule règle pour ses trois portes — la
 * demande, la signature par lien (page publique, ASVS V2.2.1 : elle n'avait
 * ni borne ni filtre) et la signature en compte connecté : 120 caractères au
 * plus, aucun caractère de contrôle (ni saut de ligne, ni rien qui fabrique
 * des lignes dans un document).
 */
const roleSignataireSchema = z
  .string({ error: "Fonction du signataire invalide." })
  .trim()
  .max(120, { error: "Fonction du signataire trop longue (120 caractères au plus)." })
  .regex(/^[^\p{Cc}]*$/u, {
    error: "La fonction du signataire ne doit pas contenir de saut de ligne.",
  });

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
  signataireRole: roleSignataireSchema.optional(),
  // La partie au nom de laquelle le destinataire signera (2026-10-12) :
  // choisie ici, par le demandeur, et non par le signataire. Requise pour un
  // acte co-signé, refusée ailleurs (`partieRecevable`).
  partie: z.enum(PartieSignataire).optional(),
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
  if (!partieRecevable(params.objetType, params.partie)) {
    return { ok: false, message: "Partie signataire invalide pour ce document." };
  }

  const { db } = await assertEtablissementDuCompte(params.etablissementId);
  // Aucun lien ne part pour un objet clos ou annulé : il serait refusé au
  // moment de signer (`poserSignatureAvecToken`), autant ne pas envoyer au
  // tiers un courriel qui ne mène à rien.
  if (
    !(await objetEstSignable(
      db,
      params.objetType,
      params.objetId,
      params.etablissementId,
    ))
  ) {
    return { ok: false, message: MESSAGE_NON_SIGNABLE };
  }
  // Aucun lien ne part vers une partie qui a déjà signé : la signature serait
  // refusée (unicité `objetType, objetId, partie`).
  if (
    params.partie &&
    (await db.signature.count({
      where: {
        etablissementId: params.etablissementId,
        objetType: params.objetType,
        objetId: params.objetId,
        partie: params.partie,
      },
    })) > 0
  ) {
    return { ok: false, message: MESSAGE_PARTIE_DEJA_SIGNEE };
  }

  const libelle = await libelleDocumentSignable(
    db,
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
    partie: params.partie,
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
  // La fonction se valide AVANT le jeton et le code : un refus ici ne
  // consomme aucun essai, et rien n'est écrit (ASVS V2.2.1, 2026-10-13).
  const role = roleSignataireSchema.safeParse(
    (formData.get("signataireRole") ?? "").toString(),
  );
  if (!role.success) {
    return {
      status: "error",
      message: role.error.issues[0]?.message ?? "Fonction du signataire invalide.",
    };
  }
  const signataireRole = role.data;

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
  // Le client borné au compte propriétaire de l'établissement DU JETON
  // (ADR-051). Il s'AJOUTE aux contrôles du jeton, qui restent tous
  // ci-dessous : chaque lecture et écriture garde `token.etablissementId`
  // (le jeton lui-même se consomme par son identifiant, celui que
  // `verifierAccessToken` vient de lire par son empreinte).
  const db = await clientDuProprietaire(token.etablissementId);
  if (!db) return { status: "error", message: "Ce lien est invalide." };

  // LA GARDE DE FOND. La clôture et l'annulation révoquent les liens en vol
  // (`revoquerLiensEnVol`), mais un jeton émis par un autre chemin, ou
  // pendant la clôture, y échapperait : c'est ici, au moment de signer, que
  // l'état de l'objet décide. Placée avant le code, elle ne consomme pas
  // d'essai. Bornée à l'établissement du jeton.
  if (
    !(await objetEstSignable(
      db,
      token.objetType,
      token.objetId,
      token.etablissementId,
    ))
  ) {
    return { status: "error", message: MESSAGE_NON_SIGNABLE };
  }
  // Un acte co-signé ne reçoit que des signatures attribuées à une partie. Un
  // lien émis avant le 2026-10-12 n'en porte pas : la signature qu'il
  // produirait ne compterait pour personne. Avant le code, sans essai consommé.
  if (!partieRecevable(token.objetType, token.partie)) {
    return {
      status: "error",
      message:
        "Ce lien ne dit pas au nom de quelle partie vous signez. Demandez-en un nouveau à la personne qui vous l'a envoyé.",
    };
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

  // L'essai se RÉSERVE avant que le code soit comparé (`reserverEssaiOtp`) :
  // une rafale de soumissions parallèles n'éprouve jamais plus de codes que
  // le compteur n'en accorde. Celle qui n'obtient pas d'essai ne compare rien.
  const essai = await reserverEssaiOtp(token.id);
  if (!essai.ok) {
    return {
      status: "error",
      message:
        "Ce lien n'accepte plus de code : ses essais sont épuisés, ou il vient de servir.",
    };
  }
  if (!verifyOtp(otp, token.otpHash)) {
    if (essai.restants === 0) {
      await revoquerOtpEpuise(token.id);
      return {
        status: "error",
        message: "Trop d'essais OTP. Ce lien est révoqué.",
      };
    }
    return {
      status: "error",
      message: `Code incorrect. Il vous reste ${essai.restants} essai${essai.restants > 1 ? "s" : ""}.`,
      restants: essai.restants,
    };
  }

  // OTP ok → calcul du hash + création de la signature. Le périmètre vient
  // du token lui-même (`token.etablissementId`), jamais du formulaire.
  const h = await calculerHashObjet(
    db,
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
          : h.raison === "stockage_non_configure"
            ? "Le stockage des fichiers n'est pas encore configuré sur ce serveur : le document ne peut pas être lu pour être signé."
          : h.raison === "objet_introuvable"
            ? "Le document à signer n'existe plus."
            : "La signature de ce type de document n'est pas encore disponible.",
    };
  }
  const { hash, nomDocument } = h;

  const hh = await headers();
  const ip = ipClient(hh);
  const ua = hh.get("user-agent");

  // Le jeton se CONSOMME avant que la signature s'écrive, dans la même
  // transaction et sous condition (`consommerJeton`) : de deux soumissions
  // simultanées du bon code, une seule obtient le jeton, la seconde ne crée
  // rien. Si l'écriture de la signature échoue, la consommation est défaite.
  let signature;
  try {
    signature = await db.$transaction(async (tx) => {
      // Le verrou de l'objet d'abord, celui que prend `modifier*` (2026-10-12,
      // relecture indépendante) : une modification en cours finit avant, et
      // si elle a changé l'empreinte, elle a révoqué ce jeton — qui ne se
      // consomme plus. Sinon, elle attend que cette signature soit écrite, et
      // la compte.
      await verrouillerObjetSigne(tx, token.objetType as ObjetSignable, token.objetId, token.etablissementId);
      const consomme = await consommerJeton(tx, token.id, {
        ip: ip ?? undefined,
        userAgent: ua ?? undefined,
      });
      if (!consomme) return null;
      return tx.signature.create({
        data: {
          id: `sig_${randomUUID()}`,
          etablissementId: token.etablissementId,
          objetType: token.objetType as ObjetSignable,
          objetId: token.objetId,
          // La partie vient du JETON, que le demandeur a émis pour elle —
          // jamais du formulaire du signataire.
          partie: token.partie,
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
    });
  } catch (e) {
    // Un autre lien de la même partie a signé entre-temps : la transaction
    // est défaite, ce jeton n'est pas consommé.
    if (estPartieDejaSignee(e)) {
      return { status: "error", message: MESSAGE_PARTIE_DEJA_SIGNEE };
    }
    throw e;
  }
  if (!signature) {
    // Le jeton n'a pas été consommé : soit il a déjà servi, soit une
    // modification de l'acte vient de le révoquer (relecture finale du
    // 2026-10-12, C1). La phrase dit laquelle — « déjà servi » mentait au
    // signataire dont le lien venait d'être annulé.
    const etat = await db.accessToken.findUnique({
      where: { id: token.id, etablissementId: token.etablissementId },
      select: { revoqueLe: true, revoqueMotif: true },
    });
    if (etat?.revoqueLe) {
      return {
        status: "error",
        message: etat.revoqueMotif
          ? `Ce lien a été révoqué : ${etat.revoqueMotif}`
          : "Ce lien a été révoqué.",
      };
    }
    return {
      status: "error",
      message: "Ce lien a déjà servi à signer ce document.",
    };
  }
  // Le statut suit les signatures : les deux parties signées, l'acte passe
  // « valide » (`validerSiCoSigne`, 2026-10-12).
  await validerSiCoSigne(
    db,
    token.objetType as ObjetSignable,
    token.objetId,
    token.etablissementId,
  );

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
 * Trois bornes, et la dernière est celle qui compte pour la sécurité :
 *  - le délai minimal entre deux envois sur un lien (`renvoiOtpAutorise`,
 *    60 s), rendu sûr sous concurrence par l'écriture conditionnelle de
 *    `renouvelerOtp` ;
 *  - cinq envois par heure et par ADRESSE (ADR-006), réservés en base
 *    (`reserverEnvoiOtp`) : ce qui protège la boîte du destinataire ;
 *  - trois essais par LIEN, nouveaux codes compris : un renvoi ne les remet
 *    plus à trois (2026-10-13). C'est ce qui borne le nombre total de codes
 *    éprouvables, quelle que soit la cadence des renvois.
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

  // Avant le renouvellement : un code renouvelé puis jamais envoyé rendait le
  // précédent inutilisable (C38, 2026-09-26). Et avant le délai de renvoi :
  // « Un code vient d'être envoyé » ne se dit pas quand rien ne peut partir.
  if (!envoiEnService()) {
    return { status: "error", message: MESSAGE_RENVOI_HORS_SERVICE };
  }

  const maintenant = new Date();
  const renvoi = renvoiOtpAutorise(token.otpExpireLe, maintenant);
  if (!renvoi.autorise) {
    return {
      status: "error",
      message: `Un code vient d'être envoyé. Patientez ${renvoi.attendreSecondes} seconde${renvoi.attendreSecondes > 1 ? "s" : ""} avant d'en demander un autre.`,
    };
  }

  // L'URL avant le renouvellement (2026-10-12, audit B7) : sans adresse
  // publique en production, `publicAppUrl` lève avant d'invalider l'ancien code.
  const urlAcces = urlAccesPourToken(tokenClair);

  // Le plafond de l'ADR-006 — cinq envois par heure et par adresse —, réservé
  // en base AVANT de toucher au code : refusé, le code précédent reste celui
  // qui signe (ASVS V6.6.3, 2026-10-13).
  const envoi = await reserverEnvoiOtp(token.emailDestinataire, maintenant);
  if (!envoi.ok) {
    return {
      status: "error",
      message:
        `Cinq codes ont déjà été envoyés à cette adresse dans l'heure. ` +
        `Vous pourrez en demander un nouveau à ${formaterHeureFr(envoi.possibleLe)}. ` +
        `Si le dernier code reçu n'a pas encore expiré, vous pouvez toujours l'utiliser.`,
    };
  }

  const otp = generateOtp();
  const renouvele = await renouvelerOtp(token.id, {
    otpHash: hashOtp(otp),
    otpExpireLe: otpExpirationDate(maintenant),
    otpExpireLeLu: token.otpExpireLe,
  });
  if (!renouvele) {
    // Un autre renvoi sur ce lien l'a devancé (double clic, deux onglets) :
    // son code part, celui-ci non, et sa place au plafond est rendue.
    await rendreEnvoiOtp(token.emailDestinataire);
    return {
      status: "error",
      message:
        "Un code vient d'être envoyé. Patientez une minute avant d'en demander un autre.",
    };
  }

  try {
    await envoyerMailAcces({
      to: token.emailDestinataire,
      nom: token.nomDestinataire,
      sujet: "Votre nouveau code de confirmation",
      message:
        "Voici un nouveau code de confirmation pour l'action qui vous a été demandée. " +
        "Le précédent n'est plus valable.",
      urlAcces,
      otp,
      expireLe: token.expireLe,
    });
  } catch (erreur) {
    // Le nouveau code est posé mais n'est pas parti : l'ancien ne vaut déjà
    // plus. La place au plafond horaire est rendue, et la page le dit au lieu
    // d'annoncer un envoi qui n'a pas eu lieu.
    await rendreEnvoiOtp(token.emailDestinataire);
    console.error("[signatures] renvoi de code échoué :", motifErreur(erreur));
    return {
      status: "error",
      message:
        "Le nouveau code n'a pas pu être envoyé. Patientez une minute, puis demandez-en un autre.",
    };
  }

  // Les essais ne sont pas remis à trois (`renouvelerOtp`) : la phrase dit ce
  // qui reste sur le lien, pour que le signataire ne compte pas sur trois.
  const restants = token.otpEssaisRestants;
  return {
    status: "success",
    message:
      `Un nouveau code vient d'être envoyé à ${token.emailDestinataire}. ` +
      `Il vous reste ${restants} essai${restants > 1 ? "s" : ""} sur ce lien.`,
  };
}

/**
 * Signature directe par un utilisateur connecté (pas de token externe).
 * Utilisé pour la co-signature du donneur d'ordre sur ses propres documents.
 *
 * `assertEtablissementDuCompte` est le garde décisif : `requireUser` seul
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
        | "stockage_non_configure"
        | "non_implemente"
        | "non_signable"
        | "deja_signee";
    }
> {
  const { user, db } = await assertEtablissementDuCompte(params.etablissementId);
  // Même règle que les deux autres portes. Aucun écran ne passe de fonction
  // ici : seul un appel forgé est refusé, d'où l'exception plutôt qu'une
  // raison de plus dans le retour.
  const role =
    params.role === undefined ? undefined : roleSignataireSchema.parse(params.role);

  // Même garde que pour le signataire externe : un objet clos ou annulé ne
  // se signe plus, par personne.
  if (
    !(await objetEstSignable(
      db,
      params.objetType,
      params.objetId,
      params.etablissementId,
    ))
  ) {
    return { ok: false, raison: "non_signable" };
  }

  const hh = await headers();
  const ip = ipClient(hh);
  const ua = hh.get("user-agent");

  // Le titulaire du compte tient l'établissement : sur un acte co-signé, il
  // ne signe jamais qu'au nom de l'entreprise utilisatrice — le donneur
  // d'ordre du permis. La partie n'est pas un paramètre : un appel qui la
  // choisirait pourrait signer à la place de l'entreprise extérieure.
  const partie: PartieSignataire | null = partiesAttendues(
    params.objetType,
  ).includes("entreprise_utilisatrice")
    ? "entreprise_utilisatrice"
    : null;

  // L'empreinte se calcule SOUS LE VERROU de l'objet, celui que prend
  // `modifier*` (2026-10-12, relecture indépendante) : une correction en
  // cours dans un autre onglet finit avant, et la signature porte sur ce
  // qu'elle a écrit. L'objet est cherché dans ce seul établissement : un
  // objetId d'un autre périmètre ressort « introuvable ».
  let resultat;
  try {
    resultat = await db.$transaction(async (tx) => {
      await verrouillerObjetSigne(tx, params.objetType, params.objetId, params.etablissementId);
      const h = await calculerHashObjet(
        tx,
        params.objetType,
        params.objetId,
        params.etablissementId,
      );
      if (!h.ok) return h;
      const signature = await tx.signature.create({
        data: {
          id: `sig_${randomUUID()}`,
          etablissementId: params.etablissementId,
          objetType: params.objetType,
          objetId: params.objetId,
          partie,
          signataireNom: user.email ?? "Utilisateur",
          signataireEmail: user.email ?? "",
          signataireRole: role || null,
          userId: user.id,
          hashDocument: h.hash,
          nomDocument: h.nomDocument,
          methode: "compte_connecte",
          ipAddress: ip,
          userAgent: ua?.slice(0, 500) ?? null,
        },
      });
      return { ok: true as const, signature };
    });
  } catch (e) {
    if (estPartieDejaSignee(e)) return { ok: false, raison: "deja_signee" };
    throw e;
  }
  if (!resultat.ok) return { ok: false, raison: resultat.raison };
  const { signature } = resultat;
  await validerSiCoSigne(db, params.objetType, params.objetId, params.etablissementId);
  return { ok: true, signatureId: signature.id };
}

// `verifierIntegriteSignature` vit dans `./verification-publique` (audit
// OWASP B14, 2026-10-14) : exportée d'ici, module `"use server"`, elle était
// aussi une action serveur publique, appelable par POST sur n'importe quelle
// page, et hachait jusqu'à 20 Mo par appel.
