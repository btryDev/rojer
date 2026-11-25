import "server-only";
// ADR-063 § 7 : une formule Pro qui s'arrête avant le rendez-vous. La tâche
// quotidienne annule le rendez-vous à venir d'un compte qui n'est plus en
// Pro, rend son créneau, et prévient l'équipe et le compte — l'écran
// l'annonce dès que la fin est connue (« À avancer »).
// Hors session, à travers les comptes : le client brut, nommé dans
// `portee/imports.test.ts` avec ses seuls usages.

import { prisma } from "@/lib/prisma";
import { assistanceProOuverte } from "@/lib/abonnements/assistance";
import { verrouillerLeCompte } from "@/lib/abonnements/quotas";
import { membresDuCompte } from "@/lib/auth/membres";
import { envoiEnService, motifErreur, publicAppUrl, sendMail } from "@/lib/email";
import { CONTACT } from "@/lib/contact/message";
import { courrielEquipeRendezVous, courrielPersonneRendezVous, type RendezVousPourCourriel } from "./courriel-rendez-vous";
import { rendreLeCreneau } from "./creneaux";

/**
 * Comme les gestes de la personne (`rendez-vous-actions.ts`) : la
 * transaction attend le verrou du compte, tenu pendant un envoi, puis son
 * propre envoi à l'équipe.
 */
const DUREE_TRANSACTION_MS = 60_000;

type Personne = { nom: string | null; email: string };

/**
 * Qui prévenir côté compte : la personne qui avait réservé si elle en est
 * encore membre, sinon les propriétaires (relecture du 2026-11-25 — une
 * personne partie ne lit plus rien du compte).
 */
async function destinatairesDuCompte(compteId: string, reservePar: string): Promise<Personne[]> {
  const membres = await membresDuCompte(compteId);
  const elle = membres.find((m) => m.userId === reservePar);
  const choisis = elle ? [elle] : membres.filter((m) => m.role === "owner");
  return choisis.map((m) => ({ nom: m.nom, email: m.email }));
}

/** Annule les rendez-vous à venir des comptes sortis de la formule Pro ; rend leur nombre. */
export async function annulerRendezVousHorsPro(maintenant: Date): Promise<{ annules: number }> {
  const aVenir = await prisma.rendezVousAssistance.findMany({
    where: { annuleLe: null, debut: { gt: maintenant } },
    select: {
      id: true,
      compteId: true,
      userId: true,
      compte: { select: { abonnement: { select: { statut: true, formule: true } } } },
    },
  });
  let annules = 0;
  let echecs = 0;
  for (const r of aVenir) {
    // Un impayé (`past_due`) garde la formule : seule sa fin annule.
    if (assistanceProOuverte(r.compte.abonnement)) continue;
    try {
      const annonce = await annulerUn(r.id, r.compteId, r.userId, maintenant);
      if (!annonce) continue;
      annules++;
      // La personne après coup : l'annulation est faite, l'équipe le sait.
      for (const p of annonce.personnes) {
        try {
          await sendMail({ to: p.email, ...courrielPersonneRendezVous(annonce.c, `${publicAppUrl()}/`) });
        } catch (e) {
          console.error(`[rendez-vous] annulation hors Pro non annoncée au compte : ${motifErreur(e)}`);
        }
      }
    } catch (e) {
      // Un compte en échec n'arrête pas les autres ; il est repris demain.
      echecs++;
      console.error(`[rendez-vous] annulation hors Pro non faite (compte ${r.compteId}) : ${motifErreur(e)}`);
    }
  }
  // Un échec, après avoir traité tous les comptes, remonte à `tenter` : la
  // tâche est dite en échec et l'alerte du jour part (relecture du 2026-11-25).
  if (echecs > 0) throw new Error(`${echecs} annulation(s) hors Pro non faite(s), ${annules} faite(s)`);
  return { annules };
}

/**
 * Sous le verrou du compte, comme les gestes de la personne : le rendez-vous
 * ET la formule y sont relus — un compte repassé en Pro depuis la lecture
 * garde son rendez-vous. L'e-mail à l'équipe part dans la transaction : s'il
 * échoue, rien n'est annulé, et la passe du lendemain recommence.
 */
async function annulerUn(
  id: string,
  compteId: string,
  reservePar: string,
  maintenant: Date,
): Promise<{ c: RendezVousPourCourriel; personnes: Personne[] } | null> {
  const personnes = await destinatairesDuCompte(compteId, reservePar);
  const envoi = envoiEnService();
  return prisma.$transaction(
    async (tx) => {
      await verrouillerLeCompte(tx, compteId);
      const encore = await tx.rendezVousAssistance.findFirst({
        where: { id, annuleLe: null },
        select: {
          creneauId: true,
          debut: true,
          fin: true,
          mode: true,
          telephone: true,
          sujet: true,
          compte: { select: { abonnement: { select: { statut: true, formule: true } } } },
        },
      });
      if (!encore || assistanceProOuverte(encore.compte.abonnement)) return null;
      await tx.rendezVousAssistance.updateMany({ where: { id, annuleLe: null }, data: { annuleLe: maintenant } });
      await rendreLeCreneau(tx, encore.creneauId);
      const c: RendezVousPourCourriel = {
        evenement: "annule_hors_pro",
        debut: encore.debut,
        fin: encore.fin,
        mode: encore.mode,
        telephone: encore.telephone,
        sujet: encore.sujet,
        // Personne à prévenir (réservante partie, aucun propriétaire) : l'équipe le lit.
        personne: personnes[0] ?? { nom: "Aucune personne à prévenir dans le compte", email: "—" },
        compteId,
      };
      if (envoi) {
        await sendMail({
          to: CONTACT,
          ...(personnes[0] ? { replyTo: personnes[0].email } : {}),
          ...courrielEquipeRendezVous(c),
        });
      }
      return { c, personnes: envoi ? personnes : [] };
    },
    { timeout: DUREE_TRANSACTION_MS },
  );
}
