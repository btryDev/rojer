import { Prisma } from "@prisma/client";
import type { ObjetSignable, PartieSignataire } from "@prisma/client";

/**
 * Qui doit signer un acte co-signé, et qui l'a fait — LA lecture des fiches,
 * du titre de section et du statut (audit du 2026-10-12, constats 5 et 7).
 *
 * Module pur, sans `"use server"` : un composant serveur et une action le lisent
 * de la même façon.
 *
 * ── Pourquoi la partie est enregistrée et non devinée ───────────────────
 *
 * Les deux fiches attribuaient une signature en comparant son adresse à celle
 * du chef de l'entreprise extérieure (plan) ou du prestataire (permis) :
 * « différente » valait donneur d'ordre. Deux signatures de la même personne,
 * ou un lien envoyé à une autre adresse que celle de la fiche, rendaient le
 * titre « Permis co-signé et valide » au-dessus d'un bloc donneur d'ordre
 * vide. La partie est désormais un fait en base (`Signature.partie`), choisi
 * par le demandeur au moment d'émettre le lien, jamais par le signataire.
 *
 * Une signature sans partie — toute signature d'avant le 2026-10-12 — n'est
 * attribuée à personne. Elle reste affichée (une signature donnée est un fait)
 * mais ne compte pour aucune des deux : la rattacher par l'adresse serait
 * refaire le défaut.
 */
export const PARTIES_ATTENDUES: Partial<
  Record<ObjetSignable, readonly PartieSignataire[]>
> = {
  plan_prevention: ["entreprise_utilisatrice", "entreprise_exterieure"],
  permis_feu: ["entreprise_utilisatrice", "entreprise_exterieure"],
};

export function partiesAttendues(
  objetType: ObjetSignable | string,
): readonly PartieSignataire[] {
  return PARTIES_ATTENDUES[objetType as ObjetSignable] ?? [];
}

export type RepartitionSignatures<S> = {
  /** La signature de chaque partie qui a signé. */
  parPartie: Partial<Record<PartieSignataire, S>>;
  /** Les signatures qu'aucune partie enregistrée ne porte. */
  sansPartie: S[];
  /** Les parties attendues qui n'ont pas signé, dans l'ordre attendu. */
  manquantes: PartieSignataire[];
};

export function repartirSignatures<S extends { partie: PartieSignataire | null }>(
  objetType: ObjetSignable | string,
  signatures: readonly S[],
): RepartitionSignatures<S> {
  const parPartie: Partial<Record<PartieSignataire, S>> = {};
  const sansPartie: S[] = [];
  for (const s of signatures) {
    if (s.partie && !parPartie[s.partie]) parPartie[s.partie] = s;
    else sansPartie.push(s);
  }
  return {
    parPartie,
    sansPartie,
    manquantes: partiesAttendues(objetType).filter((p) => !parPartie[p]),
  };
}

/**
 * La partie demandée est-elle recevable pour cet objet ? Un objet co-signé en
 * exige une parmi les siennes ; un objet qui n'en attend pas (rapport de
 * vérification) n'en reçoit pas.
 */
export function partieRecevable(
  objetType: ObjetSignable | string,
  partie: PartieSignataire | null | undefined,
): boolean {
  const attendues = partiesAttendues(objetType);
  if (attendues.length === 0) return partie == null;
  return partie != null && attendues.includes(partie);
}

/** La violation de l'unicité `(objetType, objetId, partie)` : la partie a déjà signé. */
export function estPartieDejaSignee(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

export const MESSAGE_PARTIE_DEJA_SIGNEE =
  "Cette partie a déjà signé ce document.";
