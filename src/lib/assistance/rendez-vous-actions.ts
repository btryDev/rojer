"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCompte } from "@/lib/auth/compte";
import { requireEtablissement } from "@/lib/auth/scope";
import { assistanceProOuverte } from "@/lib/abonnements/assistance";
import { verrouillerLeCompte } from "@/lib/abonnements/quotas";
import { ligneAbonnementDuCompte, verifierSaisie } from "@/lib/abonnements/saisie";
import { envoiEnService, motifErreur, publicAppUrl, sendMail } from "@/lib/email";
import { CONTACT } from "@/lib/contact/message";
import { LIMITES, cleLimite, consommer, messageTropDeTentatives } from "@/lib/securite/limite-debit";
import { texteSaisi } from "@/lib/validation/texte";
import { courrielEquipeRendezVous, courrielPersonneRendezVous, type RendezVousPourCourriel } from "./courriel-rendez-vous";
import { creneauEstPris, prendreLeCreneau, rendreLeCreneau } from "./creneaux";
import { cheminAssistance } from "./libelles";
import { anneeDuRendezVous } from "./rendez-vous";
import {
  MESSAGE_ANNEE_PRISE,
  MESSAGE_CRENEAU_HORS_FENETRE,
  MESSAGE_CRENEAU_PRIS,
  MESSAGE_DEJA_A_VENIR,
  MESSAGE_ECHEC,
  MESSAGE_MOINS_DE_24H,
  MESSAGE_RENDEZ_VOUS_INTROUVABLE,
  MESSAGE_RENDEZ_VOUS_PRO,
  MODES_RENDEZ_VOUS,
  SUJET_RENDEZ_VOUS_MAX,
  TELEPHONE_MAX,
  aPlusDe24h,
  fenetreDesCreneaux,
} from "./rendez-vous-libelles";
import { calendrierDuRendezVous } from "./agenda";

export type RendezVousState =
  | { status: "idle" }
  | {
      status: "success";
      /** `inchange` : « Préparer » sans rien de nouveau — rien n'est transmis. */
      evenement: "reserve" | "deplace" | "complete" | "inchange" | "annule";
      email: string;
      /** La confirmation est bien partie à la personne (l'écran ne l'annonce que si oui). */
      confirmation: boolean;
    }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
      /** `creneau` : le créneau n'est plus prenable — l'écran revient au choix du créneau. */
      code?: "creneau";
    };

/** Un refus dit à la personne : il défait la transaction, et son message s'affiche. */
class Refus extends Error {
  constructor(
    message: string,
    readonly code?: "creneau",
  ) {
    super(message);
  }
}

/** Le refus rendu à l'écran, qui se relit : ce qu'il affichait est peut-être périmé. */
function refus(e: Refus): RendezVousState {
  revalidatePath("/etablissements/[id]/assistance", "page");
  return { status: "error", message: e.message, ...(e.code ? { code: e.code } : {}) };
}

/**
 * Chaque geste écrit à l'équipe : dix par jour et par compte au plus
 * (`LIMITES.rendezVousCompte`, relecture de sécurité du 2026-11-24).
 * L'annulation a son propre compteur : des réservations refusées en rafale
 * ne privent pas le compte d'annuler (relecture du 2026-11-25).
 */
async function refusDuDebit(compteId: string, geste: "gestes" | "annulation" = "gestes"): Promise<RendezVousState | null> {
  const action = geste === "annulation" ? "rendez-vous-annulation" : "rendez-vous";
  const verdict = await consommer([{ cle: cleLimite(action, "compte", compteId), limite: LIMITES.rendezVousCompte }]);
  return verdict.ok ? null : { status: "error", message: messageTropDeTentatives(verdict.reessayerDansSecondes) };
}

/**
 * L'e-mail à l'équipe part DANS la transaction : un rendez-vous n'existe, ne
 * bouge ni ne s'annule sans qu'elle le sache. La transaction doit donc durer
 * plus que le pire des cas : l'attente du verrou du compte, tenu par un autre
 * geste du même compte pendant son propre envoi, puis cet envoi — Mailpace
 * essaie deux fois 8 s, avec 1 s entre les deux (≈ 17 s chacun). 60 s couvre
 * les deux sans qu'un envoi réussi précède une transaction défaite (relecture
 * du 2026-11-24). Le prix, assumé : les créations plafonnées du même compte
 * attendent la fin d'un envoi lent.
 */
const DUREE_TRANSACTION_MS = 60_000;

const TELEPHONE = /^\+?[0-9][0-9 .()-]{5,}$/;

/** Un texte facultatif : vide, il n'existe pas. */
const facultatif = <T extends z.ZodTypeAny>(s: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : undefined), s.optional());

