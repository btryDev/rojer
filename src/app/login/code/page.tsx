import Link from "next/link";
import { redirect } from "next/navigation";
import { cheminDeRetour } from "@/lib/auth/chemin-de-retour";
import { getOptionalUser } from "@/lib/auth/require-user";
import { CodeForm } from "./CodeForm";

export const metadata = {
  title: "Code de connexion — Rojer",
  robots: { index: false },
};

/**
 * Seconde étape de la connexion d'un compte à double authentification
 * (ADR-052 § 7) : `signInAction` y envoie après le mot de passe, quand Better
 * Auth a remplacé la session par un défi de dix minutes. Ouverte sans défi, la
 * page ne sert à rien de mal : l'action répond « reconnectez-vous ».
 */
export default async function CodeConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextBrut } = await searchParams;
  const next = cheminDeRetour(nextBrut);
  if (await getOptionalUser()) redirect(next);

  return (
    // Même colonne que `/login`, dont elle est la suite.
    <main className="flex min-h-[calc(100vh-56px)] flex-col justify-center bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[460px]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Connexion
        </p>
        <h1 className="board-titre m-0 mt-3 text-[clamp(29px,3vw,39px)]">Votre code, pour finir.</h1>
        <p className="m-0 mt-3 text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Ouvrez l&apos;application d&apos;authentification liée à Rojer et saisissez le code
          affiché. Sans votre téléphone, un code de secours fait l&apos;affaire.
        </p>

        <div className="carte-board mt-7 px-7 py-6 sm:px-8">
          <CodeForm next={next} />
        </div>

        <p className="m-0 mt-6 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="font-semibold text-[color:var(--board-blue-ink)] underline decoration-[color:var(--board-blue-soft)] underline-offset-4 transition-colors hover:decoration-[color:var(--board-blue-ink)]"
          >
            ← Revenir à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
