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
import { clientBorne } from "./portee/client";
import { appartenanceDeLaSession, creerCompte, type Appartenance } from "./membres";

/**
 * L'appartenance de la personne connectée. Mémoïsée pour un rendu (`cache()`
 * de React) ; dans une action ou une route, relue à chaque appel — ce qui est
 * la condition du retrait immédiat d'un membre (ADR-054 § 6).
 */
const lireAppartenance = cache((userId: string): Promise<Appartenance | null> => appartenanceDeLaSession(userId));

function portee(userId: string, a: Appartenance) {
  return clientBorne({ type: "compte", compteId: a.compteId, userId });
}

/**
 * Sans compte (personne inscrite sans établissement, membre retiré), renvoie
 * au parcours d'onboarding, qui en crée un : aucune donnée n'est servie.
 */
export async function requireCompte() {
  const user = await requireUser();
  const compte = await lireAppartenance(user.id);
  if (!compte) redirect("/onboarding");
  return { user, compte, db: portee(user.id, compte) };
}

/** Variante sans redirection : `null` sans personne connectée ou sans compte. */
export async function getOptionalCompte() {
  const user = await getOptionalUser();
  if (!user) return null;
  const compte = await lireAppartenance(user.id);
  return compte ? { user, compte, db: portee(user.id, compte) } : null;
}

/**
 * Le compte où l'onboarding range un nouvel établissement : celui de la
 * personne, ou un compte neuf dont elle devient propriétaire si elle n'en a
 * aucun (ADR-054 § 5 : seul l'onboarding crée un compte).
 */
export async function requireCompteDOnboarding(nomSiNouveau: string) {
  const user = await requireUser();
  const compte = (await lireAppartenance(user.id)) ?? (await creerCompte(user.id, nomSiNouveau));
  return { user, compte, db: portee(user.id, compte) };
}

export type Compte = Awaited<ReturnType<typeof requireCompte>>;

/**
 * Le client borné, à passer en paramètre aux fonctions qui lisent pour un
 * appelant déjà authentifié — jamais fabriqué par elles.
 */
export type Db = Compte["db"];
