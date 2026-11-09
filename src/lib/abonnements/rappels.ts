import "server-only";
// Le rappel de la VEILLE de la fin de l'essai (ADR-053, décision du
// 2026-11-06 : J-7 et J-1). Celui des 7 jours, Stripe l'envoie lui-même
// (réglage du tableau de bord, avec le lien de résiliation que les réseaux de
// cartes exigent) ; Stripe n'en envoie pas la veille, d'où celui-ci.
//
// Joué par la tâche quotidienne (`lib/taches/quotidiennes.ts`), hors de toute
// session : il lit les abonnements de TOUS les comptes, d'où le client brut
// (`portee/imports.test.ts`). Il n'écrit que sa propre marque.
//
// AU PLUS une fois par essai : la marque `rappelVeilleEssaiLe` est posée
// AVANT l'envoi par une écriture conditionnelle (deux instances, une passe
// rejouée pendant un déploiement : une seule gagne). Si aucun e-mail ne part,
// elle est rendue à vide et la passe suivante réessaie — si l'essai n'est pas
// fini d'ici là ; une instance arrêtée entre la marque et l'envoi perd le
// rappel. Un rappel perdu vaut mieux qu'un rappel en double.

import { prisma } from "@/lib/prisma";
import { envoiEnService, motifErreur, publicAppUrl, sendMail } from "@/lib/email";
import { formaterDateLongueFr } from "@/lib/dates";
import { PAGE_ABONNEMENT } from "./saisie";

/**
 * L'essai finit dans les 36 heures : la tâche passe une fois par jour, et la
 * marge rattrape une passe en retard sans jamais écrire « demain » à tort —
 * le message donne la date.
 */
export const FENETRE_VEILLE_MS = 36 * 3_600_000;

export type BilanRappels = { envoyes: number; echecs: number; horsService?: true };

/** Le message, en texte seul comme les autres e-mails de Rojer. */
export function messageVeilleFinEssai(finEssai: Date, url: string): { subject: string; text: string } {
  const date = formaterDateLongueFr(finEssai);
  return {
    subject: `Votre essai gratuit de Rojer se termine le ${date}`,
    text: [
      "Bonjour,",
      "",
      `Votre essai gratuit de Rojer se termine le ${date}.`,
      "",
      "Si vous avez déjà choisi votre formule et enregistré une carte, votre abonnement démarre à cette date : vous n'avez rien à faire.",
      "",
      `Sinon, choisissez votre formule pour continuer sans interruption : ${url}`,
      "",
      // La règle du bandeau (`droits.ts`) : un compte qui n'a jamais payé garde
      // la lecture, pas l'export officiel (ADR-053 § 15).
      "Sans abonnement, la saisie se fermera à la fin de l'essai. Vos dossiers resteront consultables pendant 12 mois.",
      "",
      "— Rojer",
    ].join("\n"),
  };
}

/** Les adresses des propriétaires du compte : eux seuls peuvent s'abonner. */
async function adressesDesProprietaires(compteId: string): Promise<string[]> {
  const membres = await prisma.membre.findMany({
    where: { compteId, role: "owner" },
    select: { user: { select: { email: true } } },
  });
  return membres.map((m) => m.user.email).filter((e): e is string => Boolean(e));
}

/**
 * Envoie le rappel aux comptes dont l'essai finit dans la fenêtre, sans
 * résiliation prévue (un essai qu'on a choisi d'arrêter n'a rien à rappeler).
 */
export async function rappelerLaVeilleDeLaFinDEssai(maintenant: Date): Promise<BilanRappels> {
  if (!envoiEnService()) return { envoyes: 0, echecs: 0, horsService: true };
  const lignes = await prisma.abonnement.findMany({
    where: {
      statut: "trialing",
      rappelVeilleEssaiLe: null,
      resilieEnFinDePeriode: false,
      finPrevueLe: null,
      finEssai: { gt: maintenant, lte: new Date(maintenant.getTime() + FENETRE_VEILLE_MS) },
    },
    select: { id: true, compteId: true, finEssai: true },
  });
  const url = `${publicAppUrl()}${PAGE_ABONNEMENT}`;
  const bilan: BilanRappels = { envoyes: 0, echecs: 0 };
  for (const ligne of lignes) {
    if (!ligne.finEssai) continue;
    const prise = await prisma.abonnement.updateMany({
      where: { id: ligne.id, rappelVeilleEssaiLe: null },
      data: { rappelVeilleEssaiLe: maintenant },
    });
    if (prise.count !== 1) continue;
    const message = messageVeilleFinEssai(ligne.finEssai, url);
    let partis = 0;
    let echec = false;
    try {
      for (const to of await adressesDesProprietaires(ligne.compteId)) {
        try {
          await sendMail({ to, ...message });
          partis++;
        } catch (e) {
          echec = true;
          console.error(`rappel de fin d'essai non envoyé (abonnement ${ligne.id}) — ${motifErreur(e)}`);
        }
      }
    } catch (e) {
      echec = true;
      console.error(`rappel de fin d'essai : propriétaires illisibles (abonnement ${ligne.id}) — ${motifErreur(e)}`);
    }
    if (partis > 0) bilan.envoyes++;
    if (echec) bilan.echecs++;
    // Rien n'est parti à cause d'un échec : la marque est rendue. Un e-mail
    // parti la garde — réessayer enverrait un doublon à qui l'a reçu.
    if (partis === 0 && echec) {
      await prisma.abonnement
        .updateMany({ where: { id: ligne.id, rappelVeilleEssaiLe: maintenant }, data: { rappelVeilleEssaiLe: null } })
        .catch(() => {});
    }
  }
  return bilan;
}
