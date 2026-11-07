import "server-only";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";
import type { CompteLanding } from "./compte";

/**
 * Le compte connecté, s'il y en a un : où il reprend, et comment le bouton
 * le dit. Un compte peut porter plusieurs dossiers depuis l'ADR-028 : ce
 * n'est plus « son » établissement qu'on pointe, mais l'ACTIF — le dernier
 * commuté, à défaut le plus ancien. La page n'a pas à choisir :
 * `getOptionalUserEtablissement` porte le défaut, une fois pour tout le
 * produit. Sans aucun dossier, on aiguille vers /onboarding. Personne de
 * connecté : `undefined`, et les sections mènent à /signup (la création d'un
 * dossier nécessite un compte, ADR-005) et à /login.
 */
export async function compteDeLaSession(): Promise<CompteLanding | undefined> {
  const user = await getOptionalUser();
  if (!user) return undefined;
  const etab = await getOptionalUserEtablissement();
  return etab
    ? { href: `/etablissements/${etab.id}`, label: "Reprendre mon dossier" }
    : { href: "/onboarding", label: "Terminer la mise en place" };
}
