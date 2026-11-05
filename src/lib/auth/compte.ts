import "server-only";
// La personne connectée, son compte et le client Prisma borné à ce compte
// (ADR-051, ADR-054).
//
// C'est la « Data Access Layer » de la doc Next.js : la session est vérifiée,
// l'appartenance au compte RELUE (`Membre`, à chaque appel), puis chaque
// lecture et écriture passe par `db`, qui porte la borne au compte même si
// l'appelant l'oublie. À la différence des gardes de `scope.ts`, rien ne se
// résout ici à partir d'un identifiant reçu : le 404 d'un identifiant
// étranger vient de ce que `db` ne le trouve pas.

import { cache } from "react";
import { redirect } from "next/navigation";
import { getOptionalUser, requireUser } from "./require-user";
import { clientBorne, type ClientBorne } from "./portee/client";
import { gelesDuCompte } from "@/lib/abonnements/quotas";
import { appartenanceDeLaSession, compteDOnboarding, invitationsPourAdresse, type Appartenance } from "./membres";

/**
 * L'appartenance de la personne connectée. Mémoïsée pour un rendu (`cache()`
 * de React) ; dans une action ou une route, relue à chaque appel — ce qui est
 * la condition du retrait immédiat d'un membre (ADR-054 § 6).
 */
const lireAppartenance = cache((userId: string): Promise<Appartenance | null> => appartenanceDeLaSession(userId));

/**
 * Le client borné de la session. Il porte le gel du compte (ADR-053 § 14) :
 * ce qui dépasse la formule d'un compte qui a payé ne se modifie plus. Lu une
 * fois par rendu ; inutile en lecture seule, où rien ne s'écrit.
 */
async function portee(userId: string, a: Appartenance): Promise<ClientBorne> {
  const p = { type: "compte" as const, compteId: a.compteId, userId, lectureSeule: a.role === "lecture" };
  const db = clientBorne(p);
  if (p.lectureSeule) return db;
  const geles = await lireGeles(db, a.compteId);
  return geles ? clientBorne({ ...p, geles }) : db;
}
const lireGeles = cache((db: ClientBorne, compteId: string) => gelesDuCompte(db, compteId));

/**
 * Sans compte (personne inscrite sans établissement, membre retiré), renvoie
 * au parcours d'onboarding, qui en crée un : aucune donnée n'est servie.
 */
export async function requireCompte() {
  const user = await requireUser();
  const compte = await lireAppartenance(user.id);
  if (!compte) redirect("/onboarding");
  return { user, compte, db: await portee(user.id, compte) };
}

/** Variante sans redirection : `null` sans personne connectée ou sans compte. */
export async function getOptionalCompte() {
  const user = await getOptionalUser();
  if (!user) return null;
  const compte = await lireAppartenance(user.id);
  return compte ? { user, compte, db: await portee(user.id, compte) } : null;
}

/**
 * Le compte de la personne, ou un compte neuf dont elle devient propriétaire
 * si elle n'en a aucun (ADR-054 § 5). L'onboarding l'appelle, et nomme le
 * compte d'après l'entreprise ; le début d'un essai (ADR-053, lot à venir de
 * la session « stripe ») l'appellera sans nom — le compte garde alors le nom
 * par défaut, que rien n'affiche aujourd'hui.
 */
export async function requireCompteDOnboarding(nomSiNouveau = "Mon compte") {
  const user = await requireUser();
  const compte = (await lireAppartenance(user.id)) ?? (await compteDOnboarding(user.id, nomSiNouveau));
  return { user, compte, db: await portee(user.id, compte) };
}

/**
 * L'AIGUILLAGE d'une personne connectée qui n'a encore aucun compte (ADR-054
 * § 5) : son invitation en attente, s'il y en a une — elle rejoint ce compte au
 * lieu d'en créer un. `null` si elle a déjà un compte, ou aucune invitation.
 * Seule règle, lue par toute porte qui suit la connexion : l'onboarding, et
 * l'écran d'essai (ADR-053) qui le précède.
 */
export async function aiguillageSansCompte(): Promise<string | null> {
  const user = await requireUser();
  if (!user.email || (await lireAppartenance(user.id))) return null;
  const [invitation] = await invitationsPourAdresse(user.email);
  return invitation ? `/invitation/${invitation.id}` : null;
}

export type Compte = Awaited<ReturnType<typeof requireCompte>>;

/**
 * Le client borné, à passer en paramètre aux fonctions qui lisent pour un
 * appelant déjà authentifié — jamais fabriqué par elles.
 */
export type Db = Compte["db"];
