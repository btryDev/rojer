import { mailFrom, publicAppUrl, sendMail } from "@/lib/email";
import { OTP_ESSAIS_MAX, OTP_TTL_MINUTES } from "@/lib/signatures/otp";
import { formaterDateHeureFr } from "@/lib/dates";

/**
 * Email d'accès externe (ADR-007) : lien magique + éventuel code OTP.
 *
 * Sorti de `actions.ts` pour deux raisons : ce n'est pas une server action
 * (tout export d'un module `"use server"` devient un point d'entrée
 * réseau), et le renvoi d'un code depuis `@/lib/signatures/actions` a
 * besoin du même corps de message.
 */

export type MailAccesArgs = {
  to: string;
  nom?: string | null;
  sujet: string;
  message: string;
  urlAcces: string;
  otp: string | null;
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

export async function envoyerMailAcces(args: MailAccesArgs): Promise<void> {
  exigerUneLigne("sujet", args.sujet);
  if (args.nom) exigerUneLigne("nom du destinataire", args.nom);
  const bonjour = args.nom ? `Bonjour ${args.nom},` : "Bonjour,";
  const expiration = formaterDateHeureFr(args.expireLe);

  const lignes = [
    bonjour,
    "",
    args.message,
    "",
    `Accédez à la page dédiée : ${args.urlAcces}`,
    "",
  ];
  if (args.otp) {
    lignes.push(
      `Code de confirmation : ${args.otp}`,
      // Le texte annonce la durée réelle : elle est portée par
      // `AccessToken.otpExpireLe` et vérifiée à chaque tentative.
      `(Ce code vous sera demandé sur la page. Valable ${OTP_TTL_MINUTES} minutes, ${OTP_ESSAIS_MAX} essais maximum. Passé ce délai, la page vous permet d'en demander un nouveau.)`,
      "",
    );
  }
  lignes.push(
    `Lien valable jusqu'au ${expiration} (heure de Paris).`,
    "",
    "— Rojer (de la part de votre interlocuteur)",
    "",
    "Finalité : permettre une action ponctuelle demandée par votre interlocuteur.",
    "Droit d'accès / effacement : contactez l'émetteur du lien.",
  );

  await sendMail({
    to: args.to,
    subject: args.sujet,
    text: lignes.join("\n"),
  });

  // Aussi utile en dev : log le from configuré pour que l'utilisateur voie
  // l'identité d'expéditeur qui sortirait en prod.
  if (process.env.EMAIL_DRIVER !== "resend") {
    console.log(`   (From : ${mailFrom()})`);
  }
}

/** URL publique de la page d'accès pour un token clair donné. */
export function urlAccesPourToken(tokenClair: string): string {
  return `${publicAppUrl()}/acces/${tokenClair}`;
}
