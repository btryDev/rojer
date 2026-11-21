import { publicAppUrl, sendMail } from "@/lib/email";
import { OTP_ESSAIS_MAX, OTP_TTL_MINUTES } from "@/lib/signatures/otp";
import { formaterHeureFr } from "@/lib/dates";
import { formaterJourDateLongueFr } from "@/lib/dates/jour-long";
import { mailSignature } from "@/lib/email/gabarit";

/**
 * Les deux courriels d'un accès externe (ADR-007), envoyés en deux temps
 * (2026-11-19, recette des envois en préprod) :
 *
 * 1. `envoyerMailAcces` : le LIEN, jamais de code. Le code partait dans le
 *    même message : il ne prouvait rien de plus que le lien (qui détient
 *    l'un détient l'autre — message transféré, boîte partagée, outil qui
 *    ouvre les liens), et ses 10 minutes couraient avant même que le
 *    destinataire ouvre sa boîte.
 * 2. `envoyerMailCode` : le CODE, à la demande, depuis la page du lien
 *    (`renvoyerCodeOtp`). Sans le lien : un message de code transféré seul
 *    n'ouvre rien.
 *
 * Sortis de `actions.ts` : ce ne sont pas des server actions (tout export
 * d'un module `"use server"` devient un point d'entrée réseau).
 */

export type MailAccesArgs = {
  to: string;
  nom?: string | null;
  sujet: string;
  /** Les paragraphes du message, séparés par une ligne vide. */
  message: string;
  urlAcces: string;
  /** Un code sera demandé sur la page (scopes à usage unique). */
  codeALaDemande: boolean;
  /** Fin de validité du **lien**, distincte de celle du code (10 minutes). */
  expireLe: Date;
  /** Le titre en tête de carte ; « Document à signer » à défaut. */
  titre?: string;
  /** Le libellé du bouton ; « Consulter et signer » à défaut. */
  bouton?: string;
  /** L'encadré : référence, entreprise, lieux, période… */
  encadre?: readonly { libelle: string; valeur: string }[];
};

/**
 * Le dernier rempart contre l'injection d'en-tête : un sujet ou un nom qui
 * porte un saut de ligne ne part pas. Les appelants valident déjà leurs
 * entrées (`emissionSchema`) — ceci n'est pas une normalisation qui
 * rattraperait une entrée fautive en silence, c'est un refus : une valeur
 * multiligne arrivée jusqu'ici est un défaut à voir, pas à lisser.
 */
function exigerUneLigne(champ: string, valeur: string): void {
  if (/[\r\n]/.test(valeur)) {
    throw new Error(`Courriel d'accès refusé : ${champ} sur plusieurs lignes.`);
  }
}

/**
 * Les deux lignes RGPD (finalité, droits) : en pied des deux courriels d'un
 * accès externe, dans le HTML comme dans le texte.
 */
export const LIGNES_RGPD_ACCES = [
  "Finalité : permettre une action ponctuelle demandée par votre interlocuteur.",
  "Droit d'accès / effacement : contactez l'émetteur du lien.",
] as const;

/** « jusqu'au 26 novembre 2026 à 14:30 (heure de Paris) » — lu sur `expireLe`. */
export function validiteDuLien(expireLe: Date): string {
  return `jusqu'au ${formaterJourDateLongueFr(expireLe)} à ${formaterHeureFr(expireLe)} (heure de Paris)`;
}

/**
 * E1 — le lien (2026-11-19 : HTML de marque, bouton, encadré, échéance du
 * lien, et le texte à côté). Aucun code dans ce message, jamais.
 */
