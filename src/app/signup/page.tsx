import Link from "next/link";
import { cheminDeRetour } from "@/lib/auth/chemin-de-retour";
import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "Créer un compte — Rojer",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextBrut } = await searchParams;
  const next = nextBrut === undefined ? undefined : cheminDeRetour(nextBrut);

  return (
    // Même enveloppe que /login : colonne étroite centrée sur le canvas. Cf.
    // le commentaire de `login/page.tsx` sur `mx-auto max-w-*`.
    <main className="flex min-h-[calc(100vh-56px)] flex-col justify-center bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[460px]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Nouveau compte
        </p>
        <h1 className="board-titre m-0 mt-3 text-[clamp(29px,3vw,39px)]">
          Ouvrez votre dossier.
        </h1>

        <p className="m-0 mt-4 max-w-[38ch] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Vos données restent en Europe. Aucun paiement pendant la phase bêta.
        </p>

        <div className="carte-board mt-7 px-7 py-6 sm:px-8">
          <SignupForm next={cheminDeRetour(next)} />
        </div>

        <p className="m-0 mt-6 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Déjà un compte ?{" "}
          <Link
            href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-[color:var(--board-blue-ink)] underline decoration-[color:var(--board-blue-soft)] underline-offset-4 transition-colors hover:decoration-[color:var(--board-blue-ink)]"
          >
            Se connecter →
          </Link>
        </p>
      </div>
    </main>
  );
}