const sujet = facultatif(
  texteSaisi(SUJET_RENDEZ_VOUS_MAX, `Ce que vous voulez aborder tient en ${SUJET_RENDEZ_VOUS_MAX} caractères au plus.`),
);

const schema = z
  .object({
    creneauId: z.string().uuid("Choisissez un créneau"),
    mode: z.enum(MODES_RENDEZ_VOUS, { message: "Choisissez la visio ou le téléphone" }),
    // Au téléphone, le numéro où appeler ; en visio, un numéro de secours, facultatif.
    telephone: facultatif(
      z.string().max(TELEPHONE_MAX, "Ce numéro est trop long").regex(TELEPHONE, "Ce numéro ne se lit pas"),
    ),
    sujet,
    /** Le rendez-vous à venir qu'un déplacement remplace. */
    remplace: z.preprocess((v) => (typeof v === "string" && v ? v : undefined), z.string().max(64).optional()),
    etablissementId: z.string().min(1).max(64),
  })
  .refine((d) => d.mode !== "telephone" || d.telephone !== undefined, {
    path: ["telephone"],
    message: "Le numéro où vous appeler",
  });

/** L'onglet du rendez-vous, dans l'e-mail de la personne. */
function lienDuRendezVous(etablissementId: string): string {
  return `${publicAppUrl()}${cheminAssistance(etablissementId)}?onglet=rendez-vous`;
}

/**
 * La confirmation à la personne, après coup — un envoi raté ne défait rien —,
 * avec l'invitation pour son agenda tant que le rendez-vous tient. Rend si
 * elle est partie : l'écran ne l'annonce pas sinon.
 */
async function confirmer(
  email: string,
  r: RendezVousPourCourriel & { id: string },
  etablissementId: string,
  maintenant: Date,
): Promise<boolean> {
  // L'invitation, ou son annulation, qui retire l'événement de l'agenda
  // (relecture du 2026-11-24).
  const annule = r.evenement === "annule";
  const invitation = {
    name: "rendez-vous-rojer.ics",
    content: Buffer.from(calendrierDuRendezVous(r, maintenant, { annule }), "utf8").toString("base64"),
    contentType: `text/calendar; charset=utf-8; method=${annule ? "CANCEL" : "PUBLISH"}`,
  };
  try {
    await sendMail({
      to: email,
      ...courrielPersonneRendezVous(r, lienDuRendezVous(etablissementId)),
      attachments: [invitation],
    });
    return true;
  } catch (e) {
    console.error(`[rendez-vous] confirmation non envoyée : ${motifErreur(e)}`);
    return false;
  }
}

/**
 * Réserve le rendez-vous annuel, ou déplace celui à venir (`remplace`),
 * ADR-063 § 3 et § 4. Sous le verrou du compte : un seul rendez-vous non
 * annulé par année d'abonnement, pour tout le compte ; le créneau se prend
 * par une écriture conditionnelle. L'e-mail à l'équipe part dans la
 * transaction : s'il échoue, rien n'est réservé.
 */