export async function envoyerMailAcces(args: MailAccesArgs): Promise<void> {
  exigerUneLigne("sujet", args.sujet);
  if (args.nom) exigerUneLigne("nom du destinataire", args.nom);

  // Le premier paragraphe avant l'encadré (qui demande quoi), les autres
  // après, avec la phrase du code, au plus près du bouton.
  const [ouverture, ...suite] = args.message
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const message = mailSignature({
    titre: args.titre ?? "Document à signer",
    surtitre: "Signature demandée",
    nom: args.nom,
    paragraphes: ouverture ? [ouverture] : [],
    encadre: args.encadre,
    suite: [
      ...suite,
      ...(args.codeALaDemande
        ? [
            "Sur la page, relisez le document, puis demandez votre code de " +
              "confirmation : Rojer l'adresse par un second e-mail.",
          ]
        : []),
    ],
    bouton: { libelle: args.bouton ?? "Consulter et signer", url: args.urlAcces },
    validite: validiteDuLien(args.expireLe),
    apres: ["Si vous n'attendiez pas ce message, ignorez-le.", ...LIGNES_RGPD_ACCES],
  });
  await sendMail({ to: args.to, subject: args.sujet, ...message });
}

export type MailCodeArgs = {
  to: string;
  nom?: string | null;
  otp: string;
  /** Le document à signer (`libelleDocumentSignable`, une ligne), si connu. */
  document: string | null;
  /** Essais qui restent sur le lien, nouveaux codes compris. */
  essaisRestants: number;
};

/** E2 — le code en gros caractères et le nom du document, JAMAIS le lien. */
export async function envoyerMailCode(args: MailCodeArgs): Promise<void> {
  if (args.document) exigerUneLigne("document", args.document);
  if (args.nom) exigerUneLigne("nom du destinataire", args.nom);
  const essais = `${args.essaisRestants} essai${args.essaisRestants > 1 ? "s" : ""}`;
  const message = mailSignature({
    titre: "Votre code de confirmation",
    surtitre: "Code de confirmation",
    nom: args.nom,
    paragraphes: args.document ? [`Il sert à signer : « ${args.document} ».`] : [],
    code: { libelle: "Votre code de confirmation", valeur: args.otp },
    suite: [
      // Le texte annonce la durée réelle : elle est portée par
      // `AccessToken.otpExpireLe` et vérifiée à chaque tentative.
      `Ce code expire dans ${OTP_TTL_MINUTES} minutes. Ne le partagez avec personne.`,
      `Saisissez-le sur la page que vous avez ouverte. Il vous reste ${essais} ` +
        `sur ce lien (sur ${OTP_ESSAIS_MAX}, nouveaux codes compris).`,
    ],
    apres: ["Si vous n'avez rien demandé, ignorez ce message.", ...LIGNES_RGPD_ACCES],
  });
  await sendMail({ to: args.to, subject: "Votre code de confirmation Rojer", ...message });
}

/**
 * Le code d'une signature depuis le compte (2026-11-19, fenêtre « Signer et
 * envoyer » de la fiche du plan) : à l'adresse du compte, sans lien — il se
 * saisit dans la fenêtre restée ouverte.
 */
export async function envoyerMailCodeCompte(args: {
  to: string;
  nom?: string | null;
  otp: string;
  document: string | null;
}): Promise<void> {
  if (args.document) exigerUneLigne("document", args.document);
  if (args.nom) exigerUneLigne("nom du destinataire", args.nom);
  const message = mailSignature({
    titre: "Votre code de signature",
    surtitre: "Code de confirmation",
    nom: args.nom,
    paragraphes: args.document
      ? [`Il confirme votre signature de : « ${args.document} ».`]
      : ["Il confirme la signature que vous apposez depuis votre compte Rojer."],
    code: { libelle: "Votre code de signature", valeur: args.otp },
    suite: [
      `Ce code expire dans ${OTP_TTL_MINUTES} minutes. Ne le partagez avec personne.`,
      `Saisissez-le dans la fenêtre de signature restée ouverte dans Rojer. ` +
        `Il accepte ${OTP_ESSAIS_MAX} essais.`,
    ],
    apres: ["Si vous n'avez rien demandé, changez votre mot de passe Rojer."],
  });
  await sendMail({ to: args.to, subject: "Votre code de signature Rojer", ...message });
}

/** URL publique de la page d'accès pour un token clair donné. */
export function urlAccesPourToken(tokenClair: string): string {
  return `${publicAppUrl()}/acces/${tokenClair}`;
}
