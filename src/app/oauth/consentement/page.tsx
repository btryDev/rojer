// Consentement à un assistant (ADR-062 § 7). La page :
// - nomme le client tel qu'il se déclare, en le disant, et montre l'hôte où
//   la réponse repart (spécification MCP, docs des connecteurs Claude) ;
// - dit ce qui sera lu, et que ces données sortent de Rojer ;
// - hors formule Pro, n'offre que le refus (le geste revérifie).
// L'affichage en cadre est refusé par l'en-tête global
// (`frame-ancestors 'none'`, `securite/entetes.ts`).

import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import { auth } from "@/lib/auth/better-auth";
import { comptesDeLaPersonne } from "@/lib/auth/membres";
import { entetesDeSession, lireSessionCourante, requireUser } from "@/lib/auth/require-user";
import { MESSAGE_CONNECTEUR_PRO } from "@/lib/abonnements/connecteur";
import { compteRetenu } from "@/lib/mcp/compte-oauth";
import { connecteurOuvertPour } from "@/lib/connecteur/assistants";
import { hoteDeRetour, requeteSigneeDeLaPage, type ParametresDePage } from "@/lib/mcp/requete-oauth";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { Button } from "@/components/ui/button";
import { repondreConsentement } from "../actions";
import { CadreOAuth, DemandeExpiree } from "../cadre";

export const metadata = { title: "Autoriser un assistant — Rojer" };

export default async function ConsentementPage({ searchParams }: { searchParams: Promise<ParametresDePage> }) {
  const user = await requireUser();
  const requete = await requeteSigneeDeLaPage(await searchParams);
  if (!requete) return <DemandeExpiree />;

  const session = await lireSessionCourante();
  // Une lecture de `Membre` : la règle de `compteDuConsentement`, sur les comptes de la page.
  const comptes = await comptesDeLaPersonne(user.id);
  const compteId = compteRetenu(
    comptes.map((c) => c.compteId),
    session?.session.activeOrganizationId,
  );
  const [client, ouvert] = await Promise.all([
    auth.api
      .getOAuthClientPublic({ headers: await entetesDeSession(), query: { client_id: requete.get("client_id") ?? "" } })
      .catch(() => null),
    connecteurOuvertPour(compteId),
  ]);
  const nomClient = (client as { client_name?: string } | null)?.client_name?.trim() || "Un assistant";
  const nomCompte = comptes.find((c) => c.compteId === compteId)?.nom ?? "votre compte";
  const hote = hoteDeRetour(requete);

  return (
    <CadreOAuth sourcil="Connexion d'un assistant" titre={`Autoriser « ${nomClient} » à lire votre dossier ?`}>
      <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        Le nom ci-dessus est celui que l&apos;application déclare elle-même. Après votre réponse, vous serez renvoyé
        vers <strong className="text-[color:var(--board-ink)]">{hote ?? "une adresse inconnue"}</strong> : si ce
        n&apos;est pas l&apos;assistant que vous venez d&apos;utiliser, refusez.
      </p>

      <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0 text-[14.5px] leading-[1.5] text-[color:var(--board-ink)]">
        <li>
          • Il pourra lire <strong>tous les établissements du compte « {nomCompte} »</strong>{" "}: fiche, DUERP,
          plan d&apos;actions, équipements, calendrier des vérifications.
        </li>
        <li>• Il ne pourra rien modifier : le connecteur ne fait que lire.</li>
        <li>
          • Ce qu&apos;il lit sort de Rojer et suit les règles de l&apos;assistant, pas celles de Rojer.
        </li>
        <li>• Vous pourrez retirer cet accès à tout moment, depuis « Connecter un assistant ».</li>
      </ul>

      {ouvert ? null : (
        <MessageFormulaire ton="alerte" className="mt-5">
          {MESSAGE_CONNECTEUR_PRO}
        </MessageFormulaire>
      )}

      <form action={repondreConsentement} className="mt-6 flex flex-wrap gap-3">
        <input type="hidden" name="oauth_query" value={requete.toString()} />
        <ChampCompteAttendu compteId={compteId} />
        {ouvert ? (
          <Button type="submit" name="reponse" value="accepter" variant="board" size="board">
            Autoriser
          </Button>
        ) : null}
        <Button type="submit" name="reponse" value="refuser" variant="boardClair" size="board">
          {ouvert ? "Refuser" : "Revenir à l'assistant"}
        </Button>
      </form>
    </CadreOAuth>
  );
}
