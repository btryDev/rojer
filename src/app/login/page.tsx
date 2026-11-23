import Link from "next/link";
import { cheminDeRetour } from "@/lib/auth/chemin-de-retour";
import { LoginForm } from "./LoginForm";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { getOptionalUser } from "@/lib/auth/require-user";
import { signOutAction } from "@/lib/auth/actions";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";
import { lienInscription } from "@/lib/ouverture";

export const metadata = {
  title: "Connexion — Rojer",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    confirmed?: string;
    confirmation?: string;
    reinitialise?: string;
  }>;
}) {
  const { next: nextBrut, confirmed, confirmation, reinitialise } = await searchParams;
  // Filtré dès la page : le lien vers /signup le recopie, et l'action le
  // refiltre de toute façon (le champ caché se modifie à la main).
  const next = nextBrut === undefined ? undefined : cheminDeRetour(nextBrut);
  // Déjà connecté·e : on le dit, avec la sortie, plutôt que de montrer le
  // formulaire comme si personne ne l'était (retours de test du 2026-11-16).
  const ouverte = await getOptionalUser();
  const etab = ouverte ? await getOptionalUserEtablissement() : null;
  const dossier = etab ? `/etablissements/${etab.id}` : "/onboarding";

  return (
    // Colonne étroite centrée : c'est le seul cas où `mx-auto max-w-*` tient
    // face à `--board-gutter`. La gouttière règle la largeur utile d'un écran
    // plein ; un formulaire de connexion n'a rien à étaler, et une carte de
    // 460 px posée au centre du canvas se lit comme la première fiche de
    // l'application plutôt que comme une page vide.
    <main className="flex min-h-[calc(100vh-56px)] flex-col justify-center bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[460px]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Connexion
        </p>
        <h1 className="board-titre m-0 mt-3 text-[clamp(29px,3vw,39px)]">
          Reprenez votre dossier.
        </h1>

        {confirmed === "1" ? (
          // Bleu et non vert : le vert du board dit « fait » au sens d'un
          // geste de conformité accompli. Ici on accuse réception d'une
          // confirmation d'adresse — le registre calme du glacier suffit.
          <MessageFormulaire ton="info" className="mt-6">
            Compte activé. Connectez-vous avec le mot de passe que vous venez de choisir.
          </MessageFormulaire>
        ) : null}

        {confirmation === "deja" ? (
          <MessageFormulaire ton="info" className="mt-6">
            Cette adresse était déjà confirmée : votre mot de passe n’a pas changé. Mot de passe oublié ?{" "}
            <Link href="/login/mot-de-passe-oublie" className="font-semibold underline underline-offset-4">
              Demandez-en un nouveau
            </Link>
            .
          </MessageFormulaire>
        ) : null}

        {reinitialise === "1" ? (
          <MessageFormulaire ton="info" className="mt-6">
            Mot de passe changé. Vos autres sessions ont été fermées : connectez-vous avec le nouveau.
          </MessageFormulaire>
        ) : null}

        {/* ~~L'en-tête porte déjà l'adresse, la sortie et le lien vers le
            dossier.~~ [2026-11-21 : l'en-tête n'a plus que la marque ; le
            dossier et la sortie sont ici, hors du message — un formulaire ne
            se pose pas dans un paragraphe.] */}
        {ouverte?.email ? (
          <>
            <MessageFormulaire ton="info" className="mt-6">
              Ce navigateur est déjà connecté avec {ouverte.email}. Pour utiliser une autre adresse, déconnectez-vous
              d&apos;abord.
            </MessageFormulaire>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[13.5px]">
              {/* Un retour demandé prime sur le dossier (relecture du
                  2026-11-23) : la connexion d'un assistant revient par
                  `/oauth/reprendre`. `<a>` et non `<Link>` : `next` peut viser
                  une route, pas seulement une page. Déjà filtré par
                  `cheminDeRetour`. */}
              {next ? (
                <a href={next} className="font-semibold text-[color:var(--board-blue-ink)] underline underline-offset-4">
                  Continuer
                </a>
              ) : (
                <Link href={dossier} className="font-semibold text-[color:var(--board-blue-ink)] underline underline-offset-4">
                  Reprendre mon dossier
                </Link>
              )}
              <form action={signOutAction}>
                <button type="submit" className="text-[color:var(--board-slate-ink)] underline underline-offset-4">
                  Se déconnecter
                </button>
              </form>
            </div>
          </>
        ) : null}

        {/* Déjà connecté·e : pas de formulaire (2026-11-23, contrôle en
            préprod) — il se remplissait seul et laissait croire qu'il fallait
            se reconnecter. Le message et ses deux sorties suffisent. */}
        {ouverte?.email ? null : (
          <div className="carte-board mt-7 px-7 py-6 sm:px-8">
            <LoginForm next={cheminDeRetour(next)} />
          </div>
        )}

        {/* Sans session seulement : connecté·e, la page ne propose ni de se
            connecter ni de créer un compte (relecture du 2026-11-23). */}
        {ouverte?.email ? null : (
        <p className="m-0 mt-6 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Pas de compte ?{" "}
          {/* Inscriptions fermées (`lib/ouverture.ts`) : /bientot, sauf
              pour revenir à une invitation (ADR-054 § 5). */}
          <Link
            href={lienInscription(`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`, { next })}
            className="font-semibold text-[color:var(--board-blue-ink)] underline decoration-[color:var(--board-blue-soft)] underline-offset-4 transition-colors hover:decoration-[color:var(--board-blue-ink)]"
          >
            Créer un compte →
          </Link>
        </p>
        )}
      </div>
    </main>
  );
}
