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
import { connecteurOuvertPour, outilsNonVerifiesOuverts } from "@/lib/connecteur/assistants";
import { issueDuConsentement, niveauDeLaDemande } from "@/lib/mcp/oauth";
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
  // ADR-062 § 12 : le niveau se lit sur l'adresse où repart le code, jamais sur le nom.
  const adresseRetour = requete.get("redirect_uri");
  const niveau = niveauDeLaDemande(adresseRetour);
  const [client, ouvert, nonVerifiesOuverts] = await Promise.all([
    auth.api
      .getOAuthClientPublic({ headers: await entetesDeSession(), query: { client_id: requete.get("client_id") ?? "" } })
      .catch(() => null),
    connecteurOuvertPour(compteId),
    // Le réglage ne compte que pour un outil non vérifié.
    niveau === "non_verifie" ? outilsNonVerifiesOuverts(compteId) : false,
  ]);
  const issue = issueDuConsentement(niveau, nonVerifiesOuverts);
  const peutAutoriser = ouvert && issue !== "ferme";
  // Le nom déclaré n'est montré que pour un assistant vérifié ou local : celui
  // d'un outil non vérifié peut imiter un autre (homoglyphes, « Cl4ude »), et
  // seul le domaine compte.
  const nomClient =
    niveau === "non_verifie"
      ? "Un outil non vérifié"
      : (client as { client_name?: string } | null)?.client_name?.trim() || "Un assistant";
  const nomCompte = comptes.find((c) => c.compteId === compteId)?.nom ?? "votre compte";
  const hote = hoteDeRetour(requete);

  return (
    <CadreOAuth sourcil="Connexion d'un assistant" titre={`Autoriser « ${nomClient} » à lire votre dossier ?`}>
      {issue === "ferme" && ouvert ? (
        <MessageFormulaire ton="alerte" className="mb-5">
          {`Cet outil n'est pas vérifié par Rojer, et le compte « ${nomCompte} » n'accepte que les assistants vérifiés (Claude, ChatGPT). Le propriétaire du compte peut ouvrir les outils non vérifiés depuis « Connecter un assistant ».`}
        </MessageFormulaire>
      ) : null}
      {peutAutoriser && issue === "confirmer" ? (
        <div className="mb-5 rounded-[18px] border-2 border-[color:var(--board-signal-ink)] bg-[color:var(--board-signal-wash)] px-5 py-4">
          <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.12em] text-[color:var(--board-signal-ink)]">
            Outil non vérifié par Rojer
          </p>
          <p className="m-0 mt-2 text-[13.5px] leading-[1.55] text-[color:var(--board-ink)]">
            L&apos;accès à votre dossier partira vers :
          </p>
          <p className="m-0 mt-1 break-all text-[20px] font-semibold text-[color:var(--board-ink)]">{hote ?? "une adresse inconnue"}</p>
          <p className="m-0 mt-2 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Rojer ne connaît pas cet outil. N&apos;autorisez que si vous l&apos;avez branché vous-même, à l&apos;instant,
            et que vous reconnaissez cette adresse. Si vous êtes arrivé ici par un lien venu d&apos;un e-mail ou d&apos;un
            message, c&apos;est un signal d&apos;hameçonnage : refusez.
          </p>
        </div>
      ) : null}
      {niveau === "local" ? (
        <p className="m-0 mb-4 text-[13px] leading-[1.55] text-[color:var(--board-ink)]">
          L&apos;accès partira vers un programme de cet ordinateur. N&apos;autorisez que si vous venez de le lancer.
        </p>
      ) : null}
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

      <form action={repondreConsentement} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="oauth_query" value={requete.toString()} />
        <ChampCompteAttendu compteId={compteId} />
        {peutAutoriser && issue === "confirmer" ? (
          <label className="flex items-start gap-2.5 text-[13.5px] leading-[1.5] text-[color:var(--board-ink)]">
            <input type="checkbox" name="confirme" value="oui" required className="mt-1" />
            <span>
              Je reconnais <strong>{hote ?? "cette adresse"}</strong> : c&apos;est l&apos;outil que je viens de brancher.
            </span>
          </label>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {peutAutoriser ? (
            <Button type="submit" name="reponse" value="accepter" variant="board" size="board">
              Autoriser
            </Button>
          ) : null}
          <Button type="submit" name="reponse" value="refuser" variant="boardClair" size="board" formNoValidate>
            {peutAutoriser ? "Refuser" : "Revenir à l'assistant"}
          </Button>
        </div>
      </form>
    </CadreOAuth>
  );
}
