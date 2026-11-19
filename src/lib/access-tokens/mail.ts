import { publicAppUrl, sendMail } from "@/lib/email";
import { OTP_ESSAIS_MAX, OTP_TTL_MINUTES } from "@/lib/signatures/otp";
import { formaterDateHeureFr } from "@/lib/dates";

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
  message: string;
  urlAcces: string;
  /** Un code sera demandé sur la page (scopes à usage unique). */
  codeALaDemande: boolean;
  /** Fin de validité du **lien**, distincte de celle du code (10 minutes). */
  expireLe: Date;
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

function bonjour(nom: string | null | undefined): string {
  return nom ? `Bonjour ${nom},` : "Bonjour,";
}

const PIED = [
  "— Rojer (de la part de votre interlocuteur)",
  "",
  "Finalité : permettre une action ponctuelle demandée par votre interlocuteur.",
  "Droit d'accès / effacement : contactez l'émetteur du lien.",
];

export async function envoyerMailAcces(args: MailAccesArgs): Promise<void> {
  exigerUneLigne("sujet", args.sujet);
  if (args.nom) exigerUneLigne("nom du destinataire", args.nom);
  const expiration = formaterDateHeureFr(args.expireLe);

  const lignes = [
    bonjour(args.nom),
    "",
    args.message,
    "",
    `Accédez à la page dédiée : ${args.urlAcces}`,
    "",
  ];
  if (args.codeALaDemande) {
    lignes.push(
      "Sur la page, demandez votre code de confirmation : Rojer l'adresse " +
        "par un second e-mail.",
      "",
    );
  }
  lignes.push(`Lien valable jusqu'au ${expiration} (heure de Paris).`, "", ...PIED);

  await sendMail({ to: args.to, subject: args.sujet, text: lignes.join("\n") });
}

export type MailCodeArgs = {
  to: string;
  nom?: string | null;
  otp: string;
  /** Essais qui restent sur le lien, nouveaux codes compris. */
  essaisRestants: number;
};

/** Le code seul : ni lien, ni nom de document. */
export async function envoyerMailCode(args: MailCodeArgs): Promise<void> {
  if (args.nom) exigerUneLigne("nom du destinataire", args.nom);
  const essais = `${args.essaisRestants} essai${args.essaisRestants > 1 ? "s" : ""}`;
  const lignes = [
    bonjour(args.nom),
    "",
    `Votre code de confirmation : ${args.otp}`,
    "",
    // Le texte annonce la durée réelle : elle est portée par
    // `AccessToken.otpExpireLe` et vérifiée à chaque tentative.
    `Saisissez-le sur la page que vous avez ouverte. Il est valable ` +
      `${OTP_TTL_MINUTES} minutes ; il vous reste ${essais} sur ce lien ` +
      `(sur ${OTP_ESSAIS_MAX}, nouveaux codes compris).`,
    "",
    "Ne transmettez ce code à personne. Si vous n'avez rien demandé, ignorez ce message.",
    "",
    ...PIED,
  ];
  await sendMail({
    to: args.to,
    subject: "Votre code de confirmation Rojer",
    text: lignes.join("\n"),
  });
}

/** URL publique de la page d'accès pour un token clair donné. */
export function urlAccesPourToken(tokenClair: string): string {
  return `${publicAppUrl()}/acces/${tokenClair}`;
}
