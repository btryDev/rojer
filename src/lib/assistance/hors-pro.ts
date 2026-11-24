import "server-only";
// ADR-063 § 7 : une formule Pro qui s'arrête avant le rendez-vous. La tâche
// quotidienne annule le rendez-vous à venir d'un compte qui n'est plus en
// Pro, rend son créneau, et prévient l'équipe et la personne qui l'avait
// réservé — l'écran l'annonce dès que la fin est connue (« À avancer »).
// Hors session, à travers les comptes : le client brut, nommé dans
// `portee/imports.test.ts` avec ses seuls usages.

import { prisma } from "@/lib/prisma";
import { assistanceProOuverte } from "@/lib/abonnements/assistance";
import { verrouillerLeCompte } from "@/lib/abonnements/quotas";
import { envoiEnService, motifErreur, publicAppUrl, sendMail } from "@/lib/email";
import { CONTACT } from "@/lib/contact/message";
import { courrielEquipeRendezVous, courrielPersonneRendezVous, type RendezVousPourCourriel } from "./courriel-rendez-vous";
import { rendreLeCreneau } from "./creneaux";

/** Annule les rendez-vous à venir des comptes sortis de la formule Pro ; rend leur nombre. */
export async function annulerRendezVousHorsPro(maintenant: Date): Promise<{ annules: number }> {
  const aVenir = await prisma.rendezVousAssistance.findMany({
    where: { annuleLe: null, debut: { gt: maintenant } },
    select: {
      id: true,
      compteId: true,
      creneauId: true,
      debut: true,
      fin: true,
      mode: true,
      telephone: true,
      sujet: true,
      user: { select: { name: true, email: true } },
      compte: { select: { abonnement: { select: { statut: true, formule: true } } } },
    },
  });
  let annules = 0;
  for (const r of aVenir) {
    // Un impayé (`past_due`) garde la formule : seule sa fin annule.
    if (assistanceProOuverte(r.compte.abonnement)) continue;
    // Sous le verrou du compte, comme les gestes de la personne : le rendez-vous
    // est relu là, et un déplacement concurrent ne fait pas rendre un créneau
    // périmé (relecture de sécurité du 2026-11-24).
    const tenu = await prisma.$transaction(async (tx) => {
      await verrouillerLeCompte(tx, r.compteId);
      const encore = await tx.rendezVousAssistance.findFirst({
        where: { id: r.id, annuleLe: null },
        select: { creneauId: true, debut: true, fin: true, mode: true, telephone: true, sujet: true },
      });
      if (!encore) return null;
      await tx.rendezVousAssistance.updateMany({ where: { id: r.id, annuleLe: null }, data: { annuleLe: maintenant } });
      await rendreLeCreneau(tx, encore.creneauId);
      return encore;
    });
    if (!tenu) continue;
    annules++;
    if (!envoiEnService()) continue;
    const c: RendezVousPourCourriel = {
      evenement: "annule_hors_pro",
      debut: tenu.debut,
      fin: tenu.fin,
      mode: tenu.mode,
      telephone: tenu.telephone,
      sujet: tenu.sujet,
      personne: { nom: r.user.name, email: r.user.email },
      compteId: r.compteId,
    };
    for (const envoi of [
      { to: CONTACT, replyTo: r.user.email, ...courrielEquipeRendezVous(c) },
      { to: r.user.email, ...courrielPersonneRendezVous(c, `${publicAppUrl()}/`) },
    ]) {
      try {
        await sendMail(envoi);
      } catch (e) {
        console.error(`[rendez-vous] annulation hors Pro non annoncée : ${motifErreur(e)}`);
      }
    }
  }
  return { annules };
}
