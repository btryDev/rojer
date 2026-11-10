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
import { revalidatePath } from "next/cache";
import { getOptionalUser, requireUser } from "./require-user";
import { clientBorne, type ClientBorne } from "./portee/client";
import { etatDeSaisieDuCompte } from "@/lib/abonnements/quotas";
import { memeCompteQueLaPage } from "./compte-attendu";
import { appartenanceDeLaSession, compteDOnboarding, invitationsPourAdresse, comptesDeLaPersonne, type Appartenance } from "./membres";

/**
 * L'appartenance de la personne connectée. Mémoïsée pour un rendu (`cache()`
 * de React) ; dans une action ou une route, relue à chaque appel — ce qui est
 * la condition du retrait immédiat d'un membre (ADR-054 § 6).
 */
const lireAppartenances = cache(appartenanceDeLaSession);
const lireAppartenance = async (userId: string): Promise<Appartenance | null> => (await lireAppartenances(userId)).retenue;

/**
 * Le client borné de la session, qui porte le gel du compte (ADR-053 § 14) et
 * sa saisie fermée (§ 3), d'une même lecture d'abonnement — inutiles en
 * lecture seule, où rien ne s'écrit.
 */
async function portee(userId: string, a: Appartenance): Promise<ClientBorne> {
  const p = { type: "compte" as const, compteId: a.compteId, userId, lectureSeule: a.role === "lecture" };
  const db = clientBorne(p);
  if (p.lectureSeule) return db;
  const { geles, saisieFermee } = await lireEtat(db, a.compteId);
  return geles || saisieFermee ? clientBorne({ ...p, geles, saisieFermee: saisieFermee ? true : undefined }) : db;
}
const lireEtat = cache(etatDeSaisieDuCompte);

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
export async function requireCompteDOnboarding(
  formData: FormData,
  { page, nomSiNouveau = "Mon compte" }: { page: string; nomSiNouveau?: string },
) {
  const user = await requireUser();
  const existant = await lireAppartenance(user.id);
  // `null` si la page montrait un autre compte, ou aucun quand il y en a un
  // désormais (une invitation acceptée dans un autre onglet) — vérifié AVANT de
  // créer un compte, pour n'en laisser aucun de vide. La page est alors rendue
  // de nouveau, comme quand le compte vient d'être créé : sans quoi, si le
  // geste échoue ensuite, elle posterait encore « aucun compte » et un nouvel
  // essai serait pris pour un changement d'onglet.
  const refus = !memeCompteQueLaPage(formData, existant?.compteId ?? null);
  if (refus || !existant) revalidatePath(page);
  if (refus) return null;
  const compte = existant ?? (await compteDOnboarding(user.id, nomSiNouveau));
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

/**
 * Les comptes de la personne connectée et celui où elle travaille, pour le
 * choix du compte dans la gélule (ADR-054 § 7). Mémoïsé sur le rendu, et sans
 * lecture de plus : les appartenances sont celles que `requireCompte` vient de
 * relire, et la liste nommée ne se lit qu'à partir de deux comptes — en
 * dessous, la gélule n'affiche pas de choix.
 */
export const comptesDeLaSession = cache(async () => {
  const { user, compte } = await requireCompte();
  const { toutes } = await lireAppartenances(user.id);
  if (toutes.length < 2) return { comptes: [], actif: compte.compteId };
  const comptes = await comptesDeLaPersonne(user.id);
  return { comptes: comptes.map((c) => ({ compteId: c.compteId, nom: c.nom })), actif: compte.compteId };
});

/**
 * Le compte que montre une page dont les gestes portent sur le compte entier
 * (`ChampCompteAttendu`) : son identifiant, `null` sans compte encore ; son
 * nom quand la personne en a plusieurs, `null` sinon, comme la gélule.
 */
export async function compteDeLaPage(): Promise<{ compteId: string | null; nomCompte: string | null }> {
  if (!(await getOptionalCompte())) return { compteId: null, nomCompte: null };
  const { comptes, actif } = await comptesDeLaSession();
  return { compteId: actif, nomCompte: comptes.find((c) => c.compteId === actif)?.nom ?? null };
}

export type Compte = Awaited<ReturnType<typeof requireCompte>>;

/**
 * Le client borné, à passer en paramètre aux fonctions qui lisent pour un
 * appelant déjà authentifié — jamais fabriqué par elles.
 */
export type Db = Compte["db"];

/**
 * Le compte vérifié et son client borné, reçus ENSEMBLE d'une garde
 * (`requireCompte`, `requireEtablissement`) : une lecture qui les prend ainsi
 * ne peut ni relire la session — un second contexte, qu'un changement de
 * compte dans un autre onglet ferait diverger —, ni recevoir un `user.id` à la
 * place du compte (report main → cc du 2026-11-06, ADR-054).
 */
export type AccesCompte = Pick<Compte, "compte" | "db">;
