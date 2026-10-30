import Link from "next/link";
import { cheminDeRetour } from "@/lib/auth/chemin-de-retour";
import { LoginForm } from "./LoginForm";

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
          <p className="m-0 mt-6 rounded-[18px] bg-[color:var(--board-blue-pale)] px-4 py-3 text-[13px] leading-[1.5] text-[color:var(--board-blue-ink)]">
            E-mail confirmé. Vous pouvez vous connecter.
          </p>
        ) : null}

        {reinitialise === "1" ? (
          <p className="m-0 mt-6 rounded-[18px] bg-[color:var(--board-blue-pale)] px-4 py-3 text-[13px] leading-[1.5] text-[color:var(--board-blue-ink)]">
            Mot de passe changé. Vos autres sessions ont été fermées : connectez-vous avec le nouveau.
          </p>
        ) : null}

        {confirmation === "invalide" ? (
          <p
            role="alert"
            className="m-0 mt-6 rounded-[18px] bg-[color:var(--board-signal-wash)] px-4 py-3 text-[13px] leading-[1.5] text-[color:var(--board-signal-ink)]"
          >
            Ce lien de confirmation est invalide ou a expiré. Connectez-vous : un nouveau lien vous sera envoyé.
          </p>
        ) : null}

        <div className="carte-board mt-7 px-7 py-6 sm:px-8">
          <LoginForm next={cheminDeRetour(next)} />
        </div>

        <p className="m-0 mt-6 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Pas de compte ?{" "}
          <Link
            href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-[color:var(--board-blue-ink)] underline decoration-[color:var(--board-blue-soft)] underline-offset-4 transition-colors hover:decoration-[color:var(--board-blue-ink)]"
          >
            Créer un compte →
          </Link>
        </p>
      </div>
    </main>
  );
}