export async function reserverRendezVous(_prev: RendezVousState, formData: FormData): Promise<RendezVousState> {
  await verifierSaisie(); // ni lecture seule, ni saisie fermée (ADR-063 § 3)
  const { user, compte, db } = await requireCompte();
  const parsed = schema.safeParse({
    creneauId: formData.get("creneauId"),
    mode: formData.get("mode"),
    telephone: formData.get("telephone"),
    sujet: formData.get("sujet"),
    remplace: formData.get("remplace"),
    etablissementId: formData.get("etablissementId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Formulaire invalide", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  // 404 pour l'établissement d'un autre compte ; il ne sert qu'au lien de l'e-mail.
  const [ligne] = await Promise.all([ligneAbonnementDuCompte(db, compte.compteId), requireEtablissement(d.etablissementId)]);
  if (!assistanceProOuverte(ligne)) return { status: "error", message: MESSAGE_RENDEZ_VOUS_PRO };
  if (!user.email || !envoiEnService()) return { status: "error", message: MESSAGE_ECHEC.reserver };
  const debit = await refusDuDebit(compte.compteId);
  if (debit) return debit;
  const email = user.email;

  const maintenant = new Date();
  let courriel: RendezVousPourCourriel & { id: string };
  try {
    courriel = await db.$transaction(
      async (tx) => {
        await verrouillerLeCompte(tx, compte.compteId);
        const ancien = d.remplace
          ? await tx.rendezVousAssistance.findFirst({ where: { id: d.remplace, annuleLe: null } })
          : null;
        if (d.remplace && !ancien) throw new Refus(MESSAGE_RENDEZ_VOUS_INTROUVABLE);
        if (ancien && !aPlusDe24h(ancien.debut, maintenant)) throw new Refus(MESSAGE_MOINS_DE_24H);
        // Un seul rendez-vous à venir pour le compte : un second, même sur
        // l'année suivante, n'aurait ni carte ni geste (relecture du 2026-11-25).
        if (!ancien) {
          const aVenir = await tx.rendezVousAssistance.findFirst({
            where: { annuleLe: null, fin: { gt: maintenant } },
            select: { id: true },
          });
          if (aVenir) throw new Refus(MESSAGE_DEJA_A_VENIR);
        }

        const creneau = await prendreLeCreneau(tx, d.creneauId, fenetreDesCreneaux(maintenant));
        // Pris par un autre compte, ou sorti de la fenêtre depuis l'affichage :
        // deux refus distincts (relecture du 2026-11-24).
        if (!creneau) {
          throw new Refus(
            (await creneauEstPris(tx, d.creneauId)) === false ? MESSAGE_CRENEAU_HORS_FENETRE : MESSAGE_CRENEAU_PRIS,
            "creneau",
          );
        }
        // L'année où tombe le créneau : un rendez-vous compte pour l'année où il tombe.
        const annee = anneeDuRendezVous(ligne?.debutPayantLe, creneau.debut);
        const autre = await tx.rendezVousAssistance.findFirst({
          where: {
            annuleLe: null,
            debut: { gte: annee.debut, lt: annee.fin },
            ...(ancien ? { NOT: { id: ancien.id } } : {}),
          },
          select: { id: true },
        });
        if (autre) throw new Refus(MESSAGE_ANNEE_PRISE);

        const donnees = {
          creneauId: creneau.id,
          debut: creneau.debut,
          fin: creneau.fin,
          mode: d.mode,
          telephone: d.telephone ?? null,
          sujet: d.sujet ?? null,
        };
        let id: string;
        if (ancien) {
          await tx.rendezVousAssistance.update({ where: { id: ancien.id }, data: donnees });
          await rendreLeCreneau(tx, ancien.creneauId);
          id = ancien.id;
        } else {
          ({ id } = await tx.rendezVousAssistance.create({
            data: { compteId: compte.compteId, userId: user.id, ...donnees },
            select: { id: true },
          }));
        }
        const r = {
          id,
          evenement: ancien ? ("deplace" as const) : ("reserve" as const),
          ...donnees,
          avant: ancien ? { debut: ancien.debut, fin: ancien.fin } : undefined,
          personne: { nom: user.name ?? null, email },
          compteId: compte.compteId,
        };
        await sendMail({ to: CONTACT, replyTo: email, ...courrielEquipeRendezVous(r) });
        return r;
      },
      { timeout: DUREE_TRANSACTION_MS },
    );
  } catch (e) {
    if (e instanceof Refus) return refus(e);
    console.error(`[rendez-vous] non réservé : ${motifErreur(e)}`);
    return { status: "error", message: MESSAGE_ECHEC.reserver };
  }

  const confirmation = await confirmer(email, courriel, d.etablissementId, maintenant);
  revalidatePath("/etablissements/[id]/assistance", "page");
  return {
    status: "success",
    evenement: courriel.evenement === "deplace" ? "deplace" : "reserve",
    email,
    confirmation,
  };
}

const schemaRendezVous = z.object({
  rendezVousId: z.string().min(1).max(64),
  etablissementId: z.string().min(1).max(64),
});

/**
 * Complète ce qui est à aborder (« Préparer le rendez-vous »), jusqu'à 24 h
 * avant : transmis à l'équipe pour préparer le rendez-vous.
 */
export async function completerRendezVous(_prev: RendezVousState, formData: FormData): Promise<RendezVousState> {
  await verifierSaisie();
  const { user, compte, db } = await requireCompte();
  const parsed = schemaRendezVous
    .extend({ sujet })
    .safeParse({
      rendezVousId: formData.get("rendezVousId"),
      etablissementId: formData.get("etablissementId"),
      sujet: formData.get("sujet"),
    });
  if (!parsed.success) {
    return { status: "error", message: "Formulaire invalide", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const [ligne] = await Promise.all([
    ligneAbonnementDuCompte(db, compte.compteId),
    requireEtablissement(parsed.data.etablissementId),
  ]);
  // Préparer le rendez-vous reste un geste de la formule Pro (relecture de sécurité du 2026-11-24).
  if (!assistanceProOuverte(ligne)) return { status: "error", message: MESSAGE_RENDEZ_VOUS_PRO };
  if (!user.email || !envoiEnService()) return { status: "error", message: MESSAGE_ECHEC.completer };
  const debit = await refusDuDebit(compte.compteId);
  if (debit) return debit;
  const email = user.email;

  const maintenant = new Date();
  let transmis = false;
  try {
    transmis = await db.$transaction(
      async (tx) => {
        // Sous le verrou du compte, comme les autres gestes : un déplacement ou
        // une annulation concurrents ne laissent pas partir une date périmée
        // (relecture du 2026-11-25).
        await verrouillerLeCompte(tx, compte.compteId);
        const r = await tx.rendezVousAssistance.findFirst({ where: { id: parsed.data.rendezVousId, annuleLe: null } });
        if (!r) throw new Refus(MESSAGE_RENDEZ_VOUS_INTROUVABLE);
        if (!aPlusDe24h(r.debut, maintenant)) throw new Refus(MESSAGE_MOINS_DE_24H);
        const nouveau = parsed.data.sujet ?? null;
        // Rien de changé : rien à transmettre.
        if (nouveau === r.sujet) return false;
        await tx.rendezVousAssistance.update({ where: { id: r.id }, data: { sujet: nouveau } });
        await sendMail({
          to: CONTACT,
          replyTo: email,
          ...courrielEquipeRendezVous({
            evenement: "complete",
            debut: r.debut,
            fin: r.fin,
            mode: r.mode,
            telephone: r.telephone,
            sujet: nouveau,
            personne: { nom: user.name ?? null, email },
            compteId: compte.compteId,
          }),
        });
        return true;
      },
      { timeout: DUREE_TRANSACTION_MS },
    );
  } catch (e) {
    if (e instanceof Refus) return refus(e);
    console.error(`[rendez-vous] non complété : ${motifErreur(e)}`);
    return { status: "error", message: MESSAGE_ECHEC.completer };
  }
  revalidatePath("/etablissements/[id]/assistance", "page");
  return { status: "success", evenement: transmis ? "complete" : "inchange", email, confirmation: false };
}

/**
 * Annule le rendez-vous à venir, jusqu'à 24 h avant (ADR-063 § 4) : le
 * créneau est rendu, et l'année retrouve son rendez-vous. Ouvert sans la
 * formule Pro : un compte qui n'est plus en Pro rend encore son créneau.
 */
export async function annulerRendezVous(_prev: RendezVousState, formData: FormData): Promise<RendezVousState> {
  await verifierSaisie();
  const { user, compte, db } = await requireCompte();
  const parsed = schemaRendezVous.safeParse({
    rendezVousId: formData.get("rendezVousId"),
    etablissementId: formData.get("etablissementId"),
  });
  if (!parsed.success) return { status: "error", message: MESSAGE_RENDEZ_VOUS_INTROUVABLE };
  await requireEtablissement(parsed.data.etablissementId);
  if (!user.email || !envoiEnService()) return { status: "error", message: MESSAGE_ECHEC.annuler };
  const debit = await refusDuDebit(compte.compteId, "annulation");
  if (debit) return debit;
  const email = user.email;

  const maintenant = new Date();
  let courriel: RendezVousPourCourriel & { id: string };
  try {
    courriel = await db.$transaction(
      async (tx) => {
        await verrouillerLeCompte(tx, compte.compteId);
        const r = await tx.rendezVousAssistance.findFirst({ where: { id: parsed.data.rendezVousId, annuleLe: null } });
        if (!r) throw new Refus(MESSAGE_RENDEZ_VOUS_INTROUVABLE);
        if (!aPlusDe24h(r.debut, maintenant)) throw new Refus(MESSAGE_MOINS_DE_24H);
        await tx.rendezVousAssistance.update({ where: { id: r.id }, data: { annuleLe: maintenant } });
        await rendreLeCreneau(tx, r.creneauId);
        const c = {
          id: r.id,
          evenement: "annule" as const,
          debut: r.debut,
          fin: r.fin,
          mode: r.mode,
          telephone: r.telephone,
          sujet: r.sujet,
          personne: { nom: user.name ?? null, email },
          compteId: compte.compteId,
        };
        await sendMail({ to: CONTACT, replyTo: email, ...courrielEquipeRendezVous(c) });
        return c;
      },
      { timeout: DUREE_TRANSACTION_MS },
    );
  } catch (e) {
    if (e instanceof Refus) return refus(e);
    console.error(`[rendez-vous] non annulé : ${motifErreur(e)}`);
    return { status: "error", message: MESSAGE_ECHEC.annuler };
  }

  const confirmation = await confirmer(email, courriel, parsed.data.etablissementId, maintenant);
  revalidatePath("/etablissements/[id]/assistance", "page");
  return { status: "success", evenement: "annule", email, confirmation };
}
