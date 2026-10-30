import "server-only";
// L'utilisateur connecté et le client Prisma borné à son compte (ADR-051).
//
// C'est la « Data Access Layer » de la doc Next.js : la session est vérifiée,
// puis chaque lecture et écriture passe par `db`, qui porte la borne au compte
// même si l'appelant l'oublie. À la différence des gardes de `scope.ts`, rien
// ne se résout ici à partir d'un identifiant reçu : le 404 d'un identifiant
// étranger vient de ce que `db` ne le trouve pas.

import { requireUser } from "./require-user";
import { clientBorne } from "./portee/client";

export async function requireCompte() {
  const user = await requireUser();
  return { user, db: clientBorne({ type: "compte", userId: user.id }) };
}

export type Compte = Awaited<ReturnType<typeof requireCompte>>;
